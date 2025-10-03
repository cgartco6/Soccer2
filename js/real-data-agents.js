// Real Data Integration Agents
class RealDataAgents {
    constructor() {
        this.sources = {
            hollywoodbets: new HollywoodBetsAgent(),
            betway: new BetwayAgent(),
            fbref: new FBRefAgent()
        };
        this.cache = new DataCache();
        this.lastUpdate = null;
    }

    async initialize() {
        console.log('Initializing Real Data Agents...');
        
        try {
            // Initialize all data sources
            await Promise.all([
                this.sources.hollywoodbets.initialize(),
                this.sources.betway.initialize(),
                this.sources.fbref.initialize()
            ]);

            this.logActivity('All real data agents initialized successfully');
            await this.updateAllData();
            
        } catch (error) {
            console.error('Failed to initialize real data agents:', error);
            this.logActivity('Error initializing data agents: ' + error.message);
        }
    }

    async updateAllData() {
        const startTime = Date.now();
        
        try {
            this.logActivity('Updating all real data sources...');
            
            const [hollywoodbetsData, betwayData, fbrefData] = await Promise.all([
                this.sources.hollywoodbets.getLiveMatches(),
                this.sources.betway.getLiveMatches(),
                this.sources.fbref.getLeagueData('Premier League')
            ]);

            // Merge and process data
            const mergedData = this.mergeDataSources(hollywoodbetsData, betwayData, fbrefData);
            const processedData = await this.processRealData(mergedData);
            
            this.cache.set('liveData', processedData);
            this.lastUpdate = new Date();
            
            const updateTime = Date.now() - startTime;
            this.logActivity(`Data updated in ${updateTime}ms - ${processedData.matches.length} matches processed`);
            
            this.updateUIMetrics(processedData, updateTime);
            return processedData;
            
        } catch (error) {
            console.error('Error updating real data:', error);
            this.logActivity('Error updating data: ' + error.message);
            return this.getCachedData();
        }
    }

    mergeDataSources(hbData, bwData, fbData) {
        const matches = [];
        const matchMap = new Map();

        // Merge Hollywoodbets and Betway data
        [...hbData.matches, ...bwData.matches].forEach(match => {
            const key = `${match.home_team}-${match.away_team}`;
            if (!matchMap.has(key)) {
                matchMap.set(key, { ...match, odds: {} });
            }
            
            const existing = matchMap.get(key);
            Object.assign(existing.odds, match.odds);
        });

        // Add FBRef statistics
        matchMap.forEach((match, key) => {
            const stats = this.findFBRefStats(match.home_team, match.away_team, fbData);
            if (stats) {
                match.stats = stats;
            }
            matches.push(match);
        });

        return {
            matches,
            timestamp: new Date().toISOString(),
            sources: {
                hollywoodbets: hbData.matches.length,
                betway: bwData.matches.length,
                fbref: Object.keys(fbData.teams || {}).length
            }
        };
    }

    findFBRefStats(homeTeam, awayTeam, fbData) {
        // Match team names between betting sites and FBRef
        const homeStats = this.findTeamStats(homeTeam, fbData);
        const awayStats = this.findTeamStats(awayTeam, fbData);
        
        if (homeStats && awayStats) {
            return {
                home: homeStats,
                away: awayStats,
                h2h: this.calculateH2HStats(homeStats, awayStats)
            };
        }
        return null;
    }

    findTeamStats(teamName, fbData) {
        // Simple team name matching - in production would use more sophisticated matching
        const normalizedName = this.normalizeTeamName(teamName);
        
        for (const [name, stats] of Object.entries(fbData.teams || {})) {
            if (this.normalizeTeamName(name).includes(normalizedName) || 
                normalizedName.includes(this.normalizeTeamName(name))) {
                return stats;
            }
        }
        return null;
    }

    normalizeTeamName(name) {
        return name.toLowerCase()
            .replace(/fc|cf|sc|afc/g, '')
            .replace(/\s+/g, '')
            .trim();
    }

    calculateH2HStats(homeStats, awayStats) {
        // Calculate head-to-head statistics
        return {
            expected_goals: {
                home: homeStats.expected_goals?.for || 1.8,
                away: awayStats.expected_goals?.for || 1.5
            },
            form: {
                home: homeStats.recent_form || 'WWLWD',
                away: awayStats.recent_form || 'LDWWW'
            },
            strength: {
                attack: (homeStats.attack_strength + awayStats.attack_strength) / 2,
                defense: (homeStats.defense_strength + awayStats.defense_strength) / 2
            }
        };
    }

    async processRealData(mergedData) {
        const processedMatches = await Promise.all(
            mergedData.matches.map(async match => {
                const prediction = await this.calculateRealPrediction(match);
                const valueBets = this.calculateValueBets(match, prediction);
                
                return {
                    ...match,
                    prediction,
                    value_bets: valueBets,
                    processed_at: new Date().toISOString(),
                    data_quality: this.calculateDataQuality(match)
                };
            })
        );

        return {
            ...mergedData,
            matches: processedMatches,
            summary: this.generateSummary(processedMatches)
        };
    }

    async calculateRealPrediction(match) {
        // Use real statistics and odds to calculate predictions
        const stats = match.stats;
        const odds = match.odds;
        
        if (!stats || !odds) {
            return this.getFallbackPrediction(match);
        }

        // Calculate probabilities based on real data
        const probabilities = this.calculateProbabilities(stats, odds);
        const confidence = this.calculateConfidence(stats, odds);
        
        return {
            outcome: this.getMostProbableOutcome(probabilities),
            probabilities,
            confidence,
            recommended_bets: this.generateRecommendations(probabilities, odds, confidence)
        };
    }

    calculateProbabilities(stats, odds) {
        // Convert odds to implied probabilities
        const impliedProbs = this.oddsToProbability(odds);
        
        // Adjust with statistical model
        const statisticalProbs = this.calculateStatisticalProbabilities(stats);
        
        // Blend implied and statistical probabilities
        return this.blendProbabilities(impliedProbs, statisticalProbs);
    }

    oddsToProbability(odds) {
        // Convert decimal odds to probabilities
        const homeProb = 1 / (odds.home_win || 2.0);
        const awayProb = 1 / (odds.away_win || 2.0);
        const drawProb = 1 / (odds.draw || 3.0);
        
        // Normalize to 100%
        const total = homeProb + awayProb + drawProb;
        return {
            home: homeProb / total,
            away: awayProb / total,
            draw: drawProb / total
        };
    }

    calculateStatisticalProbabilities(stats) {
        // Use FBRef statistics to calculate probabilities
        const homeStrength = stats.home.attack_strength * stats.away.defense_strength;
        const awayStrength = stats.away.attack_strength * stats.home.defense_strength;
        
        const totalStrength = homeStrength + awayStrength + 1; // +1 for draw possibility
        
        return {
            home: homeStrength / totalStrength,
            away: awayStrength / totalStrength,
            draw: 1 / totalStrength
        };
    }

    blendProbabilities(implied, statistical, weight = 0.6) {
        // Weighted average of implied and statistical probabilities
        return {
            home: (weight * statistical.home) + ((1 - weight) * implied.home),
            away: (weight * statistical.away) + ((1 - weight) * implied.away),
            draw: (weight * statistical.draw) + ((1 - weight) * implied.draw)
        };
    }

    calculateValueBets(match, prediction) {
        const valueBets = [];
        const probabilities = prediction.probabilities;
        const odds = match.odds;

        // Check for value in each market
        if (odds.home_win && (probabilities.home * odds.home_win) > 1) {
            valueBets.push({
                market: 'Home Win',
                probability: probabilities.home,
                odds: odds.home_win,
                expected_value: (probabilities.home * odds.home_win - 1) * 100,
                bookmaker: this.findBestOdds(odds, 'home_win')
            });
        }

        if (odds.draw && (probabilities.draw * odds.draw) > 1) {
            valueBets.push({
                market: 'Draw',
                probability: probabilities.draw,
                odds: odds.draw,
                expected_value: (probabilities.draw * odds.draw - 1) * 100,
                bookmaker: this.findBestOdds(odds, 'draw')
            });
        }

        if (odds.away_win && (probabilities.away * odds.away_win) > 1) {
            valueBets.push({
                market: 'Away Win',
                probability: probabilities.away,
                odds: odds.away_win,
                expected_value: (probabilities.away * odds.away_win - 1) * 100,
                bookmaker: this.findBestOdds(odds, 'away_win')
            });
        }

        // Check BTTS markets
        if (odds.both_teams_to_score) {
            const bttsProbability = this.calculateBTTSProbability(match.stats);
            if ((bttsProbability * odds.both_teams_to_score) > 1) {
                valueBets.push({
                    market: 'Both Teams to Score',
                    probability: bttsProbability,
                    odds: odds.both_teams_to_score,
                    expected_value: (bttsProbability * odds.both_teams_to_score - 1) * 100,
                    bookmaker: this.findBestOdds(odds, 'both_teams_to_score')
                });
            }
        }

        return valueBets.sort((a, b) => b.expected_value - a.expected_value);
    }

    calculateBTTSProbability(stats) {
        if (!stats) return 0.5;
        
        const homeAttack = stats.home.attack_strength;
        const awayAttack = stats.away.attack_strength;
        const homeDefense = stats.home.defense_strength;
        const awayDefense = stats.away.defense_strength;
        
        // Simple BTTS probability calculation
        return (homeAttack * awayDefense + awayAttack * homeDefense) / 2;
    }

    findBestOdds(odds, market) {
        const bookmakers = [];
        
        if (odds.hollywoodbets && odds.hollywoodbets[market]) {
            bookmakers.push({
                name: 'Hollywoodbets',
                odds: odds.hollywoodbets[market]
            });
        }
        
        if (odds.betway && odds.betway[market]) {
            bookmakers.push({
                name: 'Betway',
                odds: odds.betway[market]
            });
        }

        return bookmakers.sort((a, b) => b.odds - a.odds)[0];
    }

    getCachedData() {
        return this.cache.get('liveData') || { matches: [], sources: {} };
    }

    updateUIMetrics(data, updateTime) {
        // Update UI with real metrics
        document.getElementById('live-matches').textContent = data.matches.length;
        document.getElementById('data-points').textContent = this.countDataPoints(data);
        document.getElementById('update-speed').textContent = `${updateTime}ms`;
        
        // Update source counters
        document.getElementById('hb-matches').textContent = `${data.sources.hollywoodbets || 0} matches`;
        document.getElementById('bw-matches').textContent = `${data.sources.betway || 0} matches`;
        document.getElementById('fb-teams').textContent = `${data.sources.fbref || 0} teams`;
        
        // Update last update time
        document.getElementById('last-update').textContent = 'Just now';
    }

    countDataPoints(data) {
        let count = 0;
        data.matches.forEach(match => {
            count += Object.keys(match.odds || {}).length * 2; // odds from multiple bookmakers
            count += Object.keys(match.stats || {}).length * 10; // statistical data points
        });
        return count;
    }

    calculateDataQuality(match) {
        let score = 0;
        if (match.odds && Object.keys(match.odds).length > 0) score += 50;
        if (match.stats) score += 30;
        if (match.prediction && match.prediction.confidence > 0.7) score += 20;
        return score;
    }

    logActivity(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message };
        
        // Update UI log
        this.updateActivityLog(logEntry);
        console.log(`[RealData] ${timestamp}: ${message}`);
    }

    updateActivityLog(entry) {
        const logContainer = document.getElementById('activityLog');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">${entry.timestamp}</span>
            <span class="log-message">${entry.message}</span>
        `;

        logContainer.prepend(logEntry);
        
        // Keep only last 10 entries
        while (logContainer.children.length > 10) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    getFallbackPrediction(match) {
        // Fallback when real data is unavailable
        return {
            outcome: 'D',
            probabilities: { home: 0.33, away: 0.33, draw: 0.34 },
            confidence: 0.5,
            recommended_bets: ['No strong recommendation - limited data']
        };
    }

    getMostProbableOutcome(probabilities) {
        const { home, away, draw } = probabilities;
        if (home >= away && home >= draw) return 'H';
        if (away >= home && away >= draw) return 'A';
        return 'D';
    }

    calculateConfidence(stats, odds) {
        let confidence = 0.5;
        
        if (stats) confidence += 0.3;
        if (odds && Object.keys(odds).length >= 2) confidence += 0.2;
        
        return Math.min(0.95, confidence);
    }

    generateRecommendations(probabilities, odds, confidence) {
        const recommendations = [];
        const { home, away, draw } = probabilities;

        if (confidence > 0.6) {
            if (home > 0.5) recommendations.push('Home Win');
            else if (away > 0.5) recommendations.push('Away Win');
        }

        if (confidence > 0.5) {
            recommendations.push('Both Teams to Score');
        }

        return recommendations.length > 0 ? recommendations : ['Wait for more data'];
    }

    generateSummary(matches) {
        const valueBets = matches.flatMap(m => m.value_bets || []);
        const profitableBets = valueBets.filter(bet => bet.expected_value > 0);
        
        return {
            total_matches: matches.length,
            value_bets_found: valueBets.length,
            profitable_bets: profitableBets.length,
            avg_expected_value: profitableBets.reduce((sum, bet) => sum + bet.expected_value, 0) / (profitableBets.length || 1),
            data_quality_avg: matches.reduce((sum, m) => sum + (m.data_quality || 0), 0) / matches.length
        };
    }
}

// Hollywoodbets Data Agent
class HollywoodBetsAgent {
    constructor() {
        this.baseURL = 'https://www.hollywoodbets.net';
        this.endpoints = {
            football: '/sportsbook/football',
            live: '/sportsbook/live-now'
        };
        this.isActive = false;
    }

    async initialize() {
        console.log('Initializing Hollywoodbets Agent...');
        this.isActive = true;
        
        // In a real implementation, this would set up proper API connections
        // For demo purposes, we'll simulate the connection
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isActive = true;
                resolve();
            }, 1000);
        });
    }

    async getLiveMatches() {
        if (!this.isActive) {
            throw new Error('Hollywoodbets agent not initialized');
        }

        try {
            // Simulate API call to Hollywoodbets
            const data = await this.simulateHollywoodbetsAPI();
            return {
                matches: data.matches,
                timestamp: new Date().toISOString(),
                source: 'hollywoodbets'
            };
        } catch (error) {
            console.error('Error fetching Hollywoodbets data:', error);
            return { matches: [], timestamp: new Date().toISOString(), source: 'hollywoodbets' };
        }
    }

    async simulateHollywoodbetsAPI() {
        // Simulate real Hollywoodbets data structure
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    matches: [
                        {
                            id: 'hb1',
                            home_team: 'Manchester United',
                            away_team: 'Liverpool',
                            league: 'Premier League',
                            start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                            odds: {
                                home_win: 3.2,
                                draw: 3.4,
                                away_win: 2.1,
                                both_teams_to_score: 1.72
                            },
                            markets: ['match_result', 'both_teams_to_score']
                        },
                        {
                            id: 'hb2',
                            home_team: 'Barcelona',
                            away_team: 'Real Madrid',
                            league: 'La Liga',
                            start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
                            odds: {
                                home_win: 2.4,
                                draw: 3.6,
                                away_win: 2.8,
                                both_teams_to_score: 1.65
                            },
                            markets: ['match_result', 'both_teams_to_score']
                        },
                        {
                            id: 'hb3',
                            home_team: 'Bayern Munich',
                            away_team: 'Borussia Dortmund',
                            league: 'Bundesliga',
                            start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                            odds: {
                                home_win: 1.8,
                                draw: 4.0,
                                away_win: 3.8,
                                both_teams_to_score: 1.58
                            },
                            markets: ['match_result', 'both_teams_to_score']
                        }
                    ]
                });
            }, 800);
        });
    }
}

// Betway Data Agent
class BetwayAgent {
    constructor() {
        this.baseURL = 'https://www.betway.co.za';
        this.endpoints = {
            sports: '/api/sports',
            events: '/api/events'
        };
        this.isActive = false;
    }

    async initialize() {
        console.log('Initializing Betway Agent...');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isActive = true;
                resolve();
            }, 1000);
        });
    }

    async getLiveMatches() {
        if (!this.isActive) {
            throw new Error('Betway agent not initialized');
        }

        try {
            const data = await this.simulateBetwayAPI();
            return {
                matches: data.matches,
                timestamp: new Date().toISOString(),
                source: 'betway'
            };
        } catch (error) {
            console.error('Error fetching Betway data:', error);
            return { matches: [], timestamp: new Date().toISOString(), source: 'betway' };
        }
    }

    async simulateBetwayAPI() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    matches: [
                        {
                            id: 'bw1',
                            home_team: 'Manchester United',
                            away_team: 'Liverpool',
                            league: 'Premier League',
                            start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                            odds: {
                                home_win: 3.1,
                                draw: 3.5,
                                away_win: 2.2,
                                both_teams_to_score: 1.75
                            },
                            markets: ['match_result', 'both_teams_to_score', 'over_under']
                        },
                        {
                            id: 'bw2',
                            home_team: 'AC Milan',
                            away_team: 'Inter Milan',
                            league: 'Serie A',
                            start_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
                            odds: {
                                home_win: 2.7,
                                draw: 3.2,
                                away_win: 2.6,
                                both_teams_to_score: 1.68
                            },
                            markets: ['match_result', 'both_teams_to_score']
                        },
                        {
                            id: 'bw3',
                            home_team: 'Paris Saint-Germain',
                            away_team: 'Marseille',
                            league: 'Ligue 1',
                            start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                            odds: {
                                home_win: 1.6,
                                draw: 4.2,
                                away_win: 4.8,
                                both_teams_to_score: 1.62
                            },
                            markets: ['match_result', 'both_teams_to_score']
                        }
                    ]
                });
            }, 800);
        });
    }
}

// FBRef Data Agent
class FBRefAgent {
    constructor() {
        this.baseURL = 'https://fbref.com';
        this.leagues = {
            'Premier League': '/en/comps/9/Premier-League-Stats',
            'La Liga': '/en/comps/12/La-Liga-Stats',
            'Serie A': '/en/comps/11/Serie-A-Stats',
            'Bundesliga': '/en/comps/20/Bundesliga-Stats',
            'Ligue 1': '/en/comps/13/Ligue-1-Stats'
        };
        this.isActive = false;
    }

    async initialize() {
        console.log('Initializing FBRef Agent...');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isActive = true;
                resolve();
            }, 1500);
        });
    }

    async getLeagueData(leagueName) {
        if (!this.isActive) {
            throw new Error('FBRef agent not initialized');
        }

        try {
            const data = await this.simulateFBRefAPI(leagueName);
            return {
                teams: data.teams,
                timestamp: new Date().toISOString(),
                source: 'fbref',
                league: leagueName
            };
        } catch (error) {
            console.error('Error fetching FBRef data:', error);
            return { teams: {}, timestamp: new Date().toISOString(), source: 'fbref' };
        }
    }

    async simulateFBRefAPI(leagueName) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate FBRef statistical data
                const teams = {
                    'Manchester United': {
                        attack_strength: 0.78,
                        defense_strength: 0.65,
                        expected_goals: { for: 1.92, against: 1.34 },
                        recent_form: 'WDLWW',
                        home_performance: 0.72,
                        away_performance: 0.48
                    },
                    'Liverpool': {
                        attack_strength: 0.85,
                        defense_strength: 0.71,
                        expected_goals: { for: 2.15, against: 1.18 },
                        recent_form: 'WWLDW',
                        home_performance: 0.81,
                        away_performance: 0.63
                    },
                    'Barcelona': {
                        attack_strength: 0.82,
                        defense_strength: 0.68,
                        expected_goals: { for: 2.05, against: 1.22 },
                        recent_form: 'WDWWW',
                        home_performance: 0.85,
                        away_performance: 0.58
                    },
                    'Real Madrid': {
                        attack_strength: 0.79,
                        defense_strength: 0.72,
                        expected_goals: { for: 1.98, against: 1.15 },
                        recent_form: 'WWWDL',
                        home_performance: 0.83,
                        away_performance: 0.61
                    },
                    'Bayern Munich': {
                        attack_strength: 0.88,
                        defense_strength: 0.69,
                        expected_goals: { for: 2.32, against: 1.28 },
                        recent_form: 'WWWWW',
                        home_performance: 0.89,
                        away_performance: 0.72
                    },
                    'Borussia Dortmund': {
                        attack_strength: 0.76,
                        defense_strength: 0.62,
                        expected_goals: { for: 1.85, against: 1.42 },
                        recent_form: 'WLWDW',
                        home_performance: 0.78,
                        away_performance: 0.55
                    }
                };

                resolve({ teams });
            }, 1200);
        });
    }

    async getTeamStats(teamName) {
        const leagueData = await this.getLeagueData('Premier League');
        return leagueData.teams[teamName] || null;
    }
}

// Data Cache System
class DataCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutes TTL
    }

    set(key, value, ttl = this.ttl) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    clear() {
        this.cache.clear();
    }
}

// Global instance
window.realDataAgents = new RealDataAgents();
