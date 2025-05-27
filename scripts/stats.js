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

// Function to fetch and update server stats
async function updateServerStats() {
    try {
        const response = await fetch('/api/server-stats');
        const stats = await response.json();
        console.log('Server stats received:', stats); // Debug log
        
        // Update CPU Usage
        const cpuUsage = document.querySelector('.cpu-usage');
        if (cpuUsage) {
            cpuUsage.textContent = stats.cpuUsage ? `${stats.cpuUsage}%` : 'N/A';
        }

        // Update RAM Usage
        const ramUsage = document.querySelector('.ram-usage');
        if (ramUsage && stats.ram) {
            ramUsage.textContent = typeof stats.ram.usage === 'number' ? `${stats.ram.usage}%` : 'N/A';
        }

        // Update CPU Temperature
        const cpuTemp = document.querySelector('.cpu-temp');
        if (cpuTemp) {
            cpuTemp.textContent = stats.cpuTemp ? `${stats.cpuTemp}°C` : 'N/A';
        }
    } catch (error) {
        console.error('Error fetching server stats:', error);
        // Set all values to N/A on error
        const elements = ['.cpu-usage', '.ram-usage', '.cpu-temp'];
        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.textContent = 'N/A';
        });
    }
}

// Update stats every 30 seconds
function initStats() {
    // Initial updates
    updateWeather();
    updateServerStats();

    // Set up periodic updates
    setInterval(updateWeather, 300000); // Update weather every 5 minutes
    setInterval(updateServerStats, 5000); // Update server stats every 5 seconds
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initStats); 