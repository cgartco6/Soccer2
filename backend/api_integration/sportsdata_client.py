import requests
from config.settings import Config

class SportsDataClient:
    def __init__(self):
        self.api_key = Config.SPORTSDATA_API_KEY
        self.base_url = Config.SPORTSDATA_BASE_URL
    
    def get_soccer_odds(self):
        """Get soccer odds from SportsData.io"""
        url = f"{self.base_url}/soccer/odds/json/GameOddsByWeek/EPL/2023"
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.api_key
        }
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"SportsData.io API error: {response.status_code}")
                return []
        except Exception as e:
            print(f"Exception in get_soccer_odds: {e}")
            return []
    
    def get_live_games(self):
        """Get live games data"""
        url = f"{self.base_url}/scores/json/GamesByDate/2023-01-01"
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.api_key
        }
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                games = response.json()
                # Filter for live games
                live_games = [game for game in games if game.get('Status') == 'InProgress']
                return live_games
            return []
        except Exception as e:
            print(f"Exception in get_live_games: {e}")
            return []
