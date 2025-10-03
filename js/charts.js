// Charting and Visualization
class SoccerCharts {
    constructor() {
        this.charts = {};
    }

    initializeCharts() {
        this.createAccuracyChart();
        this.createFeatureImportanceChart();
        this.createPerformanceChart();
    }

    createAccuracyChart() {
        const ctx = document.getElementById('accuracyChart');
        if (!ctx) return;

        this.charts.accuracy = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'Win Prediction Accuracy',
                        data: [82.1, 83.5, 84.2, 85.1, 86.3, 85.8, 86.7, 87.2, 87.3, 87.1, 87.5, 87.8],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'BTTS Prediction Accuracy',
                        data: [75.3, 76.8, 77.5, 78.2, 79.1, 78.7, 79.3, 79.8, 79.2, 79.5, 79.7, 80.1],
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Model Accuracy Over Time'
                    },
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 70,
                        max: 90,
                        title: {
                            display: true,
                            text: 'Accuracy (%)'
                        }
                    }
                }
            }
        });
    }

    createFeatureImportanceChart() {
        const ctx = document.getElementById('featureImportanceChart');
        if (!ctx) return;

        this.charts.featureImportance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [
                    'Team Strength', 
                    'Recent Form', 
                    'Home Advantage', 
                    'H2H Record', 
                    'Player Form',
                    'Coach Impact',
                    'Weather Conditions',
                    'Injury Status'
                ],
                datasets: [{
                    label: 'Feature Importance',
                    data: [24.5, 18.3, 15.2, 12.7, 9.8, 8.4, 6.3, 4.8],
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(52, 73, 94, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(230, 126, 34, 0.8)',
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(149, 165, 166, 0.8)'
                    ],
                    borderColor: [
                        '#3498db',
                        '#2ecc71',
                        '#9b59b6',
                        '#34495e',
                        '#f1c40f',
                        '#e67e22',
                        '#e74c3c',
                        '#95a5a6'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Feature Importance in Predictions'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Importance (%)'
                        }
                    }
                }
            }
        });
    }

    createTeamPerformanceChart(teamData) {
        const ctx = document.getElementById('teamPerformanceChart');
        if (!ctx) return;

        this.charts.teamPerformance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Attack', 'Defense', 'Form', 'Home Performance', 'Away Performance', 'Consistency'],
                datasets: [{
                    label: teamData.name,
                    data: [
                        teamData.metrics.attack_strength * 100,
                        teamData.metrics.defense_strength * 100,
                        teamData.metrics.recent_form * 100,
                        teamData.metrics.home_performance * 100,
                        teamData.metrics.away_performance * 100,
                        teamData.metrics.consistency * 100
                    ],
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: '#3498db',
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }

    createPredictionConfidenceChart(predictions) {
        const ctx = document.getElementById('predictionConfidenceChart');
        if (!ctx) return;

        const confidenceData = predictions.map(p => p.confidence * 100);
        const matchLabels = predictions.map(p => `${p.home_team} vs ${p.away_team}`);

        this.charts.predictionConfidence = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: matchLabels,
                datasets: [{
                    label: 'Prediction Confidence (%)',
                    data: confidenceData,
                    backgroundColor: confidenceData.map(conf => 
                        conf > 75 ? 'rgba(46, 204, 113, 0.8)' : 
                        conf > 60 ? 'rgba(241, 196, 15, 0.8)' : 
                        'rgba(231, 76, 60, 0.8)'
                    ),
                    borderColor: confidenceData.map(conf => 
                        conf > 75 ? '#2ecc71' : 
                        conf > 60 ? '#f1c40f' : 
                        '#e74c3c'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Prediction Confidence Levels'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Confidence (%)'
                        }
                    }
                }
            }
        });
    }

    updateLiveMetrics(metrics) {
        // Update real-time metric displays
        const metricElements = {
            'cpu-usage': metrics.cpuUsage,
            'memory-usage': metrics.memoryUsage,
            'training-progress': metrics.trainingProgress
        };

        Object.entries(metricElements).forEach(([id, value]) => {
            const element = document.querySelector(`[data-metric="${id}"] .metric-fill`);
            if (element) {
                element.style.width = `${value}%`;
            }
        });
    }

    createWinProbabilityChart(probabilities) {
        const ctx = document.getElementById('winProbabilityChart');
        if (!ctx) return;

        this.charts.winProbability = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Home Win', 'Draw', 'Away Win'],
                datasets: [{
                    data: [
                        probabilities.home * 100,
                        probabilities.draw * 100,
                        probabilities.away * 100
                    ],
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(231, 76, 60, 0.8)'
                    ],
                    borderColor: [
                        '#2ecc71',
                        '#f1c40f',
                        '#e74c3c'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.soccerCharts = new SoccerCharts();
    window.soccerCharts.initializeCharts();
});
