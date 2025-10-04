import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import os

class PredictionEngine:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.team_encoder = LabelEncoder()
        self.league_encoder = LabelEncoder()
        self.model_path = 'backend/ml_models/saved_models/prediction_model.joblib'
        self.is_trained = False
        
    def create_synthetic_training_data(self):
        """Create synthetic training data for demonstration"""
        np.random.seed(42)
        
        teams = ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 
                'Tottenham', 'Newcastle', 'Brighton', 'West Ham', 'Crystal Palace']
        
        leagues = ['EPL', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1']
        
        data = []
        for _ in range(1000):
            home_team = np.random.choice(teams)
            away_team = np.random.choice([t for t in teams if t != home_team])
            league = np.random.choice(leagues)
            
            # Simulate some realistic features
            home_strength = np.random.normal(0.5, 0.2)
            away_strength = np.random.normal(0.5, 0.2)
            
            # Home advantage
            home_advantage = 0.1
            
            # Calculate probabilities
            home_prob = 1 / (1 + np.exp(-(home_strength - away_strength + home_advantage) * 3))
            away_prob = 1 / (1 + np.exp(-(away_strength - home_strength - home_advantage) * 3))
            draw_prob = 1 - (home_prob + away_prob)
            
            # Normalize probabilities
            total = home_prob + away_prob + draw_prob
            home_prob /= total
            away_prob /= total
            draw_prob /= total
            
            # Determine outcome based on probabilities
            outcome = np.random.choice(['home', 'away', 'draw'], p=[home_prob, away_prob, draw_prob])
            
            # Odds based on probabilities with some bookmaker margin
            margin = 1.05  # 5% margin
            home_odds = margin / home_prob if home_prob > 0.05 else 10.0
            away_odds = margin / away_prob if away_prob > 0.05 else 10.0
            draw_odds = margin / draw_prob if draw_prob > 0.05 else 10.0
            
            data.append({
                'home_team': home_team,
                'away_team': away_team,
                'league': league,
                'home_odds': min(home_odds, 20.0),
                'away_odds': min(away_odds, 20.0),
                'draw_odds': min(draw_odds, 20.0),
                'home_strength': max(0.1, min(0.9, home_strength)),
                'away_strength': max(0.1, min(0.9, away_strength)),
                'outcome': outcome
            })
        
        return pd.DataFrame(data)
    
    def train_model(self):
        """Train the prediction model"""
        print("Training prediction model...")
        
        # Create synthetic data for training
        df = self.create_synthetic_training_data()
        
        # Encode categorical variables
        df['home_team_encoded'] = self.team_encoder.fit_transform(df['home_team'])
        df['away_team_encoded'] = self.team_encoder.transform(df['away_team'])
        df['league_encoded'] = self.league_encoder.fit_transform(df['league'])
        
        # Prepare features and target
        features = ['home_team_encoded', 'away_team_encoded', 'league_encoded', 
                   'home_odds', 'away_odds', 'draw_odds', 'home_strength', 'away_strength']
        X = df[features]
        y = df['outcome']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train model
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train_scaled, y_train)
        
        # Calculate training accuracy
        train_accuracy = self.model.score(X_train_scaled, y_train)
        X_test_scaled = self.scaler.transform(X_test)
        test_accuracy = self.model.score(X_test_scaled, y_test)
        
        print(f"Model trained - Train Accuracy: {train_accuracy:.3f}, Test Accuracy: {test_accuracy:.3f}")
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'team_encoder': self.team_encoder,
            'league_encoder': self.league_encoder
        }, self.model_path)
        
        self.is_trained = True
        return True
    
    def load_model(self):
        """Load trained model"""
        try:
            if os.path.exists(self.model_path):
                saved_data = joblib.load(self.model_path)
                self.model = saved_data['model']
                self.scaler = saved_data['scaler']
                self.team_encoder = saved_data['team_encoder']
                self.league_encoder = saved_data['league_encoder']
                self.is_trained = True
                print("Model loaded successfully")
                return True
        except Exception as e:
            print(f"Error loading model: {e}")
        
        return False
    
    def predict_match(self, home_team, away_team, league, home_odds, away_odds, draw_odds):
        """Predict match outcome"""
        if not self.is_trained:
            if not self.load_model():
                self.train_model()
        
        try:
            # Prepare features
            home_team_encoded = self._encode_team(home_team)
            away_team_encoded = self._encode_team(away_team)
            league_encoded = self._encode_league(league)
            
            # Estimate team strengths based on odds
            home_strength = 1 / home_odds if home_odds else 0.3
            away_strength = 1 / away_odds if away_odds else 0.3
            
            features = np.array([[home_team_encoded, away_team_encoded, league_encoded,
                                home_odds, away_odds, draw_odds, home_strength, away_strength]])
            
            # Scale features and predict
            features_scaled = self.scaler.transform(features)
            probabilities = self.model.predict_proba(features_scaled)[0]
            prediction = self.model.predict(features_scaled)[0]
            
            # Map prediction to outcome
            class_mapping = {0: 'home', 1: 'away', 2: 'draw'}
            predicted_outcome = class_mapping.get(np.argmax(probabilities), 'draw')
            
            return {
                'predicted_winner': predicted_outcome,
                'home_win_probability': float(probabilities[0]),
                'away_win_probability': float(probabilities[1]),
                'draw_probability': float(probabilities[2]),
                'confidence': float(np.max(probabilities))
            }
            
        except Exception as e:
            print(f"Prediction error: {e}")
            # Fallback prediction based on odds
            return self._fallback_prediction(home_odds, away_odds, draw_odds)
    
    def _encode_team(self, team_name):
        """Encode team name, adding new teams if necessary"""
        try:
            return self.team_encoder.transform([team_name])[0]
        except ValueError:
            # Team not in training data, add it
            all_teams = list(self.team_encoder.classes_)
            all_teams.append(team_name)
            self.team_encoder.fit(all_teams)
            return self.team_encoder.transform([team_name])[0]
    
    def _encode_league(self, league_name):
        """Encode league name, adding new leagues if necessary"""
        try:
            return self.league_encoder.transform([league_name])[0]
        except ValueError:
            # League not in training data, add it
            all_leagues = list(self.league_encoder.classes_)
            all_leagues.append(league_name)
            self.league_encoder.fit(all_leagues)
            return self.league_encoder.transform([league_name])[0]
    
    def _fallback_prediction(self, home_odds, away_odds, draw_odds):
        """Fallback prediction based on odds"""
        if not all([home_odds, away_odds, draw_odds]):
            return {
                'predicted_winner': 'draw',
                'home_win_probability': 0.33,
                'away_win_probability': 0.33,
                'draw_probability': 0.34,
                'confidence': 0.34
            }
        
        home_prob = 1 / home_odds
        away_prob = 1 / away_odds
        draw_prob = 1 / draw_odds
        
        total = home_prob + away_prob + draw_prob
        home_prob /= total
        away_prob /= total
        draw_prob /= total
        
        max_prob = max(home_prob, away_prob, draw_prob)
        if max_prob == home_prob:
            winner = 'home'
        elif max_prob == away_prob:
            winner = 'away'
        else:
            winner = 'draw'
        
        return {
            'predicted_winner': winner,
            'home_win_probability': float(home_prob),
            'away_win_probability': float(away_prob),
            'draw_probability': float(draw_prob),
            'confidence': float(max_prob)
        }
