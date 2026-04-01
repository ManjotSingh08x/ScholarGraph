import os 
import requests
from dotenv import load_dotenv

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