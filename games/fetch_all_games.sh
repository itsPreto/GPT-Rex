#!/bin/bash

# Load the .env file
source ./.env

# Make the API call and save the output
curl "https://api.steampowered.com/ISteamApps/GetAppList/v2/?key=$STEAM_API_KEY" > ./assets/steam_games.json
