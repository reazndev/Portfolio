require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const os = require('os');
const weatherHandler = require('./api/weather');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files first
app.use(express.static(__dirname));

// API Routes
app.get('/api/weather', weatherHandler);

// Server stats endpoint
app.get('/api/server-stats', (req, res) => {
  try {
    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length; // Convert load average to percentage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ramUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    const cpuTemp = 45; // You might want to implement actual temperature reading based on your system

    res.json({
      cpuUsage: Math.round(cpuUsage),
      ramUsage: Math.round(ramUsage),
      cpuTemp: cpuTemp
    });
  } catch (error) {
    console.error('Error getting server stats:', error);
    res.status(500).json({ error: 'Failed to get server stats' });
  }
});

// Explicitly serve CSS files
app.get('/*.css', (req, res) => {
  res.set('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, req.path));
});

app.get('/styles/*.css', (req, res) => {
  res.set('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, req.path));
});

// Explicitly serve JavaScript files
app.get('/*.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, req.path));
});

// Serve static files from the root directory
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

// Serve static data files
app.use('/data', express.static(path.join(__dirname, 'data')));

// Serve files from the assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Last.fm API proxy endpoint to avoid CORS issues
app.get('/api/lastfm/:method', async (req, res) => {
  try {
    const { method } = req.params;
    const { user, limit } = req.query;
    
    // Use environment variable for API key
    const apiKey = process.env.LASTFM_API_KEY || '974fb2e0a3add0ac42c2729f6c1e854a';
    
    const response = await fetch(
      `http://ws.audioscrobbler.com/2.0/?method=${method}&user=${user}&api_key=${apiKey}&format=json&limit=${limit}`
    );
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching from Last.fm API:', error);
    res.status(500).json({ error: 'Failed to fetch data from Last.fm API' });
  }
});

// New endpoint for last week's tracks
app.get('/api/lastfm/tracks/weekly', async (req, res) => {
  try {
    const apiKey = process.env.LASTFM_API_KEY || '974fb2e0a3add0ac42c2729f6c1e854a';
    const username = 'syntiiix';
    const limit = 200;
    const days = 30; // Changed from 7 to 30 days for monthly stats
    
    const allTracks = [];
    const currentDate = Math.floor(Date.now() / 1000);
    const oneMonthAgo = currentDate - (days * 24 * 60 * 60);
    
    // Fetch up to 10 pages of tracks to get more monthly data
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=user.getRecentTracks&user=${username}&api_key=${apiKey}&format=json&limit=${limit}&page=${page}`
      );
      
      const data = await response.json();
      const tracks = data.recenttracks.track;
      
      if (!tracks || tracks.length === 0) break;
      
      // Filter tracks from the last month
      const filteredTracks = tracks.filter(track => {
        if (track.date && track.date['#text']) {
          const trackDate = Math.floor(new Date(track.date['#text']).getTime() / 1000);
          return trackDate >= oneMonthAgo;
        }
        return false;
      });
      
      allTracks.push(...filteredTracks);
      
      // If we have less tracks than the limit or no tracks from this page are within our date range, we've reached the end
      if (tracks.length < limit || filteredTracks.length === 0) break;
    }
    
    res.json(allTracks);
  } catch (error) {
    console.error('Error fetching monthly tracks:', error);
    res.status(500).json({ error: 'Failed to fetch monthly tracks' });
  }
});

// Add a new endpoint for weekly chart data
app.get('/api/lastfm/tracks/chart', async (req, res) => {
  try {
    const apiKey = process.env.LASTFM_API_KEY || '974fb2e0a3add0ac42c2729f6c1e854a';
    const username = 'syntiiix';
    const limit = 1000; // Get more tracks to ensure we have enough data
    
    const allTracks = [];
    const currentDate = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = currentDate - (7 * 24 * 60 * 60);
    
    // Fetch up to 3 pages of tracks to ensure we get all data from the last 7 days
    for (let page = 1; page <= 3; page++) {
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=user.getRecentTracks&user=${username}&api_key=${apiKey}&format=json&limit=${limit}&page=${page}`
      );
      
      const data = await response.json();
      const tracks = data.recenttracks.track;
      
      if (!tracks || tracks.length === 0) break;
      
      // Filter tracks from the last 7 days
      const filteredTracks = tracks.filter(track => {
        if (track.date && track.date['#text']) {
          const trackDate = Math.floor(new Date(track.date['#text']).getTime() / 1000);
          return trackDate >= sevenDaysAgo;
        }
        return false;
      });
      
      allTracks.push(...filteredTracks);
      
      // If we have tracks older than 7 days, we can stop
      const oldestTrackInBatch = tracks[tracks.length - 1];
      if (oldestTrackInBatch.date && oldestTrackInBatch.date['#text']) {
        const oldestDate = Math.floor(new Date(oldestTrackInBatch.date['#text']).getTime() / 1000);
        if (oldestDate < sevenDaysAgo) break;
      }
    }
    
    // Group tracks by day
    const dailyCounts = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize all 7 days with 0 counts
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      dailyCounts[dayName] = 0;
    }
    
    // Count tracks for each day
    allTracks.forEach(track => {
      if (track.date && track.date['#text']) {
        const trackDate = new Date(track.date['#text']);
        const dayName = days[trackDate.getDay()];
        dailyCounts[dayName]++;
      }
    });
    
    // Convert to array format for the chart
    const chartData = Object.entries(dailyCounts).map(([day, count]) => ({
      day,
      count
    }));
    
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Environment variables for Heroku
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '974fb2e0a3add0ac42c2729f6c1e854a';
const LASTFM_USER = process.env.LASTFM_USER || 'syntiiix';

// Last.fm top stats endpoint - Heroku optimized
app.get('/api/lastfm/top', async (req, res) => {
  try {
    const period = req.query.period || '7day';
    
    // Heroku-friendly fetch with timeout
    const fetchWithTimeout = async (url, timeout = 8000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };
    
    // Process API responses with better error handling
    let artistsData = [], tracksData = [], albumsData = [];
    
    try {
      const artistsResponse = await fetchWithTimeout(
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${LASTFM_USER}&period=${period}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
      );
      
      if (artistsResponse.ok) {
        const artists = await artistsResponse.json();
        if (artists.topartists && artists.topartists.artist) {
          artistsData = artists.topartists.artist.map(artist => ({
            name: artist.name,
            playcount: artist.playcount,
            image: artist.image[3]['#text'] || artist.image[2]['#text'] || null
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching top artists:', e);
    }
    
    try {
      const tracksResponse = await fetchWithTimeout(
        `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${LASTFM_USER}&period=${period}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
      );
      
      if (tracksResponse.ok) {
        const tracks = await tracksResponse.json();
        if (tracks.toptracks && tracks.toptracks.track) {
          tracksData = tracks.toptracks.track.map(track => ({
            name: track.name,
            artist: track.artist.name,
            playcount: track.playcount,
            image: track.image[3]['#text'] || track.image[2]['#text'] || null
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching top tracks:', e);
    }
    
    try {
      const albumsResponse = await fetchWithTimeout(
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${LASTFM_USER}&period=${period}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
      );
      
      if (albumsResponse.ok) {
        const albums = await albumsResponse.json();
        if (albums.topalbums && albums.topalbums.album) {
          albumsData = albums.topalbums.album.map(album => ({
            name: album.name,
            artist: album.artist.name,
            playcount: album.playcount,
            image: album.image[3]['#text'] || album.image[2]['#text'] || null
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching top albums:', e);
    }
    
    const topData = {
      topArtists: artistsData,
      topTracks: tracksData,
      topAlbums: albumsData
    };
    
    res.json(topData);
  } catch (error) {
    console.error('Error fetching Last.fm data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Last.fm data', 
      details: error.message,
      note: 'If deploying to Heroku, make sure to set LASTFM_API_KEY and LASTFM_USER environment variables' 
    });
  }
});

// Updated test endpoint to use HTTPS and add more logging
app.get('/api/lastfm/test', async (req, res) => {
  try {
    console.log('Testing Last.fm API connection...');
    console.log(`Using API key: ${LASTFM_API_KEY.slice(0, 4)}...${LASTFM_API_KEY.slice(-4)}`);
    console.log(`Using username: ${LASTFM_USER}`);
    
    // Use HTTPS and the same timeout handling as the main endpoint
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Last.fm API returned error status:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Last.fm API error', 
        status: response.status,
        message: errorText
      });
    }
    
    const data = await response.json();
    console.log('Last.fm API test successful');
    res.json(data);
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({ error: 'Test API failed', details: error.message });
  }
});

// Add a debug endpoint to verify environment settings (password protected for security)
app.get('/api/debug/config', (req, res) => {
  const debugPassword = req.query.key;
  
  // Simple security check - you should use a proper auth system in production
  if (debugPassword !== 'your-temp-debug-password') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Return information about the environment without exposing the full API key
  res.json({
    environment: process.env.NODE_ENV || 'development',
    lastfm_user: LASTFM_USER,
    lastfm_api_key_preview: LASTFM_API_KEY ? `${LASTFM_API_KEY.slice(0, 4)}...${LASTFM_API_KEY.slice(-4)}` : 'not set',
    has_api_key: !!LASTFM_API_KEY,
    port: port,
    node_version: process.version,
    memory_usage: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 