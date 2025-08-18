
function formatWPM(wpm) {
    return Math.floor(parseFloat(wpm));
}


function formatAccuracy(accuracy) {
    return `${Math.floor(parseFloat(accuracy))}%`;
}


function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


function showError(container, message) {
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="color: #666; font-style: italic; padding: 1rem;">
                ${message}
            </div>
        `;
    }
}


function showLoading(container) {
    if (container) {
        container.innerHTML = `
            <div class="loading-message" style="color: #666; font-style: italic; padding: 1rem;">
                Loading stats...
            </div>
        `;
    }
}


async function updateMonkeytypeStats(retries = 3, delay = 2000) {
    const personalBestsContainer = document.querySelector('#personal-bests');
    const recentResultsContainer = document.querySelector('#recent-results');

    
    showLoading(personalBestsContainer);
    showLoading(recentResultsContainer);

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`Fetching Monkeytype stats (attempt ${attempt + 1}/${retries})...`);
            const response = await fetch('/api/monkeytype/stats');
            console.log('Server response status:', response.status);
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Server error response:', data);
                
                if (response.status === 503 && attempt < retries - 1) {
                    console.log(`Waiting ${delay/1000} seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(data.details || data.error || 'Failed to fetch Monkeytype stats');
            }

            
            if (personalBestsContainer) {
                console.log('Updating personal bests container...');
                if (!data.personalBests || Object.keys(data.personalBests).length === 0) {
                    console.log('No personal bests data available');
                    showError(personalBestsContainer, 'No personal bests available');
                    return;
                }

                
                const timeTests = Object.entries(data.personalBests)
                    .map(([duration, tests]) => {
                        
                        const bestTest = tests[0]; 
                        return {
                            duration: parseInt(duration),
                            ...bestTest
                        };
                    })
                    .sort((a, b) => b.wpm - a.wpm)
                    .slice(0, 3); 

                if (timeTests.length === 0) {
                    console.log('No time-based personal bests found');
                    showError(personalBestsContainer, 'No time-based personal bests found');
                    return;
                }

                const personalBestsHTML = timeTests
                    .map(test => `
                        <div class="personal-best-item">
                            <div class="pb-mode">${test.duration}s</div>
                            <div class="pb-stats">
                                <span class="pb-wpm">${formatWPM(test.wpm)} WPM</span>
                                <span class="pb-accuracy">${formatAccuracy(test.acc)}</span>
                            </div>
                        </div>
                    `)
                    .join('');

                personalBestsContainer.innerHTML = `
                    <div class="personal-bests-grid">
                        ${personalBestsHTML}
                    </div>
                `;
                console.log('Personal bests updated successfully');
            }

            
            if (recentResultsContainer) {
                console.log('Updating recent results container...');
                const recentResults = Array.isArray(data.recentResults) ? data.recentResults : [];
                
                if (recentResults.length === 0) {
                    console.log('No recent results data available');
                    showError(recentResultsContainer, 'No recent results available');
                    return;
                }

                const recentResultsHTML = recentResults
                    .map(result => `
                        <div class="result-item">
                            <div class="result-main">
                                <span class="result-wpm">${formatWPM(result.wpm)} WPM</span>
                                <span class="result-accuracy">${formatAccuracy(result.acc)}</span>
                            </div>
                            <div class="result-details">
                                <span class="result-date">${formatDate(result.timestamp)}</span>
                            </div>
                        </div>
                    `)
                    .join('');

                recentResultsContainer.innerHTML = `
                    <div class="recent-results-list">
                        ${recentResultsHTML}
                    </div>
                `;
                console.log('Recent results updated successfully');
            }

            
            break;

        } catch (error) {
            console.error('Error updating Monkeytype stats:', error);
            console.error('Error stack:', error.stack);
            
            
            if (attempt === retries - 1) {
                const errorMessage = error.message || 'Failed to load Monkeytype stats';
                showError(personalBestsContainer, `Error loading personal bests: ${errorMessage}`);
                showError(recentResultsContainer, `Error loading recent results: ${errorMessage}`);
            } else {
                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Monkeytype stats...');
    updateMonkeytypeStats();
    setInterval(updateMonkeytypeStats, 5 * 60 * 1000);
}); 