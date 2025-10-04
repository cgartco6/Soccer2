import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = 'sqlite:///sports_analytics.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # API Keys (Add your actual keys in .env file)
    ODDS_API_KEY = os.getenv('ODDS_API_KEY', 'your_odds_api_key_here')
    SPORTSDATA_API_KEY = os.getenv('SPORTSDATA_API_KEY', 'your_sportsdata_key_here')
    THE_SPORTS_API_KEY = os.getenv('THE_SPORTS_API_KEY', 'your_sports_api_key_here')
    
    # API Endpoints
    ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4"
    SPORTSDATA_BASE_URL = "https://api.sportsdata.io/v3"
    
    # Update intervals (seconds)
    UPDATE_INTERVAL = 300  # 5 minutes
