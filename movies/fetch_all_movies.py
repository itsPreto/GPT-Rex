import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def fetch_movies(api_key, page=1):
    url = f"https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&page={page}"

    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()['results']
    else:
        print(f"Error fetching page {page}: {response.status_code} - {response.reason}")
        return []

def main():
    api_key = os.getenv('TMDB_API_KEY')
    unique_movies = {}

    # Fetch movies - Example: Loop through first 10000 pages
    for page in range(1, 10000):
        movies = fetch_movies(api_key, page)
        if not movies:
            break
        for movie in movies:
            unique_movies[movie['id']] = movie
        print(f"Fetched page {page}, Total unique movies: {len(unique_movies)}")

    with open('assets/all_movies.json', 'w') as file:
        json.dump(list(unique_movies.values()), file, indent=4)

if __name__ == "__main__":
    main()
