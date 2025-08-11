// Language color mapping
const languageColors = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    HTML: '#e34c26',
    CSS: '#563d7c',
    'C#': '#178600',
    Java: '#b07219',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Vue: '#41b883',
    React: '#61dafb',
    'C++': '#f34b7d',
    C: '#555555',
    Shell: '#89e051',
    PowerShell: '#012456',
    Docker: '#384d54',
    Markdown: '#083fa1',
    JSON: '#292929',
    YAML: '#cb171e',
    SQL: '#e38c00',
    'Jupyter Notebook': '#DA5B0B',
    Other: '#333333'
};

// Function to get color for a language
function getLanguageColor(language) {
    return languageColors[language] || languageColors.Other;
}

// Function to format time duration
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) {
        return '0h 0m';
    }
    // Convert seconds to hours and minutes
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// Function to format percentage
function formatPercentage(decimal) {
    return `${(decimal * 100).toFixed(1)}%`;
}

// Function to update WakaTime stats
async function updateWakaTimeStats() {
    try {
        const response = await fetch('/api/wakatime/stats');
        const data = await response.json();
        const stats = data.data;

        // Update total time for last 7 days
        const totalTime = document.querySelector('#total-coding-time');
        if (totalTime) {
            totalTime.textContent = formatTime(stats.total_seconds);
        }

        // Update all-time statsasdfasdfasdfasdfasdf
        const allTimeStats = document.querySelector('#all-time-stats');
        if (allTimeStats) {
            allTimeStats.textContent = formatTime(stats.all_time_seconds);
        }

        // Calculate and update daily average based on last 7 days
        const dailyAverageSeconds = stats.total_seconds / 7;
        const dailyAverageStats = document.querySelector('#daily-average-stats');
        if (dailyAverageStats) {
            dailyAverageStats.textContent = formatTime(dailyAverageSeconds);
        }

        // Update languages with hours (show all languages with more than 1 hour)
        const languagesContainer = document.querySelector('#language-stats');
        if (languagesContainer && stats.languages) {
            // Filter languages with more than 1 hour of usage
            const filteredLanguages = stats.languages.filter(lang => lang.total_seconds >= 3600);
            
            // Recalculate percentages based on filtered languages
            const totalSeconds = filteredLanguages.reduce((sum, lang) => sum + lang.total_seconds, 0);
            const languagesWithNewPercentages = filteredLanguages.map(lang => ({
                ...lang,
                percent: (lang.total_seconds / totalSeconds) * 100
            }));

            const languagesHTML = languagesWithNewPercentages
                .map(lang => {
                    const hours = (lang.total_seconds / 3600).toFixed(1);
                    const color = getLanguageColor(lang.name);
                    return `
                        <div class="language-item">
                            <div class="language-info">
                                <span class="language-name">${lang.name}</span>
                                <span class="language-hours">${hours}h</span>
                            </div>
                            <div class="language-bar-container">
                                <div class="language-bar" style="width: ${lang.percent.toFixed(1)}%; background-color: ${color}"></div>
                            </div>
                            <span class="language-percentage">${formatPercentage(lang.percent / 100)}</span>
                        </div>
                    `;
                })
                .join('');
            languagesContainer.innerHTML = languagesHTML;
        }
    } catch (error) {
        console.error('Error updating WakaTime stats:', error);
    }
}

// Update stats every 5 minutes
document.addEventListener('DOMContentLoaded', () => {
    updateWakaTimeStats();
    setInterval(updateWakaTimeStats, 5 * 60 * 1000);
}); 