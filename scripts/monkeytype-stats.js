// Function to format WPM with no decimals
function formatWPM(wpm) {
    return Math.floor(parseFloat(wpm));
}

// Function to format accuracy as percentage with no decimals
function formatAccuracy(accuracy) {
    return `${Math.floor(parseFloat(accuracy))}%`;
}

// Function to format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to show error message in a container
function showError(container, message) {
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="color: #666; font-style: italic; padding: 1rem;">
                ${message}
            </div>
        `;
    }
}

// Function to update Monkeytype stats
async function updateMonkeytypeStats() {
    const personalBestsContainer = document.querySelector('#personal-bests');
    const recentResultsContainer = document.querySelector('#recent-results');

    try {
        console.log('Fetching Monkeytype stats from server...');
        const response = await fetch('/api/monkeytype/stats');
        console.log('Server response status:', response.status);
        
        const data = await response.json();
        console.log('Server response data:', data);

        if (!response.ok) {
            console.error('Server error response:', data);
            throw new Error(data.details || data.error || 'Failed to fetch Monkeytype stats');
        }

        // Update personal bests section
        if (personalBestsContainer) {
            console.log('Updating personal bests container...');
            if (!data.personalBests || Object.keys(data.personalBests).length === 0) {
                console.log('No personal bests data available');
                showError(personalBestsContainer, 'No personal bests available');
                return;
            }

            // Get all time-based tests (15, 30, 60, etc.)
            const timeTests = Object.entries(data.personalBests)
                .map(([duration, tests]) => {
                    // Get the best test for this duration
                    const bestTest = tests[0]; // Tests are already sorted by WPM
                    return {
                        duration: parseInt(duration),
                        ...bestTest
                    };
                })
                .sort((a, b) => b.wpm - a.wpm)
                .slice(0, 3); // Show top 3 personal bests

            console.log('Sorted personal bests:', timeTests);

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

        // Update recent results section
        if (recentResultsContainer) {
            console.log('Updating recent results container...');
            const recentResults = Array.isArray(data.recentResults) ? data.recentResults : [];
            
            if (recentResults.length === 0) {
                console.log('No recent results data available');
                showError(recentResultsContainer, 'No recent results available');
                return;
            }

            console.log('Recent results:', recentResults);

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

    } catch (error) {
        console.error('Error updating Monkeytype stats:', error);
        console.error('Error stack:', error.stack);
        const errorMessage = error.message || 'Failed to load Monkeytype stats';
        showError(personalBestsContainer, `Error loading personal bests: ${errorMessage}`);
        showError(recentResultsContainer, `Error loading recent results: ${errorMessage}`);
    }
}

// Update stats every 5 minutes
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Monkeytype stats...');
    updateMonkeytypeStats();
    setInterval(updateMonkeytypeStats, 5 * 60 * 1000);
}); 