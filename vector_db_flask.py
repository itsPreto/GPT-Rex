from flask import Flask, request, jsonify
import json
import numpy as np
import gzip
import pickle
from sentence_transformers import SentenceTransformer
from hyperdb import HyperDB
from flask_cors import CORS
import requests


app = Flask(__name__)
CORS(app, resources={r"/search": {"origins": "*"}})


def create_and_save_db(json_file, db_file):
    with open(json_file, "r") as f:
        documents = json.load(f)

    overviews = [(doc['overview'], idx) for idx, doc in enumerate(documents) if 'overview' in doc and isinstance(doc['overview'], str)]
    model = SentenceTransformer('all-MiniLM-L6-v2')
    overview_embeddings = np.array(model.encode([overview for overview, _ in overviews]))

    db = HyperDB(documents=overviews, vectors=overview_embeddings, embedding_function=lambda x: x)
    with gzip.open(db_file, "wb") as f:
        pickle.dump({'documents': overviews, 'vectors': overview_embeddings}, f)

def load_db(db_file):
    with gzip.open(db_file, "rb") as f:
        data = pickle.load(f)
    return HyperDB(documents=data['documents'], vectors=data['vectors'], embedding_function=lambda x: x)

def search_movies(query, db, original_documents, model, top_k=50):
    query_embedding = model.encode([query])[0]
    results = db.query(query_embedding, top_k=top_k)
    response = []
    for (overview_text, idx), similarity in results:
        movie = original_documents[idx].copy()  # Make a copy of the movie dict
        movie['searched_overview'] = overview_text
        movie['similarity_score'] = float(similarity)  # Convert to Python float
        # Ensure all keys in the dictionary are strings, and values are JSON serializable
        movie = {str(key): (float(value) if isinstance(value, np.float32) else value) for key, value in movie.items()}
        response.append(movie)
    return response

# @app.route('/completion', methods=['POST'])
# def completion_proxy():
#     try:
#         print(request.json)
#         # Assuming your C++ backend completion endpoint is at http://localhost:5000/completion
#         cpp_backend_url = 'http://localhost:5000/completion'

#         # Forward the received JSON payload to the C++ backend
#         response = requests.post(cpp_backend_url, json=request.json)

#         # Check if the request to the backend was successful
#         if response.status_code == 200:
#             # Forward the response from the C++ backend to the frontend
#             return jsonify(response.json()), 200
#         else:
#             return jsonify({'error': 'Backend request failed'}), response.status_code
#     except requests.RequestException as e:
#         # Handle any exceptions that occur during the request to the C++ backend
#         return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.json
        query = data.get('query')
        if not query:
            return jsonify({'error': 'No query provided'}), 400
        response = search_movies(query, db, original_documents, model)
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    db_file = "assets/movies_hyperdb.pickle.gz"
    json_file = "assets/all_movies.json"
    create_new_db = False  # Set this based on your need
    if create_new_db:
        create_and_save_db(json_file, db_file)
    db = load_db(db_file)
    with open(json_file, "r") as f:
        original_documents = json.load(f)
    model = SentenceTransformer('all-MiniLM-L6-v2')
    app.run(debug=True, port=8081)