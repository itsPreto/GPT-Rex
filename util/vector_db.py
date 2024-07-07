import json
import numpy as np
import gzip
import pickle
import faiss
import requests
from tqdm import tqdm
import logging
import os
from typing import List, Tuple, Dict, Any
import argparse

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:11434/api/embeddings")
MODEL = os.getenv("MODEL", "albertogg/multi-qa-minilm-l6-cos-v1:latest")
DB_FILE = os.getenv("DB_FILE", "assets/movies_faiss.pickle.gz")
JSON_FILE = os.getenv("JSON_FILE", "assets/all_movies.json")

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_embeddings_batch(texts: List[str], model: str = MODEL, batch_size: int = 32) -> np.ndarray:
    all_embeddings = []
    failed_texts = []
    for i in tqdm(range(0, len(texts), batch_size)):
        batch = texts[i:i+batch_size]
        batch_embeddings = []
        for text in batch:
            payload = json.dumps({
                "model": model,
                "prompt": text
            })
            headers = {'Content-Type': 'application/json'}
            try:
                response = requests.post(API_URL, data=payload, headers=headers)
                response.raise_for_status()
                result = response.json()
                embedding = result.get('embedding')
                if not embedding:
                    raise ValueError(f"Invalid embedding format received for text: {text[:50]}...")
                batch_embeddings.append(embedding)
            except requests.exceptions.RequestException as e:
                logging.error(f"Error in generate_embeddings_batch: {str(e)}")
                if e.response is not None:
                    logging.error(f"Response content: {e.response.content}")
                failed_texts.append(text)
            except Exception as e:
                logging.error(f"Unexpected error in generate_embeddings_batch: {str(e)}")
                failed_texts.append(text)
        all_embeddings.extend(batch_embeddings)

    logging.info(f"Successfully generated {len(all_embeddings)} embeddings")
    logging.info(f"Failed to generate embeddings for {len(failed_texts)} texts")

    if len(all_embeddings) == 0:
        raise ValueError("No valid embeddings were generated.")

    return np.array(all_embeddings, dtype=np.float32)

def get_genre_names(genre_ids: List[int], genre_map: Dict[int, str]) -> List[str]:
    return [genre_map.get(genre_id, "Unknown") for genre_id in genre_ids]

def create_movie_text(movie: Dict[str, Any]) -> str:
    title = movie.get('title', '').strip()
    overview = movie.get('overview', '').strip()
    genres = ', '.join(str(genre_id) for genre_id in movie.get('genre_ids', []))
    if not title and not overview:
        return ""
    return f"Title: {title}. Genre IDs: {genres}. Overview: {overview}"

def create_and_save_db(json_file: str, db_file: str, batch_size: int = 32):
    with open(json_file, "r") as f:
        documents = json.load(f)

    movie_texts = []
    all_genres = set()
    release_years = set()
    for movie in documents:
        movie_text = create_movie_text(movie)
        if movie_text:
            movie_texts.append((movie_text, movie['id']))
        all_genres.update(movie.get('genre_ids', []))
        if 'release_date' in movie and movie['release_date']:
            try:
                year = movie['release_date'][:4]
                if year.isdigit():
                    release_years.add(year)
            except IndexError:
                logging.warning(f"Invalid release date format for movie id {movie.get('id', 'unknown')}: {movie.get('release_date', 'N/A')}")

    logging.info(f"Prepared {len(movie_texts)} movie texts for embedding generation")

    # Calculate number of centroids
    unique_genres = len(all_genres)
    year_range = len(release_years)
    base_centroids = max(unique_genres * 2, 10)  # Ensure at least 10 base centroids
    time_factor = min(year_range, 5)  # Cap at 5 to avoid too many centroids
    n_centroids = base_centroids * time_factor
    n_centroids = max(50, min(n_centroids, 100))  # Ensure between 50 and 100 centroids

    logging.info(f"Calculated {n_centroids} centroids based on {unique_genres} unique genres and {year_range} years of releases")

    logging.info("Generating embeddings...")
    texts_only = [text for text, _ in movie_texts]
    movie_embeddings = generate_embeddings_batch(texts_only, batch_size=batch_size)

    if movie_embeddings.size == 0:
        raise ValueError("No valid embeddings were generated.")

    logging.info(f"Generated {len(movie_embeddings)} embeddings of shape {movie_embeddings.shape}")
    dim = movie_embeddings.shape[1]

    # Using IndexIVFFlat with calculated number of centroids
    quantizer = faiss.IndexFlatIP(dim)
    index = faiss.IndexIVFFlat(quantizer, dim, n_centroids, faiss.METRIC_INNER_PRODUCT)
    index.train(movie_embeddings)
    index.add(movie_embeddings)

    logging.info(f"Created FAISS index with {index.ntotal} vectors of dimension {dim} and {n_centroids} centroids")

    with gzip.open(db_file, "wb") as f:
        pickle.dump({'documents': movie_texts, 'index': faiss.serialize_index(index)}, f)
    logging.info(f"Saved database to {db_file}")

def load_db(db_file: str) -> Tuple[List[Tuple[str, int]], Any]:
    with gzip.open(db_file, "rb") as f:
        data = pickle.load(f)
    index = faiss.deserialize_index(data['index'])
    return data['documents'], index

def search_movies(query: str, index: Any, documents: List[Tuple[str, int]], original_documents: List[Dict[str, Any]], k: int = 5) -> List[Dict[str, Any]]:
    query_embedding = generate_embeddings_batch([query])
    distances, indices = index.search(query_embedding.reshape(1, -1), k)

    results = []
    for i in range(k):
        idx = indices[0][i]
        _, movie_id = documents[idx]
        movie = next((m for m in original_documents if m['id'] == movie_id), None)
        if movie:
            similarity = float(distances[0][i])
            results.append({
                "title": movie['title'],
                "overview": movie['overview'],
                "genre_ids": movie.get('genre_ids', []),
                "similarity_score": similarity
            })

    return results

def main(args):
    if args.create_new_db:
        create_and_save_db(args.json_file, args.db_file)

    documents, index = load_db(args.db_file)

    with open(args.json_file, "r") as f:
        original_documents = json.load(f)

    while True:
        query = input("Enter your movie query (or 'quit' to exit): ")
        if query.lower() == 'quit':
            break

        results = search_movies(query, index, documents, original_documents, args.num_results)

        for result in results:
            print(f"Title: {result['title']}")
            print(f"Genre IDs: {', '.join(map(str, result['genre_ids']))}")
            print(f"Overview: {result['overview']}")
            print(f"Similarity Score: {result['similarity_score']:.4f}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Movie Recommendation Engine")
    parser.add_argument("--create_new_db", action="store_true", help="Create a new database")
    parser.add_argument("--db_file", default=DB_FILE, help="Path to the database file")
    parser.add_argument("--json_file", default=JSON_FILE, help="Path to the JSON file containing movie data")
    parser.add_argument("--num_results", type=int, default=5, help="Number of results to retrieve")
    args = parser.parse_args()

    main(args)
