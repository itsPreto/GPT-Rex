# GPT-Rex
> A sophisticated, LLM-powered, recommendation engine that leverages a combination of advanced NLP, prompt engineering, and vector embeddings to create a unique and efficient search engine for movies.

By transforming both user queries and content metadata into standardized vector embeddings, the system can effectively compare and match these elements. The core of the matching process relies on calculating the cosine similarity (dot product) between these embeddings. This approach allows for nuanced understanding and alignment of user preferences with content features/annotations-- ultimately enhancing the accuracy and relevance of recommendations.

## Phase 1: Data Curation
Curating a dataset rich in metadata. This should include aspects such as themes, settings, dynamics, genre, and stylistic features-- in reality this will come straight from the content set.

## Phase 2: Iterative Processing
Leveraging a local LLM ([7B models](https://huggingface.co/TheBloke?search_models=-7B)) for dataset processing and annotation. The respective metadata for each content will be provided to the model which is instructed to annotate it focusing on different aspects such as themes, setting, mood, genre, character dynamics, and stylistic features. Here's what the system prompt would look like:

```log
"Annotate the following movie by providing brief, descriptive statements for each of the following categories: themes, setting, mood, genre, character dynamics, and stylistic features. Your annotations should be concise, informative, and reflective of the movie's core aspects.

Example:
Movie to Annotate: 'Eternal Space Odyssey'
Movie Metadata: [metadata goes here]
- Theme: Exploration of human resilience and adaptability in the face of unknown cosmic challenges, emphasizing the significance of cooperation and scientific curiosity.
- Setting: Set in the distant future, primarily aboard the spaceship 'Endeavour' traveling through uncharted space and visiting various planets and star systems.
- Mood: A mix of awe-inspiring wonder at the vastness of space, coupled with tension and suspense from perils.
- Genre: Sci-fi adventure with elements of drama and mystery.
- Character Dynamics: The dynamic between the diverse crew members, each with unique skills and backgrounds, as they face moral dilemmas and existential threats, forming bonds and facing conflicts.
- Stylistic Features: Visuals showcasing the grandeur of space and futuristic technology, with a focus on realistic depictions of space travel and exploration, and a soundtrack that accentuates the sense of adventure and the unknown. 
```
## Phase 3: Embedding Generation

Transforming both the content annotations and user-extracted features (both standardized) into concise and descriptive sentence embeddings for more effective similarity retrieval.
-  **Vectorization of Annotations**: Each movie's annotated features (themes, setting, mood, genre, character dynamics, stylistic features) are transformed into numerical vectors. This process utilizes natural language processing techniques to ensure that the semantic richness of the annotations is captured in the vector space. 
-  **User Feature Embeddings**: Similarly, the key features extracted from user prompts are also converted into embeddings. This transformation ensures that these features can be compared in a like-for-like manner with the movie annotations in the vector space. 
-  **Embedding Techniques**: Depending on the system's design, various techniques like word embeddings (Word2Vec, GloVe), sentence embeddings, or even more advanced transformer-based models (like BERT or GPT) could be used to generate these embeddings. 
-  **Normalization and Standardization**: To ensure consistency and comparability, the embeddings may be normalized or standardized. This step ensures that the embeddings are on a comparable scale and represent the features accurately.

## Phase 4: Prompt Pre-Processing

A key component of my system is the pre-processing of user prompts, which aims to accurately match gamers' queries with our annotated content. This involves parsing user inputs to identify key features that resonate with our content annotation categories. Similar to Phase 2, the system prompt would look like this:

```log
"Analyze the following user input and extract key features that align with our movie annotation categories: themes, setting, mood, genre, character dynamics, and stylistic features. Summarize these features to reflect the user's interests, assisting in accurately matching them with suitable movies from our database.

Example:
User Input: 'I'm looking for a suspenseful thriller set in a futuristic dystopian world, focusing on the theme of surveillance and privacy.'
- Theme: The struggle for privacy and freedom in a surveillance-dominated society.
- Setting: A futuristic dystopian world where technology has advanced to allow pervasive surveillance.
- Mood: Suspenseful and tense, with an atmosphere of paranoia and intrigue.
- Genre: Futuristic thriller with dystopian elements.
- Character Dynamics: Focus on the protagonist's battle against an oppressive system, interactions with allies in the resistance, and encounters with enforcers of surveillance.
- Stylistic Features: Dark, oppressive visuals depicting a high-tech surveillance society, with a gripping and suspenseful soundtrack.
```

## Phase 5: Retrieval-Augmented Generation (R.A.G)

-   Movies are represented by vectors derived from in-depth annotations.
-   User preferences are represented by vectors derived from extracted features, ensuring alignment with the movie annotation structure.
-   Cosine similarity scores are calculated between these aligned vectors.
-   Movies are ranked based on their similarity to the user's interest vector, with higher scores indicating a closer match.
-   Both sets of vectors represent a range of features, allowing the system to perform a multi-dimensional comparison that considers various aspects of movies and user preferences.

## Phase 6: Recommendations

Generating a list of recommendations based on the refined and ranked data from the previous phases:

-   Extract key features (like themes, settings, mood, genre, etc.) from the user’s prompt and generate embeddings for each of these features. Initial Comparison:
-   For each feature embedding of the user, compare it with the corresponding feature embeddings of all movies in the database. This comparison could involve calculating cosine similarity scores between the user’s feature embeddings and each movie's feature embeddings. Identifying Preliminary Matches:
-   Based on these comparisons, identify a preliminary list of movies that have a certain level of similarity with the user's feature embeddings. This list might include movies that show a significant degree of match in one or more features but is not yet refined or ranked. Calculating Average Similarity Scores:
-   For each movie in the preliminary list, calculate the average of the cosine similarity scores across all feature comparisons with the user’s embeddings. This average score represents the overall similarity of the movie to the user’s diverse set of interests. Re-ranking Movies:
-   Rank the movies in the preliminary list based on their average similarity scores. Higher scores indicate a closer overall match to the user's preferences, considering all extracted features. Generating Final Recommendations:
-   Select the top-ranked movies from this refined list as the final recommendations. These recommendations are more likely to align closely with the user's interests across multiple dimensions.

## Conclusion

By employing feature extraction, input standardization, and embedding annotations, the system gains a deeper and more nuanced understanding of both movies and user preferences. This process ensures a more precise alignment between the two, leading to recommendations that more accurately reflect users' actual interests.

Such an approach significantly enhances the user experience by providing recommendations that truly resonate with individual preferences, offering a marked improvement over traditional methods that may overlook these finer details and subtleties.

----------

### Resources

-   [What are Vector Embeddings?](https://www.pinecone.io/learn/vector-embeddings/)
-   [What is Retrieval Augmented Generation (R.A.G)?](https://research.ibm.com/blog/retrieval-augmented-generation-RAG)
-   [What is Vector Similarity?](https://www.pinecone.io/learn/vector-similarity/)
-   [What is Few-Shot Prompting?](https://www.promptingguide.ai/techniques/fewshot)
-   [What is a Re-Ranker?](https://www.pinecone.io/learn/series/rag/rerankers/)
