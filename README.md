# GPT-Rex - A Retrieval Augmented Recommendation Engine

> A lightweight & extremely fast, RAG-powered recommendation engine-- leveraging advanced NLP, prompt engineering, and linear algebra to create a unique and narutal search experience.
<img width="1317" alt="image" src="https://github.com/itsPreto/GPT-Rex/assets/45348368/1d6747a4-1fe4-4929-9908-daa56c864f86">


------

### Key Features

-   **Vector Embeddings**: Employs vector embeddings for efficient and accurate movie recommendations.
-   **Retrieval Augmented Generation**: Integrates R.A.G for dynamic, context-aware recommendations.
-   **Few-Shot Prompting**: Utilizes few-shot prompting techniques for better understanding user queries.
-   **Re-Ranking Mechanism**: Incorporates a re-ranking system to optimize the relevance of search results.
------

### Technical Overview

The engine is built using Flask, allowing easy integration into web applications. It uses the SentenceTransformer model for generating vector embeddings of movie descriptions. The HyperDB module is employed for efficient storage and retrieval of these embeddings.

Key functions include:

-   `create_and_save_db`: Generates and stores the database of movie vectors.
-   `load_db`: Loads the pre-processed movie database.
-   `search_movies`: Handles the query processing and vector similarity computations to find the best movie matches.
------

### API Endpoints

-   **POST /search**: Accepts a search query and returns a list of recommended movies based on the query.
------

### Frontend

A basic frontend is provided for interacting with the recommendation engine. It includes:

-   **Search Bar**: For entering movie-related queries.
-   **Results Display**: Showcases the recommended movies with details such as title, overview, and similarity score.
------

### Setup and Running

To set up and run GPT-Rex:

1.  Install dependencies.
2.  Run the Flask app.

> Note: You will need to first create the vector db.

```python
if __name__ == "__main__":
    db_file = "assets/movies_hyperdb.pickle.gz"
    json_file = "assets/all_movies.json"
    create_new_db = False  # Toggle based on need
    if create_new_db:
        create_and_save_db(json_file, db_file)
    db = load_db(db_file)
    with open(json_file, "r") as f:
        original_documents = json.load(f)
    model = SentenceTransformer('all-MiniLM-L6-v2')
    app.run(debug=True, port=8080)
```
------

### Resources

-   [Understanding Vector Embeddings](https://www.pinecone.io/learn/vector-embeddings/)
-   [Exploring Retrieval Augmented Generation (R.A.G)](https://research.ibm.com/blog/retrieval-augmented-generation-RAG)
-   [Insights into Vector Similarity](https://www.pinecone.io/learn/vector-similarity/)
-   [Guide to Few-Shot Prompting](https://www.promptingguide.ai/techniques/fewshot)
-   [Overview of Re-Rankers](https://www.pinecone.io/learn/series/rag/rerankers/)
