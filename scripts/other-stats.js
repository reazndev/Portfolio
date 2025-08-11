// Other stats loading functionality
document.addEventListener('DOMContentLoaded', function() {
    loadGitHubStats();
    loadCodingTimeStats();
    loadGamingStats();
});



async function loadCodingTimeStats() {
    const statsBox = document.getElementById('coding-time-box');
    const content = statsBox.querySelector('.stats-box-content');
    
    try {
        
        content.innerHTML = `
            <div class="stats-list">
                <div class="stats-list-item">
                    <span class="stats-label">Weekly Hours:</span>
                    <span class="stats-value">${stats.weeklyHours}h</span>
                </div>
                <div class="stats-list-item">
                    <span class="stats-label">Top Language:</span>
                    <span class="stats-value">${stats.topLanguage}</span>
                </div>
                <div class="stats-list-item">
                    <span class="stats-label">Top Project:</span>
                    <span class="stats-value">${stats.topProject}</span>
                </div>
                <div class="stats-list-item">
                    <span class="stats-label">Daily Average:</span>
                    <span class="stats-value">${stats.averageDailyHours}h</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading coding time stats:', error);
        content.innerHTML = '<div class="stats-item-loading">Error loading coding stats</div>';
    }
}

async function loadGamingStats() {
    const statsBox = document.getElementById('gaming-stats-box');
    const content = statsBox.querySelector('.stats-box-content');
    
    try {

        
        content.innerHTML = `
            <div class="stats-list">
                <div class="stats-list-item">
                    <span class="stats-label">Games Owned:</span>
                    <span class="stats-value">${stats.totalGames}</span>
                </div>
                <div class="stats-list-item">
                    <span class="stats-label">Recently Played:</span>
                    <span class="stats-value">${stats.recentlyPlayed}</span>
                </div>
                <div class="stats-list-item">
                    <span class="stats-label">Achievements:</span>
                    <span class="stats-value">${stats.achievementsUnlocked}</span>
                </div>
                <div class="stats-list-item">
                    <span class="stats-label">Weekly Playtime:</span>
                    <span class="stats-value">${stats.playtimeLastWeek}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading gaming stats:', error);
        content.innerHTML = '<div class="stats-item-loading">Error loading gaming stats</div>';
    }
} 