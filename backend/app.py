from flask import Flask, request, jsonify
from flask_cors import CORS
from models import GraphBuilder, OpenAlexService
from redis_client import redis_client
import traceback
import json

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

service = OpenAlexService()


@app.route("/api/search", methods=["GET"])
def search_papers():
    query = request.args.get("q", "")
    page = request.args.get("page", 1, type=int)
    start_year = request.args.get("start_year", type=int)
    end_year = request.args.get("end_year", type=int)
    venue = request.args.get("venue", type=str)

    if not query:
        return jsonify({"error": "Missing search query param 'q'"}), 400

    try:
        cache_key = f"search:{query}:{page}:{start_year}:{end_year}:{venue}"
        cached = redis_client.get(cache_key)
        if cached:
            print("SEARCH CACHE HIT ")
            return jsonify(json.loads(cached)), 200

        print("SEARCH CACHE MISS ")

        data = service.search_works(
            query=query,
            page=page,
            start_year=start_year,
            end_year=end_year,
            venue=venue,
        )

        redis_client.set(cache_key, json.dumps(data), ex=600)
        return jsonify(data), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/papers/<paper_id>", methods=["GET"])
def get_paper_details(paper_id):
    try:
        cache_key = f"paper:{paper_id}"
        cached = redis_client.get(cache_key)
        if cached:
            print("PAPER CACHE HIT ⚡")
            return jsonify(json.loads(cached)), 200

        print("PAPER CACHE MISS ❌")

        data = service.get_work(paper_id)
        redis_client.set(cache_key, json.dumps(data), ex=3600)
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/graph/<seed_id>", methods=["GET"])
def generate_graph(seed_id):
    xr = request.args.get("xr", 10, type=int)
    xc = request.args.get("xc", 10, type=int)
    yr = request.args.get("yr", 4, type=int)
    yc = request.args.get("yc", 4, type=int)
    x_lim = request.args.get("x_lim", 10, type=int)

    try:
        cache_key = f"graph:{seed_id}:{xr}:{xc}:{yr}:{yc}:{x_lim}"
        cached = redis_client.get(cache_key)
        if cached:
            print("GRAPH CACHE HIT ⚡")
            return jsonify(json.loads(cached)), 200

        print("GRAPH CACHE MISS ❌")

        builder = GraphBuilder()
        graph_data = builder.build_graph(seed_id, xr, xc, yr, yc, x_lim)

        redis_client.set(cache_key, json.dumps(graph_data), ex=900)
        return jsonify(graph_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/debug/graph-stats/<seed_id>", methods=["GET"])
def graph_stats(seed_id):
    xr = request.args.get("xr", 10, type=int)
    xc = request.args.get("xc", 10, type=int)
    yr = request.args.get("yr", 4, type=int)
    yc = request.args.get("yc", 4, type=int)
    x_lim = request.args.get("x_lim", 10, type=int)

    try:
        builder = GraphBuilder()
        graph_data = builder.build_graph(seed_id, xr, xc, yr, yc, x_lim)
        return jsonify({
            "graph": graph_data,
            "external_calls": builder.service.count
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/flush-cache", methods=["GET"])
def flush_cache():
    redis_client.flushall()
    return jsonify({"status": "cache cleared"}), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)