import json
import numpy as np
import gzip
import pickle
from sentence_transformers import SentenceTransformer
from hyperdb import HyperDB

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

def main(create_new_db=False):
    db_file = "assets/movies_hyperdb.pickle.gz"
    json_file = "assets/all_movies.json"
    if create_new_db:
        create_and_save_db(json_file, db_file)
    db = load_db(db_file)

    with open(json_file, "r") as f:
        original_documents = json.load(f)

    model = SentenceTransformer('all-MiniLM-L6-v2')
    query = "artificial intelligence."
    query_embedding = model.encode([query])[0]
    results = db.query(query_embedding, top_k=5)

    for (overview, idx), similarity in results:
        movie = original_documents[idx]
        print(f"Title: {movie['title']}")
        print(f"Overview: {overview}")
        print(f"Similarity Score: {similarity}\n")

if __name__ == "__main__":
    main(create_new_db=False)  # Set to True to create a new DB
