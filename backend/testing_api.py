from models import OpenAlexService
from time import time
import concurrent.futures

service = OpenAlexService()
# TODO: implement threading for concurrency at level 2
# TODO: implement global filtering 
# TODO: add relevance algorithms 
def run_example(seed_id, xr, xc, yr, yc, x_lim):
    start = time()
    print(f" Initializing graph for {xr=}, {xc=}, {yr=}, {yc=}")
    print(f"\n(Level 0) Fetching seed: {seed_id}")
    seed_data = service.get_work(seed_id)
    print(f"SEED: {seed_data.get('title')}")
    
    parents = []
    print(f"\n [L1] fetching {xr} references of seed...")
    seed_ref_urls = seed_data.get("referenced_works", [])
    print(f"{seed_ref_urls[:5]=}")
    seed_ref_ids = [url.split("/")[-1] for url in seed_ref_urls][:xr]

    if seed_ref_ids:
        level1_refs = service.get_batched_works(seed_ref_ids)
        parents.extend(level1_refs)
        for r in level1_refs: 
            print(f"  -> [L1 ref] {r.get('title')}")
    
    print(f"\n[L1] fetching {xc} citations of seed...")
    level1_cites = service.get_citations(seed_id, max_results=xc)
    parents.extend(level1_cites)
    for c in level1_cites:
        print(f"  -> [L1 cite] {c.get('title')}")\
    
    parents.sort(
        key= lambda p: p.get("fwci") if p.get("fwci") is not None else 0.0,
        reverse=True
    )
    [print(f"\n {p.get("fwci")} {p.get("title")} ") for p in parents]
    print([p.get("fwci") for p in parents])
    expanded_parents = parents[:x_lim]
    unexpanded_parents = parents[x_lim:]
    print(f"\n[Filter] Pruned {len(parents)} parents down to top 10 by FWCI.")
    total_parents = len(parents)
    print(f"\n[L2] Expanding {len(expanded_parents)} total parents...")
    parent_ref_map = {}
    all_ref_ids = set()

    for parent in expanded_parents:
        p_id = parent.get("id").split("/")[-1]
        raw_ref_urls = parent.get("referenced_works", [])
        ref_ids = [url.split("/")[-1] for url in raw_ref_urls][:yr]
        
        parent_ref_map[p_id] = ref_ids
        all_ref_ids.update(ref_ids)

    # Range of modification: Global batch fetch and dictionary mapping
    all_refs_list = service.get_batched_works(list(all_ref_ids))
    refs_dict = {work.get("id").split("/")[-1]: work for work in all_refs_list}
    def fetch_parent_citations(parent_id, parent_title):
        cites = service.get_citations(parent_id, max_results=yc)
        return parent_id, parent_title, cites
    # Range of modification: Parent enumeration and L2 mapping
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_parent = {
            executor.submit(fetch_parent_citations, p.get("id").split("/")[-1], p.get("title")): p 
            for p in expanded_parents
        }

    for future in concurrent.futures.as_completed(future_to_parent):
        p_id, p_title, cites_data = future.result()
        print(f"\n  Parent: {p_title[:100]} ({p_id})")

        p_ref_ids = parent_ref_map.get(p_id, [])
        
        if p_ref_ids:
            for r_id in p_ref_ids:
                r_data = refs_dict.get(r_id)
                if r_data:
                    print(f"    -> [L2 Ref] {r_data.get('title')}")
        else:
            print("    -> [L2 Ref] No references found")
        for c in cites_data:
            print(f"    -> [L2 Cite] {c.get('title')[:60]}")
    end = time()
    print(f" Total requests sent: {service.count} in {end - start} seconds")


if __name__ == "__main__":
    TARGET_SEED = "W3138516171"
    run_example(TARGET_SEED, xr=10, xc=10, yr=4, yc=4, x_lim=10)