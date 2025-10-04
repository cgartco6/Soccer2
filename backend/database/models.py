from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Match(db.Model):
    __tablename__ = 'matches'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.String(100), unique=True, nullable=False)
    sport_key = db.Column(db.String(50), nullable=False)
    sport_title = db.Column(db.String(100), nullable=False)
    home_team = db.Column(db.String(200), nullable=False)
    away_team = db.Column(db.String(200), nullable=False)
    commence_time = db.Column(db.DateTime, nullable=False)
    league = db.Column(db.String(150))
    
    # Odds data
    home_odds = db.Column(db.Float)
    away_odds = db.Column(db.Float)
    draw_odds = db.Column(db.Float)
    
    # AI Predictions
    predicted_winner = db.Column(db.String(200))
    home_win_probability = db.Column(db.Float)
    away_win_probability = db.Column(db.Float)
    draw_probability = db.Column(db.Float)
    confidence = db.Column(db.Float)
    value_bet_detected = db.Column(db.Boolean, default=False)
    value_bet_side = db.Column(db.String(50))
    
    # Live data
    is_live = db.Column(db.Boolean, default=False)
    home_score = db.Column(db.Integer, default=0)
    away_score = db.Column(db.Integer, default=0)
    match_status = db.Column(db.String(50))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'sport_key': self.sport_key,
            'sport_title': self.sport_title,
            'home_team': self.home_team,
            'away_team': self.away_team,
            'commence_time': self.commence_time.isoformat() if self.commence_time else None,
            'league': self.league,
            'home_odds': self.home_odds,
            'away_odds': self.away_odds,
            'draw_odds': self.draw_odds,
            'predicted_winner': self.predicted_winner,
            'home_win_probability': self.home_win_probability,
            'away_win_probability': self.away_win_probability,
            'draw_probability': self.draw_probability,
            'confidence': self.confidence,
            'value_bet_detected': self.value_bet_detected,
            'value_bet_side': self.value_bet_side,
            'is_live': self.is_live,
            'home_score': self.home_score,
            'away_score': self.away_score,
            'match_status': self.match_status
        }
