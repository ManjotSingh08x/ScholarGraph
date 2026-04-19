import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

LOG_DIR = "logs"
OUT_DIR = os.path.join(LOG_DIR, "plots")
os.makedirs(OUT_DIR, exist_ok=True)

COARSE_PATH = os.path.join(LOG_DIR, "coarse.csv")
FINE_PATH = os.path.join(LOG_DIR, "fine.csv")


def load_csv(path):
    df = pd.read_csv(path)
    for c in ["search_time", "paper_time", "graph_time", "external_calls"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def p95(x):
    return np.percentile(x.dropna(), 95)


# ---------------- LINE PLOTS ----------------
def line_plot(df, col, title, outpath):
    cold = df[df["phase"] == "cold"][col].reset_index(drop=True)
    warm = df[df["phase"] == "warm"][col].reset_index(drop=True)

    fig, ax = plt.subplots()
    ax.plot(cold, label="cold")
    ax.plot(warm, label="warm")

    ax.set_title(title)
    ax.set_xlabel("request index")
    ax.set_ylabel("seconds" if "time" in col else "count")
    ax.legend()

    fig.tight_layout()
    fig.savefig(outpath)
    plt.close(fig)


# ---------------- BAR CHARTS ----------------
def bar_compare(df, cols, title, outpath, use_p95=False):
    phases = ["cold", "warm"]

    def stat(series):
        return p95(series) if use_p95 else series.mean()

    values = {
        c: [stat(df[df["phase"] == p][c]) for p in phases]
        for c in cols
    }

    x = np.arange(len(cols))
    w = 0.35

    fig, ax = plt.subplots()
    ax.bar(x - w/2, [values[c][0] for c in cols], w, label="cold")
    ax.bar(x + w/2, [values[c][1] for c in cols], w, label="warm")

    ax.set_xticks(x)
    ax.set_xticklabels(cols)
    ax.set_title(title)
    ax.legend()

    fig.tight_layout()
    fig.savefig(outpath)
    plt.close(fig)


# ---------------- HISTOGRAM ----------------
def histogram(df, col, title, outpath):
    cold = df[df["phase"] == "cold"][col]
    warm = df[df["phase"] == "warm"][col]

    fig, ax = plt.subplots()
    ax.hist(cold, bins=30, alpha=0.5, label="cold")
    ax.hist(warm, bins=30, alpha=0.5, label="warm")

    ax.set_title(title)
    ax.set_xlabel("seconds" if "time" in col else "count")
    ax.set_ylabel("frequency")
    ax.legend()

    fig.tight_layout()
    fig.savefig(outpath)
    plt.close(fig)


# ---------------- MAIN ----------------
def main():
    coarse = load_csv(COARSE_PATH)
    fine = load_csv(FINE_PATH)

    # ---- COARSE ----
    for col in ["search_time", "paper_time", "graph_time"]:
        line_plot(
            coarse,
            col,
            f"Coarse {col} (Cold vs Warm)",
            os.path.join(OUT_DIR, f"coarse_line_{col}.png"),
        )

    line_plot(
        coarse,
        "external_calls",
        "Coarse External Calls",
        os.path.join(OUT_DIR, "coarse_line_calls.png"),
    )

    bar_compare(
        coarse,
        ["search_time", "paper_time", "graph_time"],
        "Coarse Mean Latency",
        os.path.join(OUT_DIR, "coarse_bar_mean.png"),
    )

    bar_compare(
        coarse,
        ["search_time", "paper_time", "graph_time"],
        "Coarse P95 Latency",
        os.path.join(OUT_DIR, "coarse_bar_p95.png"),
        use_p95=True,
    )

    histogram(
        coarse,
        "graph_time",
        "Coarse Graph Latency Distribution",
        os.path.join(OUT_DIR, "coarse_hist_graph.png"),
    )

    # ---- FINE ----
    line_plot(
        fine,
        "graph_time",
        "Fine Graph Time",
        os.path.join(OUT_DIR, "fine_line_graph.png"),
    )

    line_plot(
        fine,
        "external_calls",
        "Fine External Calls",
        os.path.join(OUT_DIR, "fine_line_calls.png"),
    )

    bar_compare(
        fine,
        ["graph_time"],
        "Fine Mean Graph Latency",
        os.path.join(OUT_DIR, "fine_bar_mean.png"),
    )

    bar_compare(
        fine,
        ["graph_time"],
        "Fine P95 Graph Latency",
        os.path.join(OUT_DIR, "fine_bar_p95.png"),
        use_p95=True,
    )

    histogram(
        fine,
        "graph_time",
        "Fine Graph Latency Distribution",
        os.path.join(OUT_DIR, "fine_hist_graph.png"),
    )

    print(f"Plots saved in {OUT_DIR}")


if __name__ == "__main__":
    main()