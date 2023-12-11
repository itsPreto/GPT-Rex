import requests
import json
import pprint

def get_llm_annotations(movie):
    url = 'http://localhost:8080/completion'
    headers = {'Content-Type': 'application/json'}
    
    system_prompt = (
        "Annotate the following movie by providing brief, descriptive statements "
        "for each of the following categories: themes, setting, mood, genre, "
        "character dynamics, and stylistic features. Your annotations should be "
        "concise, informative, and reflective of the movie's core aspects.\n\n"
        "Example:\n"
        "Movie to Annotate: 'Eternal Space Odyssey'\n"
        "Movie Metadata: []\n"
        "- Theme: Exploration of human resilience and adaptability in the face of unknown cosmic challenges, emphasizing the significance of cooperation and scientific curiosity.\n"
        "- Setting: Set in the distant future, primarily aboard the spaceship 'Endeavour' traveling through uncharted space and visiting various planets and star systems.\n"
        "- Mood: A mix of awe-inspiring wonder at the vastness of space, coupled with tension and suspense from the perils encountered.\n"
        "- Genre: Sci-fi adventure with elements of drama and mystery.\n"
        "- Character Dynamics: The dynamic between the diverse crew members, each with unique skills and backgrounds, as they face moral dilemmas and existential threats, forming bonds and facing conflicts.\n"
        "- Stylistic Features: Visuals showcasing the grandeur of space and futuristic technology, with a focus on realistic depictions of space travel and exploration, and a soundtrack that accentuates the sense of adventure and the unknown.\n\n"
        f"Movie to Annotate: '{movie['title']}'\n"
        f"Movie Metadata: {json.dumps(movie, indent=2)}\n"
    )

    data = {
        "prompt": system_prompt,
        "temperature": 0.20,
        }
    
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        print(f"Successfully annotated movie '{movie['title']}'")
        annotations = response.json().get("content", "")
        print(f"Annotations: {annotations}")
        return annotations
    else:
        print(f"Error annotating movie '{movie['title']}': {response.status_code}, {response.text}")
        return None
def process_movies(file_path):
    try:
        with open(file_path, 'r') as file:
            movies = json.load(file)
    except FileNotFoundError:
        print(f"File not found: {file_path}")
        return

    total_movies = len(movies)
    for index, movie in enumerate(movies, start=1):
        if 'annotations' in movie:
            print(f"Movie '{movie['title']}' already annotated. [{index}/{total_movies}]")
            continue

        print(f"Processing movie '{movie['title']}'... [{index}/{total_movies}]")
        annotations = get_llm_annotations(movie)
        if annotations:
            movie['annotations'] = annotations

    # Save all annotations at the end
    with open("movie_annotations.json", 'w') as file:
        json.dump(movies, file, indent=2)
    print("All movies processed and saved.")

# Path to your movies JSON file
file_path = 'assets/all_movies.json'

# Process and annotate movies
process_movies(file_path)
