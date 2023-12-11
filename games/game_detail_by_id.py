import requests
import json
import time
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

def fetch_game_details(appid, api_key):
    url = f"https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key={api_key}&appid={appid}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return None

def main():
    api_key = os.getenv('STEAM_API_KEY')
    with open('steam_games.json', 'r') as file:
        data = json.load(file)

    games_details = []
    for game in data['applist']['apps']:
        appid = game['appid']
        details = fetch_game_details(appid, api_key)
        if details:
            games_details.append(details)
        time.sleep(1)  # To respect rate limits

    with open('assets/games_details.json', 'w') as outfile:
        json.dump(games_details, outfile)

if __name__ == "__main__":
    main()
