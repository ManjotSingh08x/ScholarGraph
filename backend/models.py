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
        self.session = requests.Session()
        self.api_key = os.getenv("OPENALEX_KEY")
        self.mail_id = os.getenv("MAIL_ID")
        if self.api_key:
            self.session.headers.update({
                "Authorization": f"Bearer {self.api_key}"
            })
        if self.mail_id:
            self.session.headers.update({
                "User-Agent": f"mailto:{self.mail_id}"
            })
        self.count = 0
    def _execute_request(self, params):
        self.count +=1
        response = self.session.get(self.base_url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_work(self, work_id):
        self.count += 1
        url = f"{self.base_url}/{work_id}"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()
        
    def get_batched_works(self, id_list: list[str]):
        results = []
        chunk_size = 50
        for i in range(0, len(id_list), chunk_size):
            chunk = id_list[i : i + chunk_size]
            joined_ids = "|".join(chunk)
            params = {
                "filter": f"openalex:{joined_ids}",
                "per-page": chunk_size
            }
            data = self._execute_request(params)
            results.extend(data.get("results", []))
        return results
    
    def get_citations(self, target_id, max_results=50, additional_filters=""):
        base_filter = f"cites:{target_id}"
        if additional_filters:
            base_filter = f"{base_filter},{additional_filters}"
        params = {
            "filter": base_filter,
            "per-page": max_results,
            "sort": "fwci:desc"
        }
        data = self._execute_request(params)
        return data.get("results", [])
    def search_works(self, query: str, page: int = 1, per_page: int = 25):
        params = {
            "search": query,
            "page": page,
            "per-page": per_page,
            "sort": "relevance_score:desc"
        }
        data = self._execute_request(params)
        return {
            "results": data.get("results", []),
            "meta": data.get("meta", {}) # Contains total count for frontend pagination
        }
    
@dataclass
class PaperDetails:
    """Heavy metadata rendered on frontend side-panel"""
    abstract: Optional[str] = None
    publication_year: Optional[int] = None
    citation_count: Optional[int] = 0
    fwci: Optional[float] = None
    authors: List[str] = field(default_factory=list)

@dataclass
class PaperNode:
    """Represents a single vertex for D3 graph"""
    id: str
    title:str
    group: int
    radius: int = 15
    details: PaperDetails = field(default_factory=PaperDetails)

@dataclass
class GraphLink:
    """Represents a directional edge between two papers"""
    source: str
    target: str
    type: str  # like 'cites' or 'references'

@dataclass
class CitationGraph:
    """root structure returned to the Flask controller"""
    nodes: List[PaperNode] = field(default_factory=list)
    links: List[GraphLink] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Serializes the entire graph, including nested dataclasses to a dict"""
        return asdict(self)
    


class GraphBuilder:
    def __init__(self):
        self.service = OpenAlexService()
        self.nodes_map: Dict[str, PaperNode] = {}
        self.links: List[GraphLink] = []

    def sort_by_fwci(self, papers: List[dict]) -> List[dict]:
        return sorted(
            papers,
            key = lambda p: p.get("fwci") if p.get("fwci") is not None else 0.0,
            reverse=True
        )

    def _extract_id(self, openalex_url:str) -> str:
        return openalex_url.split("/")[-1] if openalex_url else ""
    
    def _add_node(self, work: dict, group: int):
        work_id = self._extract_id(work.get("id", ""))
        if not work_id or work_id in self.nodes_map:
            return work_id
        
        authors = [a.get("authors", {}).get("display_name") for a in work.get("authorships", [])]
        self.nodes_map[work_id] = PaperNode(
            id=work_id,
            title=work.get("title", "Unkown Title"),
            group=group,
            details=PaperDetails(
                abstract=work.get("abstract_inverted_index"),
                publication_year=work.get("publication_year"),
                citation_count=work.get("cited_by_count", 0),
                fwci=work.get("fwci"),
                authors=authors
            )
        )
        return work_id
    
    def _add_link(self, source:str, target: str, link_type:str):
        self.links.append(GraphLink(source=source, target=target, type=link_type))

    def build_graph(self, seed_id: str, xr: int, xc: int, yr:int , yc: int, x_lim: int):
        start = time()
        # Level 0: Seed (Grandparent)
        seed_data = self.service.get_work(seed_id)
        self._add_node(seed_data, group=0)

        # Level 1: Parents 
        seed_ref_urls = seed_data.get("referenced_works", [])
        seed_ref_ids = [self._extract_id(url) for url in seed_ref_urls][:xr]

        level1_refs = []
        level1_cites = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_refs = executor.submit(self.service.get_batched_works, seed_ref_ids) if seed_ref_ids else None
            future_cites = executor.submit(self.service.get_citations, seed_id, max_results=xc)

            if future_refs:
                level1_refs = future_refs.result()
            level1_cites = future_cites.result()
        
        for ref in level1_refs:
            r_id = self._add_node(ref, group=1)
            self._add_link(source=seed_id, target=r_id, link_type="references")
            
        for cite in level1_cites:
            c_id = self._add_node(cite, group=1)
            self._add_link(source=c_id, target=seed_id, link_type="cited_by")

        all_parents = level1_refs + level1_cites
        all_parents = self.sort_by_fwci(all_parents)
        expanded_parents = all_parents[:x_lim]

        parent_ref_map: Dict[str, List[str]] = {}
        all_l2_ref_ids: Set[str] = set()

        for parent in expanded_parents:
            p_id = self._extract_id(parent.get("id"))
            raw_urls = parent.get("referenced_works", [])
            ref_ids = [self._extract_id(url) for url in raw_urls][:yr]
            
            parent_ref_map[p_id] = ref_ids
            all_l2_ref_ids.update(ref_ids)

        l2_ref_ids_list = list(all_l2_ref_ids)


        # Level 2: Children
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_l2_refs = executor.submit(self.service.get_batched_works, l2_ref_ids_list) if l2_ref_ids_list else None
            future_to_parent_id = {
                executor.submit(self.service.get_citations, self._extract_id(p.get("id")), max_results=yc): self._extract_id(p.get("id"))
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
                p_id = future_to_parent_id[future]
                cites_data = future.result()
                
                for cite in cites_data:
                    c_id = self._add_node(cite, group=2)
                    self._add_link(source=c_id, target=p_id, link_type="cited_by")

        graph = CitationGraph(
            nodes=list(self.nodes_map.values()),
            links = self.links
        )
        end = time()
        print(f" Total requests sent: {self.service.count} in {end - start} seconds")
        return graph.to_dict()

if __name__ == "__main__":
    builder = GraphBuilder()
    graph_json = builder.build_graph(seed_id="W3138516171", xr=10, xc=10, yr=4, yc=4, x_lim=10)
    print(graph_json)