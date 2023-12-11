import requests
from sentence_transformers import SentenceTransformer

def extract_features_from_prompt(prompt):
    """
    This function sends the user prompt to the LLM along with the instruction to extract features.
    """
    system_instruction = """
        Analyze the user's input and extract key features that align with our movie annotation categories: themes, setting, mood, genre, character dynamics, and stylistic features.
        Summarize these features to reflect the user's interests, assisting in accurately matching them with suitable movies from our database.
        Example:
            User Input: 'I'm looking for a mystery film set in a small town with a focus on family secrets and local folklore.'
            - Theme: Family secrets, local folklore, and uncovering hidden truths.
            - Setting: A small, close-knit town with a rich history and mysterious ambiance.
            - Mood: Intriguing and contemplative, with an air of mystery and suspense.
            - Genre: Mystery drama.
            - Character Dynamics: The protagonist's interactions with townsfolk, revealing complex relationships and hidden pasts.
            - Stylistic Features: Emphasis on scenic landscapes, small-town imagery, and a soundtrack that enhances the mysterious and dramatic tone."
        """
    
    data = {
        "prompt": "\n\nUser Input: '" + prompt + "'",
        "temperature": 0.20,
        "system_prompt": {
            "prompt": system_instruction
        }
    }
    response = requests.post("http://localhost:8080/completion", json=data)
    if response.status_code == 200:
        return response.json().get("content")  # Extract the relevant part of the response
    else:
        raise Exception("Failed to get response from the LLM")

def encode_features(features):
    """
    This function takes the extracted features and encodes them using SentenceTransformer.
    """
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(features)
    return embeddings

def main():
    user_prompt = "I'm looking for a sci-fi movie with themes of space exploration and AI."
    # Extracting features
    features = extract_features_from_prompt(user_prompt)

    print(f"Prompt: - {user_prompt} -")
    print(f"Features: {features}")

    # Encoding features
    embeddings = encode_features(features)

    # for feature, embedding in zip(features, embeddings):
    #     print(f"Feature: {feature}")
    #     print(f"Embedding: {embedding}\n")

if __name__ == "__main__":
    main()
