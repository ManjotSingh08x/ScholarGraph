import requests
import time

API_KEY = "wrtS93c2Ob42nPQah2Dyo1" 
BASE_URL = "https://api.openalex.org"

request_count = 0

def make_request(url, params=None):
    global request_count
    if params is None:
        params = {}
    
    if API_KEY:
        params['api_key'] = API_KEY
        
    response = requests.get(url, params=params)
    request_count += 1
    response.raise_for_status()
    return response.json()

def main():
    start_time = time.time()

    search_params = {
        "search": "transformers machine learning",
        "per-page": 10
    }
    works_data = make_request(f"{BASE_URL}/works", search_params)
    works = works_data.get("results", [])

    print("Top 10 DOIs:")
    for w in works:
        doi = w.get("doi")
        if doi:
            print(doi)

    print("\nData for top 10 papers:")
    for w in works:
        work_id = w.get("id")
        openalex_short_id = work_id.split('/')[-1]
        title = w.get("title")
        print(f"\nTitle: {title}")
        print(f"OpenAlex ID: {work_id}")

        references = w.get("referenced_works", [])
        print(f"Reference Count: {len(references)}")
        if references:
            print(f"Sample Reference IDs: {references[:3]}")

        cite_params = {
            "filter": f"cites:{openalex_short_id}",
            "per-page": 5 
        }
        citations_data = make_request(f"{BASE_URL}/works", cite_params)
        citations = citations_data.get("results", [])
        
        total_citations = citations_data.get('meta', {}).get('count', 0)
        print(f"Citation Count: {total_citations}")
        
        cite_dois = [c.get("doi") for c in citations if c.get("doi")]
        if cite_dois:
            print(f"Sample Citing DOIs: {cite_dois[:3]}")

    end_time = time.time()
    
    print("\n--- Telemetry ---")
    print(f"Execution Time: {end_time - start_time:.2f} seconds")
    print(f"Total API Requests: {request_count}")

if __name__ == "__main__":
    main()