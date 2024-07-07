from flask import Flask, request, jsonify, Response, stream_with_context
import json
import numpy as np
import gzip
import pickle
import faiss
from flask_cors import CORS
import requests
from math import sqrt
import logging
from tqdm import tqdm

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration values
API_URLS = {
    "generate": "http://localhost:11434/api/generate",
    "embeddings": "http://localhost:11434/api/embeddings",
    "chat": "http://localhost:11434/api/chat"
}
MODELS = {
    "embedding": "jina/jina-embeddings-v2-base-en:latest",
    "llm_response": "gemma2:9b-instruct-q5_K_S",
    "chat": "qwen2:7b",
    "query_generation": "qwen2:1.5b",
    "tts": "tts-1"
}
DB_FILE = "assets/movies_faiss.pickle.gz"
JSON_FILE = "assets/all_movies.json"

app = Flask(__name__)
CORS(app, resources={r"/search": {"origins": "*"}, r"/completion": {"origins": "*"}, r"/chat": {"origins": "*"}})

def generate_embeddings(text, model=MODELS["embedding"]):
    payload = json.dumps({"model": model, "prompt": text})
    headers = {'Content-Type': 'application/json'}
    try:
        response = requests.post(API_URLS["embeddings"], data=payload, headers=headers)
        response.raise_for_status()
        result = response.json()
        embeddings = result.get('embedding')
        if not embeddings:
            raise ValueError("Invalid embedding format received")
        return np.array(embeddings, dtype=np.float32)
    except Exception as e:
        logging.error(f"Error in generate_embeddings: {str(e)}")
        return None

def create_and_save_db(json_file, db_file):
    with open(json_file, "r") as f:
        documents = json.load(f)

    overviews = []
    for idx, doc in enumerate(documents):
        if 'overview' in doc and isinstance(doc['overview'], str):
            overviews.append((doc['overview'], idx))

    print("Generating embeddings...")
    overview_embeddings = []
    valid_overviews = []
    for overview, idx in tqdm(overviews):
        embedding = generate_embeddings(overview)
        if embedding is not None:
            overview_embeddings.append(embedding)
            valid_overviews.append((overview, idx))
        else:
            logging.warning(f"Skipping overview for movie index {idx} due to embedding generation failure")

    overview_embeddings = np.array(overview_embeddings, dtype=np.float32)
    print(f"Generated {len(overview_embeddings)} valid embeddings out of {len(overviews)} total overviews")

    if len(overview_embeddings) == 0:
        raise ValueError("No valid embeddings were generated")

    dim = overview_embeddings.shape[1]

    # Normalize embeddings for cosine similarity
    faiss.normalize_L2(overview_embeddings)

    # Use IndexFlatIP for cosine similarity
    index = faiss.IndexFlatIP(dim)
    index.add(overview_embeddings)

    print(f"Created FAISS index with {index.ntotal} vectors of dimension {dim}")

    with gzip.open(db_file, "wb") as f:
        pickle.dump({'documents': valid_overviews, 'index': faiss.serialize_index(index)}, f)
    print(f"Saved database to {db_file}")

def load_db(db_file):
    with gzip.open(db_file, "rb") as f:
        data = pickle.load(f)
    index = faiss.deserialize_index(data['index'])
    return data['documents'], index

def search_movies(query, documents, index, original_documents, top_k=50, min_similarity=0.5):
    try:
        query_embedding = generate_embeddings(query)
        logging.info(f"Generated query embedding with shape: {query_embedding.shape}")

        if query_embedding.shape[0] != index.d:
            raise ValueError(f"Query embedding dimension ({query_embedding.shape[0]}) does not match index dimension ({index.d})")

        # Normalize query embedding for cosine similarity
        faiss.normalize_L2(query_embedding.reshape(1, -1))

        distances, indices = index.search(query_embedding.reshape(1, -1), top_k)

        response = []
        for i, idx in enumerate(indices[0]):
            if idx < len(documents) and distances[0][i] >= min_similarity:
                overview_text, original_idx = documents[idx]
                if original_idx < len(original_documents):
                    movie = original_documents[original_idx].copy()
                    movie['searched_overview'] = overview_text
                    movie['similarity_score'] = float(distances[0][i])
                    movie = {str(key): (float(value) if isinstance(value, (np.float32, np.float64)) else value) for key, value in movie.items()}
                    response.append(movie)
                else:
                    logging.warning(f"Invalid original_idx: {original_idx}")
            elif distances[0][i] < min_similarity:
                logging.info(f"Skipping result due to low similarity: {distances[0][i]}")
            else:
                logging.warning(f"Invalid index: {idx}")

        # Sort results by similarity score in descending order
        response.sort(key=lambda x: x['similarity_score'], reverse=True)

        return response
    except Exception as e:
        logging.error(f"Error in search_movies: {str(e)}", exc_info=True)
        raise

@app.route('/completion', methods=['POST'])
def completion():
    try:
        data = request.json
        prompt = data.get('prompt')
        temperature = data.get('temperature', 0.7)
        system_prompt = data.get('system_prompt', {}).get('prompt', '')

        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400

        payload = {
            "model": MODELS["query_generation"],
            "prompt": prompt,
            "system": system_prompt,
            "temperature": temperature,
            "stream": False
        }

        response = requests.post(API_URLS["generate"], json=payload)
        response.raise_for_status()
        result = response.json()

        return jsonify({
            "content": result.get('response', ''),
            "finish_reason": "stop"
        })
    except Exception as e:
        logging.error(f"Error in completion endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        messages = data.get('messages', [])

        if not messages:
            return jsonify({'error': 'No messages provided'}), 400

        payload = {
            "model": MODELS["chat"],
            "messages": messages,
            "stream": True
        }

        response = requests.post(API_URLS["chat"], json=payload, stream=True)
        response.raise_for_status()

        def generate():
            for line in response.iter_lines():
                if line:
                    yield f"data: {line.decode('utf-8')}\n\n"
                    logging.info(f"data: {line.decode('utf-8')}\n\n")

        return Response(generate(), mimetype='text/event-stream')
    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({'error': 'No query provided'}), 400

        query = data['query']
        logging.info(f"Received search query: {query}")

        response = search_movies(query, documents, index, original_documents)

        logging.info(f"Search completed. Found {len(response)} results.")

        return jsonify(response)
    except Exception as e:
        logging.error(f"Error in search endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    create_new_db = False  # Set this to True to recreate the database

    if create_new_db:
        create_and_save_db(JSON_FILE, DB_FILE)

    try:
        documents, index = load_db(DB_FILE)
        logging.info(f"Loaded {len(documents)} documents and FAISS index with dimension {index.d}")

        with open(JSON_FILE, "r") as f:
            original_documents = json.load(f)
        logging.info(f"Loaded {len(original_documents)} original documents")
    except Exception as e:
        logging.error(f"Error loading database: {str(e)}", exc_info=True)
        raise

    app.run(debug=True, port=8081)
