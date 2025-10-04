import os
import subprocess
import sys

def install_requirements():
    """Install required packages"""
    print("Installing requirements...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def create_directories():
    """Create necessary directories"""
    directories = [
        'backend/ml_models/saved_models',
        'backend/data_processing',
        'backend/api_integration',
        'config',
        'static',
        'templates'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")

def setup_environment():
    """Create environment file"""
    env_content = """# Sports Analytics Platform - Environment Configuration
# Get your free API keys from:
# - Odds API: https://the-odds-api.com
# - SportsData.io: https://sportsdata.io
# - The Sports API: https://thesportsapi.com

ODDS_API_KEY=your_free_odds_api_key_here
SPORTSDATA_API_KEY=your_sportsdata_key_here
THE_SPORTS_API_KEY=your_sports_api_key_here

# Database
DATABASE_URL=sqlite:///sports_analytics.db
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("Created .env file. Please update with your API keys.")

def main():
    print("Setting up Sports Analytics Platform...")
    
    create_directories()
    install_requirements()
    setup_environment()
    
    print("\n✅ Setup completed successfully!")
    print("\nNext steps:")
    print("1. Edit the .env file with your API keys")
    print("2. Run: python app.py")
    print("3. Open http://localhost:5000 in your browser")
    print("\nFor free API keys:")
    print("- Odds API: https://the-odds-api.com (500 requests/month free)")
    print("- SportsData.io: https://sportsdata.io (free tier available)")
    print("- The Sports API: https://thesportsapi.com (free tier available)")

if __name__ == "__main__":
    main()
