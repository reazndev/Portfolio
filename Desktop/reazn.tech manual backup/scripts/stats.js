// Function to update weather information
async function updateWeather() {
    try {
        // Fetch weather data using environment variable for API key
        const response = await fetch('/api/weather');
        const data = await response.json();

        // Update the DOM
        document.querySelector('.temperature').textContent = `${Math.round(data.main.temp)}°C`;
        document.querySelector('.condition').textContent = data.weather[0].description;
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.querySelector('.temperature').textContent = '--°C';
        document.querySelector('.condition').textContent = 'Unable to fetch weather';
    }
}

// Function to update server stats
async function updateServerStats() {
    try {
        const response = await fetch('http://localhost:3006/stats');
        const data = await response.json();

        // Update the DOM
        document.querySelector('.cpu-usage').textContent = `${data.cpuUsage}%`;
        document.querySelector('.ram-usage').textContent = `${data.ramUsage}%`;
        document.querySelector('.cpu-temp').textContent = data.cpuTemp === 'N/A' ? '--°C' : `${data.cpuTemp}°C`;
    } catch (error) {
        console.error('Error fetching server stats:', error);
        document.querySelector('.cpu-usage').textContent = '--%';
        document.querySelector('.ram-usage').textContent = '--%';
        document.querySelector('.cpu-temp').textContent = '--°C';
    }
}

// Update stats every 30 seconds
function initStats() {
    // Initial updates
    updateWeather();
    updateServerStats();

    // Set up periodic updates
    setInterval(updateWeather, 300000); // Update weather every 5 minutes
    setInterval(updateServerStats, 30000); // Update server stats every 30 seconds
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initStats); 