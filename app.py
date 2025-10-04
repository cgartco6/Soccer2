from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from backend.database.models import db, Match
from backend.api_integration.odds_api_client import OddsAPIClient
from backend.api_integration.sportsdata_client import SportsDataClient
from backend.ml_models.prediction_engine import PredictionEngine
from backend.data_processing.value_bet_detector import ValueBetDetector
from config.settings import Config
from datetime import datetime, timedelta
import schedule
import time
import threading

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize database
db.init_app(app)

# Initialize components
odds_client = OddsAPIClient()
sportsdata_client = SportsDataClient()
prediction_engine = PredictionEngine()
value_detector = ValueBetDetector()

def init_database():
    with app.app_context():
        db.create_all()
        print("Database initialized")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/matches')
def get_matches():
    """Get all matches with predictions"""
    try:
        # Get query parameters
        sport = request.args.get('sport', 'soccer')
        show_live = request.args.get('live', 'false').lower() == 'true'
        
        query = Match.query
        
        if sport != 'all':
            query = query.filter(Match.sport_key == sport)
        
        if show_live:
            query = query.filter(Match.is_live == True)
        
        matches = query.order_by(Match.commence_time).all()
        
        return jsonify({
            'success': True,
            'matches': [match.to_dict() for match in matches],
            'count': len(matches)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/matches/update')
def update_matches():
    """Update matches from APIs"""
    try:
        matches_updated = fetch_and_process_matches()
        return jsonify({
            'success': True,
            'message': f'Updated {matches_updated} matches',
            'matches_updated': matches_updated
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/predict/custom', methods=['POST'])
def predict_custom_match():
    """Predict custom match"""
    try:
        data = request.get_json()
        
        home_team = data.get('home_team')
        away_team = data.get('away_team')
        league = data.get('league', 'Unknown')
        home_odds = float(data.get('home_odds', 2.0))
        away_odds = float(data.get('away_odds', 2.0))
        draw_odds = float(data.get('draw_odds', 3.0))
        
        if not home_team or not away_team:
            return jsonify({'success': False, 'error': 'Home and away team required'}), 400
        
        # Get prediction
        prediction = prediction_engine.predict_match(
            home_team, away_team, league, home_odds, away_odds, draw_odds
        )
        
        # Check for value bets
        value_bet = value_detector.detect_value_bets(prediction, {
            'home_odds': home_odds,
            'away_odds': away_odds,
            'draw_odds': draw_odds
        })
        
        result = {
            'success': True,
            'prediction': prediction,
            'value_bet': value_bet,
            'teams': {
                'home': home_team,
                'away': away_team
            }
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/live/update')
def update_live_matches():
    """Update live match data"""
    try:
        updated_count = update_live_scores()
        return jsonify({
            'success': True,
            'message': f'Updated {updated_count} live matches',
            'updated_count': updated_count
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sports')
def get_sports():
    """Get available sports"""
    try:
        sports = odds_client.get_sports()
        return jsonify({
            'success': True,
            'sports': sports
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def fetch_and_process_matches():
    """Fetch matches from APIs and process them"""
    matches_processed = 0
    
    try:
        # Get odds from Odds API
        soccer_matches = odds_client.get_odds('soccer_epl')
        # Add more sports as needed
        # basketball_matches = odds_client.get_odds('basketball_nba')
        
        all_matches = soccer_matches  # + basketball_matches
        
        for match_data in all_matches:
            try:
                process_single_match(match_data)
                matches_processed += 1
            except Exception as e:
                print(f"Error processing match: {e}")
                continue
                
    except Exception as e:
        print(f"Error fetching matches: {e}")
    
    print(f"Processed {matches_processed} matches")
    return matches_processed

def process_single_match(match_data):
    """Process a single match and save to database"""
    # Extract match information
    match_id = match_data.get('id')
    sport_key = match_data.get('sport_key')
    sport_title = match_data.get('sport_title')
    home_team = match_data.get('home_team')
    away_team = match_data.get('away_team')
    commence_time = datetime.fromisoformat(match_data['commence_time'].replace('Z', '+00:00'))
    
    # Extract odds
    home_odds, away_odds, draw_odds = extract_odds(match_data)
    
    # Check if match exists
    existing_match = Match.query.filter_by(match_id=match_id).first()
    
    if existing_match:
        # Update existing match
        match = existing_match
    else:
        # Create new match
        match = Match(match_id=match_id)
    
    # Update match data
    match.sport_key = sport_key
    match.sport_title = sport_title
    match.home_team = home_team
    match.away_team = away_team
    match.commence_time = commence_time
    match.home_odds = home_odds
    match.away_odds = away_odds
    match.draw_odds = draw_odds
    match.league = match_data.get('league', 'Unknown')
    
    # Get AI prediction
    prediction = prediction_engine.predict_match(
        home_team, away_team, match.league, home_odds, away_odds, draw_odds
    )
    
    match.predicted_winner = prediction['predicted_winner']
    match.home_win_probability = prediction['home_win_probability']
    match.away_win_probability = prediction['away_win_probability']
    match.draw_probability = prediction['draw_probability']
    match.confidence = prediction['confidence']
    
    # Check for value bets
    value_bet = value_detector.detect_value_bets(prediction, {
        'home_odds': home_odds,
        'away_odds': away_odds,
        'draw_odds': draw_odds
    })
    
    match.value_bet_detected = value_bet is not None
    match.value_bet_side = value_bet['side'] if value_bet else None
    
    # Check if match is live
    time_diff = datetime.now().replace(tzinfo=commence_time.tzinfo) - commence_time
    match.is_live = timedelta(hours=0) <= time_diff <= timedelta(hours=3)
    
    if not existing_match:
        db.session.add(match)
    
    db.session.commit()

def extract_odds(match_data):
    """Extract the best odds from bookmakers"""
    home_odds = None
    away_odds = None
    draw_odds = None
    
    if 'bookmakers' in match_data:
        for bookmaker in match_data['bookmakers']:
            for market in bookmaker['markets']:
                if market['key'] == 'h2h':
                    for outcome in market['outcomes']:
                        if outcome['name'] == match_data['home_team']:
                            home_odds = outcome['price']
                        elif outcome['name'] == match_data['away_team']:
                            away_odds = outcome['price']
                        elif outcome['name'] == 'Draw':
                            draw_odds = outcome['price']
    
    return home_odds, away_odds, draw_odds

def update_live_scores():
    """Update live scores for matches"""
    updated_count = 0
    
    try:
        # Get live matches from database
        live_matches = Match.query.filter(Match.is_live == True).all()
        
        for match in live_matches:
            # In a real implementation, you would fetch actual live data
            # For now, we'll simulate live updates
            if match.is_live:
                # Simulate score changes (remove this in production)
                if datetime.utcnow().minute % 5 == 0:  # Change every 5 minutes for demo
                    match.home_score += 1 if match.home_score < 5 else 0
                    match.away_score += 1 if match.away_score < 5 else 0
                    match.match_status = "In Progress"
                    db.session.commit()
                    updated_count += 1
    
    except Exception as e:
        print(f"Error updating live scores: {e}")
    
    return updated_count

def schedule_updates():
    """Schedule background updates"""
    schedule.every(5).minutes.do(fetch_and_process_matches)
    schedule.every(1).minutes.do(update_live_scores)
    
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == '__main__':
    init_database()
    
    # Start background scheduler in a separate thread
    scheduler_thread = threading.Thread(target=schedule_updates, daemon=True)
    scheduler_thread.start()
    
    # Initial data fetch
    fetch_and_process_matches()
    
    print("Starting Sports Analytics Platform...")
    app.run(debug=True, host='0.0.0.0', port=5000)
