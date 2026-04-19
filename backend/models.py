import os
import requests
from dotenv import load_dotenv
from time import time
import concurrent.futures
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any, Set

load_dotenv()


class OpenAlexService:
    def __init__(self):
        print("setting up service")
        self.base_url = "https://api.openalex.org/works"
        self.session  = requests.Session()
        self.api_key  = os.getenv("OPENALEX_KEY")
        self.mail_id  = os.getenv("MAIL_ID")
        if self.api_key:
            self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})
        if self.mail_id:
            self.session.headers.update({"User-Agent": f"mailto:{self.mail_id}"})
        self.count = 0

    def _execute_request(self, params: dict) -> dict:
        self.count += 1
        response = self.session.get(self.base_url, params=params)
        response.raise_for_status()
        return response.json()

    def get_work(self, work_id: str) -> dict:
        self.count += 1
        url      = f"{self.base_url}/{work_id}"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()

    def get_batched_works(self, id_list: List[str]) -> List[dict]:
        results    = []
        chunk_size = 50
        for i in range(0, len(id_list), chunk_size):
            chunk      = id_list[i : i + chunk_size]
            joined_ids = "|".join(chunk)
            params     = {"filter": f"openalex:{joined_ids}", "per-page": chunk_size}
            data       = self._execute_request(params)
            results.extend(data.get("results", []))
        return results

    def get_citations(self, target_id: str, max_results: int = 50, additional_filters: str = "") -> List[dict]:
        base_filter = f"cites:{target_id}"
        if additional_filters:
            base_filter = f"{base_filter},{additional_filters}"
        params = {"filter": base_filter, "per-page": max_results, "sort": "fwci:desc"}
        data   = self._execute_request(params)
        return data.get("results", [])

    # ── A: concept_ids support ────────────────────────────────────────────────
    def search_works(
        self,
        query: str,
        page: int = 1,
        per_page: int = 25,
        start_year: Optional[int] = None,
        end_year:   Optional[int] = None,
        venue:      Optional[str] = None,
        concept_ids: Optional[List[str]] = None,
    ) -> dict:
        filters: List[str] = []

        if start_year:
            filters.append(f"from_publication_date:{start_year}-01-01")
        if end_year:
            filters.append(f"to_publication_date:{end_year}-12-31")
        if venue:
            filters.append(f"primary_location.source.display_name.search:{venue}")
        # A: map each selected concept to its OpenAlex concept filter
        if concept_ids:
            for cid in concept_ids:
                # OpenAlex concept id format: C41008148  → concepts.id:C41008148
                clean = cid if cid.startswith('C') else f'C{cid}'
                filters.append(f"concepts.id:{clean}")

        filter_str = ",".join(filters) if filters else None

        params: Dict[str, Any] = {
            "search":   query,
            "page":     page,
            "per-page": per_page,
            "sort":     "relevance_score:desc",
        }
        if filter_str:
            params["filter"] = filter_str

        data = self._execute_request(params)
        return {"results": data.get("results", []), "meta": data.get("meta", {})}


# ── Dataclasses ────────────────────────────────────────────────────────────────

@dataclass
class PaperDetails:
    """Heavy metadata rendered on frontend side-panel."""
    abstract:         Optional[str]  = None
    publication_year: Optional[int]  = None
    citation_count:   Optional[int]  = 0
    fwci:             Optional[float]= None
    authors:          List[str]      = field(default_factory=list)
    venue:            Optional[str]  = None
    # B/D: concept labels carried through to the frontend for faceted filtering
    concepts:         List[str]      = field(default_factory=list)


@dataclass
class PaperNode:
    """Represents a single vertex for the D3 graph."""
    id:     str
    title:  str
    group:  int
    radius: int          = 15
    details: PaperDetails = field(default_factory=PaperDetails)


@dataclass
class GraphLink:
    """Represents a directional edge between two papers."""
    source: str
    target: str
    type:   str


@dataclass
class CitationGraph:
    """Root structure returned to the Flask controller."""
    nodes: List[PaperNode] = field(default_factory=list)
    links: List[GraphLink] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ── GraphBuilder ───────────────────────────────────────────────────────────────

class GraphBuilder:
    def __init__(self):
        self.service   = OpenAlexService()
        self.nodes_map: Dict[str, PaperNode] = {}
        self.links:     List[GraphLink]       = []

    def sort_by_fwci(self, papers: List[dict]) -> List[dict]:
        return sorted(
            papers,
            key=lambda p: p.get("fwci") if p.get("fwci") is not None else 0.0,
            reverse=True,
        )

    def _extract_id(self, openalex_url: str) -> str:
        return openalex_url.split("/")[-1] if openalex_url else ""

    def _add_node(self, work: dict, group: int) -> str:
        work_id = self._extract_id(work.get("id", ""))
        if not work_id or work_id in self.nodes_map:
            return work_id

        # Authors
        authors = [
            a.get("author", {}).get("display_name", "")
            for a in work.get("authorships", [])
        ]

        # Venue
        venue_name = "Unknown Venue"
        try:
            loc        = work.get("primary_location") or {}
            source     = loc.get("source") or {}
            venue_name = source.get("display_name") or "Unknown Venue"
        except AttributeError:
            pass

        # B: extract concept display names (up to 5 top concepts by score)
        raw_concepts = work.get("concepts", []) or []
        concepts = [
            c.get("display_name", "")
            for c in sorted(raw_concepts, key=lambda c: c.get("score", 0), reverse=True)
            if c.get("display_name")
        ][:5]

        self.nodes_map[work_id] = PaperNode(
            id=work_id,
            title=work.get("title", "Unknown Title"),
            group=group,
            details=PaperDetails(
                abstract=work.get("abstract_inverted_index"),
                publication_year=work.get("publication_year"),
                citation_count=work.get("cited_by_count", 0),
                fwci=work.get("fwci"),
                authors=authors,
                venue=venue_name,
                concepts=concepts,
            ),
        )
        return work_id

    def _add_link(self, source: str, target: str, link_type: str) -> None:
        self.links.append(GraphLink(source=source, target=target, type=link_type))

    def build_graph(self, seed_id: str, xr: int, xc: int, yr: int, yc: int, x_lim: int) -> dict:
        start = time()

        seed_data = self.service.get_work(seed_id)
        self._add_node(seed_data, group=0)

        seed_ref_urls = seed_data.get("referenced_works", [])
        seed_ref_ids  = [self._extract_id(url) for url in seed_ref_urls][:xr]

        level1_refs  = []
        level1_cites = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_refs  = executor.submit(self.service.get_batched_works, seed_ref_ids) if seed_ref_ids else None
            future_cites = executor.submit(self.service.get_citations, seed_id, xc)
            if future_refs:
                level1_refs  = future_refs.result()
            level1_cites = future_cites.result()

        for ref in level1_refs:
            r_id = self._add_node(ref, group=1)
            self._add_link(source=seed_id, target=r_id, link_type="references")

        for cite in level1_cites:
            c_id = self._add_node(cite, group=1)
            self._add_link(source=c_id, target=seed_id, link_type="cited_by")

        all_parents     = self.sort_by_fwci(level1_refs + level1_cites)
        expanded_parents = all_parents[:x_lim]

        parent_ref_map: Dict[str, List[str]] = {}
        all_l2_ref_ids: Set[str]             = set()

        for parent in expanded_parents:
            p_id     = self._extract_id(parent.get("id"))
            ref_ids  = [self._extract_id(url) for url in parent.get("referenced_works", [])][:yr]
            parent_ref_map[p_id] = ref_ids
            all_l2_ref_ids.update(ref_ids)

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_l2_refs      = executor.submit(self.service.get_batched_works, list(all_l2_ref_ids)) if all_l2_ref_ids else None
            future_to_parent_id = {
                executor.submit(self.service.get_citations, self._extract_id(p.get("id")), yc): self._extract_id(p.get("id"))
                for p in expanded_parents
            }

            l2_refs_data = future_l2_refs.result() if future_l2_refs else []
            l2_refs_dict = {self._extract_id(w.get("id")): w for w in l2_refs_data}

            for p_id, ref_ids in parent_ref_map.items():
                for r_id in ref_ids:
                    r_data = l2_refs_dict.get(r_id)
                    if r_data:
                        r_node_id = self._add_node(r_data, group=2)
                        self._add_link(source=p_id, target=r_node_id, link_type="references")

            for future in concurrent.futures.as_completed(future_to_parent_id):
                p_id      = future_to_parent_id[future]
                cites_data = future.result()
                for cite in cites_data:
                    c_id = self._add_node(cite, group=2)
                    self._add_link(source=c_id, target=p_id, link_type="cited_by")

        graph = CitationGraph(nodes=list(self.nodes_map.values()), links=self.links)
        end   = time()
        print(f"Total requests: {self.service.count} in {end - start:.1f}s")
        return graph.to_dict()


if __name__ == "__main__":
    builder    = GraphBuilder()
    graph_json = builder.build_graph(seed_id="W3138516171", xr=10, xc=10, yr=4, yc=4, x_lim=10)
    print(graph_json)