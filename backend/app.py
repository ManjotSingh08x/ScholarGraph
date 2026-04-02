from flask import Flask, request, jsonify
from flask_cors import CORS
from models import GraphBuilder, OpenAlexService

app = Flask(__name__)
CORS(app)

service = OpenAlexService()

@app.route('/api/search', methods=["GET"])
def search_papers():
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    if not query:
        return jsonify({
            "error": "Missing search query param 'q'"
        })
    try:
        data = service.search_works(query, page)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
    
@app.route('/api/papers/<paper_id>', method=['GET'])
def get_paper_details(paper_id):
    try:
        data = service.get_work(paper_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/graph/<seed_id>', methods=['GET'])
def generate_graph(seed_id):
    xr = request.args.get('xr', 10, type=int)
    xc = request.args.get('xc', 10, type=int)
    yr = request.args.get('yr', 4, type=int)
    yc = request.args.get('yc', 4, type=int)
    x_lim = request.args.get('x_lim', 10, type=int)
    
    try:
        builder = GraphBuilder()
        graph_data = builder.build_graph(seed_id, xr, xc, yr, yc, x_lim)
        return jsonify(graph_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)

