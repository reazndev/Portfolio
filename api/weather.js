require('dotenv').config();

async function handler(req, res) {
    try {
        const API_KEY = process.env.OPENWEATHER_API_KEY;
        console.log('Weather API Key available:', !!API_KEY); // Log if API key exists
        
        if (!API_KEY) {
            throw new Error('OpenWeather API key is not set in environment variables');
        }

        const city = 'Zurich'; // You can make this configurable later
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
        
        console.log('Fetching weather data...');
        const response = await fetch(url);
        console.log('Weather API response status:', response.status);
        
        const data = await response.json();
        console.log('Weather data received:', data.cod === 200 ? 'Success' : 'Error');
        
        if (response.ok) {
            res.status(200).json(data);
        } else {
            console.error('Weather API error:', data);
            throw new Error(`Weather API request failed: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Weather API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch weather data', message: error.message });
    }
}

module.exports = handler; 