
async function updateWeather() {
    try {
        
        const response = await fetch('/api/weather');
        const data = await response.json();

        
        document.querySelector('.temperature').textContent = `${Math.round(data.main.temp)}°C`;
        document.querySelector('.condition').textContent = data.weather[0].description;
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.querySelector('.temperature').textContent = '--°C';
        document.querySelector('.condition').textContent = 'Unable to fetch weather';
    }
}


async function updateServerStats() {
    try {
        const response = await fetch('/api/server-stats');
        const stats = await response.json();
        console.log('Server stats received:', stats); 
        
        
        const cpuUsage = document.querySelector('.cpu-usage');
        if (cpuUsage) {
            cpuUsage.textContent = stats.cpuUsage ? `${stats.cpuUsage}%` : 'N/A';
        }

        
        const ramUsage = document.querySelector('.ram-usage');
        if (ramUsage && stats.ram) {
            ramUsage.textContent = typeof stats.ram.usage === 'number' ? `${stats.ram.usage}%` : 'N/A';
        }

        
        const cpuTemp = document.querySelector('.cpu-temp');
        if (cpuTemp) {
            cpuTemp.textContent = stats.cpuTemp ? `${stats.cpuTemp}°C` : 'N/A';
        }
    } catch (error) {
        console.error('Error fetching server stats:', error);
        
        const elements = ['.cpu-usage', '.ram-usage', '.cpu-temp'];
        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.textContent = 'N/A';
        });
    }
}


function initStats() {
    
    updateWeather();
    updateServerStats();

    
    setInterval(updateWeather, 300000); 
    setInterval(updateServerStats, 5000); 
}


document.addEventListener('DOMContentLoaded', initStats); 