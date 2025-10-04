import requests
import json
from datetime import datetime, timedelta
from config.settings import Config

class OddsAPIClient:
    def __init__(self):
        self.api_key = Config.ODDS_API_KEY
        self.base_url = Config.ODDS_API_BASE_URL
    
    def get_sports(self):
        """Get available sports"""
        url = f"{self.base_url}/sports"
        params = {
            'apiKey': self.api_key
        }
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching sports: {response.status_code}")
                return []
        except Exception as e:
            print(f"Exception in get_sports: {e}")
            return []
    
    def get_odds(self, sport='soccer_epl', regions='us,uk,eu', markets='h2h,spreads'):
        """Get odds for specified sport"""
        url = f"{self.base_url}/sports/{sport}/odds"
        
        params = {
            'apiKey': self.api_key,
            'regions': regions,
            'markets': markets,
            'oddsFormat': 'decimal',
            'dateFormat': 'iso'
        }
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                print(f"Retrieved {len(data)} matches for {sport}")
                return data
            else:
                print(f"Error fetching odds: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"Exception in get_odds: {e}")
            return []
    
    def get_live_odds(self, sport='soccer'):
        """Get live odds for in-play matches"""
        url = f"{self.base_url}/sports/{sport}/odds"
        
        params = {
            'apiKey': self.api_key,
            'regions': 'us,uk,eu',
            'markets': 'h2h',
            'oddsFormat': 'decimal',
            'dateFormat': 'iso'
        }
        
        try:
            response = requests.get(url, params=params)
            matches = response.json()
            
            # Filter for live matches (happening now)
            live_matches = []
            for match in matches:
                commence_time = datetime.fromisoformat(match['commence_time'].replace('Z', '+00:00'))
                time_diff = datetime.now().replace(tzinfo=commence_time.tzinfo) - commence_time
                
                # Consider matches that started in the last 3 hours as live
                if timedelta(hours=0) <= time_diff <= timedelta(hours=3):
                    match['is_live'] = True
                    live_matches.append(match)
            
            return live_matches
        except Exception as e:
            print(f"Exception in get_live_odds: {e}")
            return []
