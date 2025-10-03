// Main Application JavaScript
class SoccerPredictorApp {
    constructor() {
        this.api = new SoccerAPI();
        this.currentMatches = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTodayMatches();
        this.loadPredictions();
        this.updateSystemStatus();
    }

    setupEventListeners() {
        // Navigation toggle for mobile
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.filterMatches(filter);
                
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Team search
        const searchBtn = document.getElementById('search-btn');
        const teamSearch = document.getElementById('team-search');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchTeam());
        }
        
        if (teamSearch) {
            teamSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchTeam();
                }
            });
        }

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    async loadTodayMatches() {
        try {
            const matches = await this.api.getTodayMatches();
            this.currentMatches = matches;
            this.displayMatches(matches);
        } catch (error) {
            console.error('Error loading matches:', error);
            this.showError('Failed to load matches. Please try again later.');
        }
    }

    async loadPredictions() {
        try {
            const [winBtts, drawBtts] = await Promise.all([
                this.api.getWinBttsPredictions(),
                this.api.getDrawBttsPredictions()
            ]);
            
            this.displayWinBttsPredictions(winBtts);
            this.displayDrawBttsPredictions(drawBtts);
        } catch (error) {
            console.error('Error loading predictions:', error);
        }
    }

    displayMatches(matches) {
        const container = document.getElementById('matches-container');
        
        if (!matches || matches.length === 0) {
            container.innerHTML = '<div class="loading">No matches found for today.</div>';
            return;
        }

        container.innerHTML = matches.map(match => this.createMatchCard(match)).join('');
    }

    createMatchCard(match) {
        const prediction = match.prediction || 'D';
        const confidence = match.confidence || 0.5;
        const teams = match.home_team && match.away_team ? 
            `${match.home_team} vs ${match.away_team}` : 
            'Team A vs Team B';
        
        let predictionBadge = '';
        let badgeClass = '';
        
        switch (prediction) {
            case 'H':
                predictionBadge = 'Home Win';
                badgeClass = 'badge-home-win';
                break;
            case 'A':
                predictionBadge = 'Away Win';
                badgeClass = 'badge-away-win';
                break;
            default:
                predictionBadge = 'Draw';
                badgeClass = 'badge-draw';
        }

        return `
            <div class="match-card" data-confidence="${confidence}">
                <div class="match-header">
                    <div class="match-teams">
                        <div class="team">
                            <span class="team-name">${match.home_team || 'Home Team'}</span>
                        </div>
                        <div class="vs">VS</div>
                        <div class="team home">
                            <span class="team-name">${match.away_team || 'Away Team'}</span>
                        </div>
                    </div>
                    <div class="match-league">${match.league || 'Premier League'}</div>
                </div>
                
                <div class="match-prediction">
                    <div class="prediction-header">
                        <span class="prediction-badge ${badgeClass}">${predictionBadge}</span>
                        <span class="confidence-score">${Math.round(confidence * 100)}% confidence</span>
                    </div>
                    <div class="confidence-meter">
                        <div class="confidence-level" style="width: ${confidence * 100}%"></div>
                    </div>
                </div>
                
                ${match.recommended_bets && match.recommended_bets.length > 0 ? `
                    <div class="recommended-bets">
                        <strong>Recommended Bets:</strong>
                        <div class="bet-tags">
                            ${match.recommended_bets.map(bet => 
                                `<span class="bet-tag">${bet}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="match-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        ${new Date(match.date).toLocaleDateString()}
                    </div>
                    ${match.venue ? `
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            ${match.venue}
                        </div>
                    ` : ''}
                    ${match.weather ? `
                        <div class="detail-item">
                            <i class="fas fa-cloud"></i>
                            ${match.weather}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    filterMatches(filter) {
        let filteredMatches = this.currentMatches;
        
        switch (filter) {
            case 'high-confidence':
                filteredMatches = this.currentMatches.filter(match => 
                    (match.confidence || 0) > 0.7
                );
                break;
            case 'win-btts':
                filteredMatches = this.currentMatches.filter(match => 
                    match.recommended_bets && 
                    match.recommended_bets.includes('Home Win') &&
                    match.recommended_bets.includes('Both Teams to Score')
                );
                break;
            case 'draw-btts':
                filteredMatches = this.currentMatches.filter(match => 
                    match.prediction === 'D' &&
                    match.recommended_bets && 
                    match.recommended_bets.includes('Both Teams to Score')
                );
                break;
        }
        
        this.displayMatches(filteredMatches);
    }

    displayWinBttsPredictions(predictions) {
        const container = document.getElementById('win-btts-predictions');
        if (!container) return;

        if (!predictions || predictions.length === 0) {
            container.innerHTML = '<p class="no-predictions">No strong predictions available.</p>';
            return;
        }

        container.innerHTML = predictions.map(pred => `
            <div class="prediction-item">
                <div class="prediction-match">${pred.match}</div>
                <div class="prediction-details">
                    <span class="prediction-type">${pred.prediction}</span>
                    <span class="probability">BTTS: ${Math.round(pred.btts_probability * 100)}%</span>
                    <span class="odds">Odds: ${pred.odds}</span>
                </div>
                <div class="confidence">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${pred.confidence * 100}%"></div>
                    </div>
                    <span>${Math.round(pred.confidence * 100)}% confidence</span>
                </div>
            </div>
        `).join('');
    }

    displayDrawBttsPredictions(predictions) {
        const container = document.getElementById('draw-btts-predictions');
        if (!container) return;

        if (!predictions || predictions.length === 0) {
            container.innerHTML = '<p class="no-predictions">No strong predictions available.</p>';
            return;
        }

        container.innerHTML = predictions.map(pred => `
            <div class="prediction-item">
                <div class="prediction-match">${pred.match}</div>
                <div class="prediction-details">
                    <span class="prediction-type">${pred.prediction}</span>
                    <span class="probability">BTTS: ${Math.round(pred.btts_probability * 100)}%</span>
                    <span class="odds">Odds: ${pred.odds}</span>
                </div>
                <div class="confidence">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${pred.confidence * 100}%"></div>
                    </div>
                    <span>${Math.round(pred.confidence * 100)}% confidence</span>
                </div>
            </div>
        `).join('');
    }

    async searchTeam() {
        const searchInput = document.getElementById('team-search');
        const teamName = searchInput.value.trim();
        
        if (!teamName) {
            this.showError('Please enter a team name');
            return;
        }

        try {
            const analytics = await this.api.getTeamAnalytics(teamName);
            this.displayTeamAnalytics(analytics);
        } catch (error) {
            console.error('Error searching team:', error);
            this.showError('Failed to load team analytics.');
        }
    }

    displayTeamAnalytics(analytics) {
        const container = document.getElementById('team-analytics');
        if (!container) return;

        // This would be expanded with charts and detailed analytics
        container.innerHTML = `
            <div class="team-header">
                <h3>${analytics.team_id} - Performance Analytics</h3>
            </div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>Attack Strength</h4>
                    <div class="metric-value">${Math.round(analytics.performance_metrics.attack_strength * 100)}%</div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${analytics.performance_metrics.attack_strength * 100}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <h4>Defense Strength</h4>
                    <div class="metric-value">${Math.round(analytics.performance_metrics.defense_strength * 100)}%</div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${analytics.performance_metrics.defense_strength * 100}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <h4>Home Performance</h4>
                    <div class="metric-value">${Math.round(analytics.performance_metrics.home_performance * 100)}%</div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${analytics.performance_metrics.home_performance * 100}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <h4>Away Performance</h4>
                    <div class="metric-value">${Math.round(analytics.performance_metrics.away_performance * 100)}%</div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${analytics.performance_metrics.away_performance * 100}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    updateSystemStatus() {
        // This would make API calls to get real system status
        // For now, we'll simulate status updates
        setInterval(() => {
            const now = new Date();
            document.getElementById('scraping-status').textContent = '5 minutes ago';
            document.getElementById('training-status').textContent = '2 hours ago';
        }, 60000);
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        console.error('App Error:', message);
        alert(message); // In production, use a better notification system
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SoccerPredictorApp();
});
