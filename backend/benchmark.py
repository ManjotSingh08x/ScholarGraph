import requests
import time
import csv
import os
import random

BASE = "http://127.0.0.1:5001"
LOG_DIR = "logs"
NUM_PAPERS = 20

os.makedirs(LOG_DIR, exist_ok=True)


def flush():
    requests.get(f"{BASE}/api/flush-cache")


def get_papers():
    papers = []
    page = 1

    while len(papers) < NUM_PAPERS:
        r = requests.get(f"{BASE}/api/search", params={"q": "ai", "page": page})
        data = r.json()["results"]

        for p in data:
            pid = p["id"].split("/")[-1]
            title = p["title"]
            papers.append((pid, title))

            if len(papers) >= NUM_PAPERS:
                break

        page += 1

    return papers


def time_req(url, params=None):
    s = time.time()
    r = requests.get(url, params=params)
    return time.time() - s, r


def p95(arr):
    arr = sorted(arr)
    return arr[int(0.95 * len(arr))]


# ---------------- COARSE ----------------
def benchmark_coarse():
    papers = get_papers()
    results = []
    for phase in ["cold", "warm"]:
        if phase == "cold":
            flush()
        counter = 0 

        for pid, title in papers:
            counter+=1
            print(f"[{counter}/{NUM_PAPERS}] Testing for PID: {pid}, Title: {title[:50]}...")
            t_search, _ = time_req(f"{BASE}/api/search", {"q": title[:50]})
            t_paper, _ = time_req(f"{BASE}/api/papers/{pid}")

            t_graph, r = time_req(
                f"{BASE}/api/debug/graph-stats/{pid}",
                {"xr": 5, "xc": 5, "yr": 2, "yc": 2, "x_lim": 5}
            )

            calls = r.json()["external_calls"]

            results.append({
                "phase": phase,
                "paper_id": pid,
                "search_time": t_search,
                "paper_time": t_paper,
                "graph_time": t_graph,
                "external_calls": calls
            })

    save(results, f"{LOG_DIR}/coarse.csv")
    summarize(results, ["search_time", "paper_time", "graph_time", "external_calls"])


# ---------------- FINE ----------------
def benchmark_fine():
    papers = get_papers()
    results = []

    for phase in ["cold", "warm"]:
        if phase == "cold":
            flush()
        counter += 1

        for pid, title in papers:
            counter+=1
            print(f"[{counter}/{NUM_PAPERS}] Testing for PID: {pid}, Title: {title[:50]}...")
            t_graph, r = time_req(
                f"{BASE}/api/debug/graph-stats/{pid}",
                {"xr": 5, "xc": 5, "yr": 2, "yc": 2, "x_lim": 5}
            )

            calls = r.json()["external_calls"]

            results.append({
                "phase": phase,
                "paper_id": pid,
                "graph_time": t_graph,
                "external_calls": calls
            })

    save(results, f"{LOG_DIR}/fine.csv")
    summarize(results, ["graph_time", "external_calls"])


# ---------------- CSV ----------------
def save(results, path):
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)


# ---------------- SUMMARY ----------------
def summarize(results, keys):
    print("\n--- SUMMARY ---")

    for key in keys:
        cold = [r[key] for r in results if r["phase"] == "cold"]
        warm = [r[key] for r in results if r["phase"] == "warm"]

        cold_avg = sum(cold) / len(cold)
        warm_avg = sum(warm) / len(warm)

        print(f"\n{key}")
        print(f"cold avg: {cold_avg:.4f}")
        print(f"warm avg: {warm_avg:.4f}")

        if key != "external_calls":
            print(f"speedup: {cold_avg / warm_avg:.2f}x")
        else:
            print(f"reduction: {cold_avg / warm_avg:.2f}x")


# ---------------- MAIN ----------------
if __name__ == "__main__":
    benchmark_coarse()
    benchmark_fine()