class ValueBetDetector:
    def __init__(self, threshold=0.05):
        self.threshold = threshold  # Minimum edge required
    
    def detect_value_bets(self, predicted_probabilities, odds):
        """Detect value bets based on predicted probabilities vs odds"""
        value_bets = []
        
        home_odds = odds.get('home_odds')
        away_odds = odds.get('away_odds')
        draw_odds = odds.get('draw_odds')
        
        home_prob = predicted_probabilities.get('home_win_probability', 0)
        away_prob = predicted_probabilities.get('away_win_probability', 0)
        draw_prob = predicted_probabilities.get('draw_probability', 0)
        
        # Calculate expected value for each outcome
        if home_odds and home_prob > 0:
            home_ev = (home_odds - 1) * home_prob - (1 - home_prob)
            home_implied_prob = 1 / home_odds
            home_edge = home_prob - home_implied_prob
            
            if home_edge > self.threshold:
                value_bets.append({
                    'side': 'home',
                    'edge': home_edge,
                    'ev': home_ev,
                    'odds': home_odds,
                    'predicted_probability': home_prob,
                    'implied_probability': home_implied_prob
                })
        
        if away_odds and away_prob > 0:
            away_ev = (away_odds - 1) * away_prob - (1 - away_prob)
            away_implied_prob = 1 / away_odds
            away_edge = away_prob - away_implied_prob
            
            if away_edge > self.threshold:
                value_bets.append({
                    'side': 'away',
                    'edge': away_edge,
                    'ev': away_ev,
                    'odds': away_odds,
                    'predicted_probability': away_prob,
                    'implied_probability': away_implied_prob
                })
        
        if draw_odds and draw_prob > 0:
            draw_ev = (draw_odds - 1) * draw_prob - (1 - draw_prob)
            draw_implied_prob = 1 / draw_odds
            draw_edge = draw_prob - draw_implied_prob
            
            if draw_edge > self.threshold:
                value_bets.append({
                    'side': 'draw',
                    'edge': draw_edge,
                    'ev': draw_ev,
                    'odds': draw_odds,
                    'predicted_probability': draw_prob,
                    'implied_probability': draw_implied_prob
                })
        
        # Return the best value bet
        if value_bets:
            best_bet = max(value_bets, key=lambda x: x['edge'])
            return best_bet
        
        return None
