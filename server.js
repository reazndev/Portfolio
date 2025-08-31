#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const os = require('os');
const weatherHandler = require('./api/weather');

const app = express();
const port = process.env.PORT || 3000;

// Cache for Monkeytype stats
let monkeytypeCache = {
  data: null,
  lastUpdated: 0,
  isInitializing: false
};

// Function to fetch Monkeytype stats
async function fetchMonkeytypeStats() {
  try {
    const apiKey = process.env.MONKEYTYPE_API_KEY;
    if (!apiKey) {
      throw new Error('Monkeytype API key not found');
    }

    const baseUrl = 'https://api.monkeytype.com';

    // Fetch personal bests
    const personalBestsResponse = await fetch(`${baseUrl}/users/personalBests?mode=time`, {
      headers: {
        'Authorization': `ApeKey ${apiKey}`
      }
    });

    const recentResultsResponse = await fetch(`${baseUrl}/results?limit=7`, {
      headers: {
        'Authorization': `ApeKey ${apiKey}`
      }
    });

    if (!personalBestsResponse.ok) {
      throw new Error(`Monkeytype API error for personal bests: ${personalBestsResponse.status}`);
    }
    if (!recentResultsResponse.ok) {
      throw new Error(`Monkeytype API error for recent results: ${recentResultsResponse.status}`);
    }

    const personalBests = await personalBestsResponse.json();
    const recentResults = await recentResultsResponse.json();

    const formattedResults = recentResults.data.map(result => ({
      wpm: Math.floor(result.wpm),
      acc: Math.floor(result.acc),
      mode: `${result.mode}${result.mode2}`,
      timestamp: result.timestamp,
      consistency: Math.floor(result.consistency),
      time: Math.floor(result.testDuration)
    }));

    const formattedPersonalBests = {};
    for (const [mode, results] of Object.entries(personalBests.data)) {
      formattedPersonalBests[mode] = results.map(pb => ({
        wpm: Math.floor(pb.wpm),
        acc: Math.floor(pb.acc),
        timestamp: pb.timestamp
      })).slice(0, 3); 
    }

    return {
      personalBests: formattedPersonalBests,
      recentResults: formattedResults
    };
  } catch (error) {
    console.error('Error fetching Monkeytype stats:', error);
    throw error; 
  }
}

setInterval(async () => {
  try {
    console.log('Updating Monkeytype cache...');
    const newData = await fetchMonkeytypeStats();
    monkeytypeCache.data = newData;
    monkeytypeCache.lastUpdated = Date.now();
    console.log('Monkeytype cache updated successfully');
  } catch (error) {
    console.error('Failed to update Monkeytype cache:', error);
  }
}, 5 * 60 * 1000); // 5 minutes in milliseconds

async function initializeCache(retries = 3, delay = 5000) {
  if (monkeytypeCache.isInitializing) return;
  monkeytypeCache.isInitializing = true;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to populate Monkeytype cache (attempt ${i + 1}/${retries})...`);
      const initialData = await fetchMonkeytypeStats();
      monkeytypeCache.data = initialData;
      monkeytypeCache.lastUpdated = Date.now();
      console.log('Initial Monkeytype cache populated successfully');
      return;
    } catch (error) {
      console.error(`Failed to populate cache (attempt ${i + 1}):`, error);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

initializeCache();

app.use(express.static(__dirname));

app.get('/api/weather', weatherHandler);

app.get('/api/github-contributions/:username', async (req, res) => {
    try {
        const baseUrl = `http://localhost:3003/contributions/${req.params.username}`;
        const queryParams = new URLSearchParams(req.query).toString();
        const fullUrl = queryParams ? `${baseUrl}?${queryParams}` : baseUrl;
        
        console.log('Fetching GitHub contributions from:', fullUrl);
        
        const response = await fetch(fullUrl);
        console.log('GitHub API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`GitHub contributions server responded with ${response.status}`);
        }
        
        const data = await response.text();
        console.log('Received data type:', typeof data); 
        console.log('Data starts with:', data.substring(0, 100));
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(data);
    } catch (error) {
        console.error('Error proxying GitHub contributions:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub contributions' });
    }
});

app.get('/api/server-stats', async (req, res) => {
    try {
        const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const ramUsage = (usedMem / totalMem) * 100;

        let cpuTemp;
        try {
            const { exec } = require('child_process');
            const temp = await new Promise((resolve, reject) => {
                exec('cat /sys/class/thermal/thermal_zone0/temp', (error, stdout) => {
                    if (error) {
                        resolve(null);
                        return;
                    }
                    resolve(parseInt(stdout) / 1000);
                });
            });
            cpuTemp = temp || 'N/A';
        } catch (error) {
            cpuTemp = 'N/A';
        }

        const stats = {
            cpuUsage: Math.round(cpuUsage * 10) / 10,
            ram: {
                usage: Math.round(ramUsage * 10) / 10,
                total: formatBytes(totalMem),
                used: formatBytes(usedMem),
                free: formatBytes(freeMem)
            },
            cpuTemp: typeof cpuTemp === 'number' ? Math.round(cpuTemp * 10) / 10 : cpuTemp,
            platform: process.platform,
            uptime: Math.floor(os.uptime() / 3600),
            loadAverage: {
                '1min': Math.round(os.loadavg()[0] * 10) / 10,
                '5min': Math.round(os.loadavg()[1] * 10) / 10,
                '15min': Math.round(os.loadavg()[2] * 10) / 10
            },
            timestamp: new Date().toISOString()
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting server stats:', error);
        res.status(500).json({ error: 'Failed to get server stats' });
    }
});

function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

app.get('/api/lastfm/:method', async (req, res) => {
  try {
    const { method } = req.params;
    const { user, limit } = req.query;
    
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

app.get('/api/lastfm/tracks/weekly', async (req, res) => {
  try {
    const apiKey = process.env.LASTFM_API_KEY || '974fb2e0a3add0ac42c2729f6c1e854a';
    const username = 'syntiiix';
    const limit = 200;
    const days = 30; 
    
    const allTracks = [];
    const currentDate = Math.floor(Date.now() / 1000);
    const oneMonthAgo = currentDate - (days * 24 * 60 * 60);
    
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=user.getRecentTracks&user=${username}&api_key=${apiKey}&format=json&limit=${limit}&page=${page}`
      );
      
      const data = await response.json();
      const tracks = data.recenttracks.track;
      
      if (!tracks || tracks.length === 0) break;
      
      const filteredTracks = tracks.filter(track => {
        if (track.date && track.date['#text']) {
          const trackDate = Math.floor(new Date(track.date['#text']).getTime() / 1000);
          return trackDate >= oneMonthAgo;
        }
        return false;
      });
      
      allTracks.push(...filteredTracks);
      
      if (tracks.length < limit || filteredTracks.length === 0) break;
    }
    
    res.json(allTracks);
  } catch (error) {
    console.error('Error fetching monthly tracks:', error);
    res.status(500).json({ error: 'Failed to fetch monthly tracks' });
  }
});

app.get('/api/lastfm/tracks/chart', async (req, res) => {
  try {
    const apiKey = process.env.LASTFM_API_KEY || '974fb2e0a3add0ac42c2729f6c1e854a'; // lastfm API keys are 100% free so I dont bother putting them in the .env
    const username = 'syntiiix';
    const limit = 1000; 
    
    const allTracks = [];
    const currentDate = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = currentDate - (7 * 24 * 60 * 60);
    
    for (let page = 1; page <= 3; page++) {
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=user.getRecentTracks&user=${username}&api_key=${apiKey}&format=json&limit=${limit}&page=${page}`
      );
      
      const data = await response.json();
      const tracks = data.recenttracks.track;
      
      if (!tracks || tracks.length === 0) break;
      
      const filteredTracks = tracks.filter(track => {
        if (track.date && track.date['#text']) {
          const trackDate = Math.floor(new Date(track.date['#text']).getTime() / 1000);
          return trackDate >= sevenDaysAgo;
        }
        return false;
      });
      
      allTracks.push(...filteredTracks);
      
      const oldestTrackInBatch = tracks[tracks.length - 1];
      if (oldestTrackInBatch.date && oldestTrackInBatch.date['#text']) {
        const oldestDate = Math.floor(new Date(oldestTrackInBatch.date['#text']).getTime() / 1000);
        if (oldestDate < sevenDaysAgo) break;
      }
    }
    
    const dailyCounts = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      dailyCounts[dayName] = 0;
    }
    
    allTracks.forEach(track => {
      if (track.date && track.date['#text']) {
        const trackDate = new Date(track.date['#text']);
        const dayName = days[trackDate.getDay()];
        dailyCounts[dayName]++;
      }
    });
    
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

app.get('/api/lastfm/top', async (req, res) => {
  try {
    const period = req.query.period || '7day';
    
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

app.get('/api/debug/config', (req, res) => {
  const debugPassword = req.query.key;
  
  if (debugPassword !== 'your-temp-debug-password') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
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

app.get('/api/wakatime/stats', async (req, res) => {
  try {
    const apiKey = process.env.WAKATIME_API_KEY;
    if (!apiKey) {
      throw new Error('WakaTime API key not found');
    }

    // Fetch all-time stats
    const allTimeResponse = await fetch('https://wakatime.com/api/v1/users/current/stats/all_time', {
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`
      }
    });

    const weeklyResponse = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`
      }
    });

    if (!allTimeResponse.ok || !weeklyResponse.ok) {
      throw new Error(`WakaTime API error: ${allTimeResponse.status} / ${weeklyResponse.status}`);
    }

    const allTimeData = await allTimeResponse.json();
    const weeklyData = await weeklyResponse.json();

    const weeklySeconds = weeklyData.data.total_seconds || 0;
    const dailyAverageSeconds = Math.round(weeklySeconds / 7);

    const combinedData = {
      data: {
        ...weeklyData.data,
        all_time_seconds: allTimeData.data.total_seconds || 0,
        languages: allTimeData.data.languages || [],
        daily_average_seconds: dailyAverageSeconds,
        total_seconds: weeklySeconds
      }
    };

    res.json(combinedData);
  } catch (error) {
    console.error('Error fetching WakaTime stats:', error);
    res.status(500).json({ error: 'Failed to fetch WakaTime stats' });
  }
});

app.get('/api/wakatime/languages', async (req, res) => {
  try {
    const apiKey = process.env.WAKATIME_API_KEY;
    if (!apiKey) {
      throw new Error('WakaTime API key not found');
    }

    const response = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`WakaTime API error: ${response.status}`);
    }

    const data = await response.json();
    const languages = data.data.languages.slice(0, 5); // Get top 5 languages
    res.json(languages);
  } catch (error) {
    console.error('Error fetching WakaTime languages:', error);
    res.status(500).json({ error: 'Failed to fetch WakaTime languages' });
  }
});

app.get('/api/monkeytype/stats', async (req, res) => {
  try {
    // If cache is empty, try to populate it
    if (!monkeytypeCache.data && !monkeytypeCache.isInitializing) {
      await initializeCache();
    }

    if (!monkeytypeCache.data) {
      return res.status(503).json({ 
        error: 'Monkeytype stats temporarily unavailable', 
        details: 'Cache is being populated, please try again in a few seconds'
      });
    }

    res.json(monkeytypeCache.data);
  } catch (error) {
    console.error('Error serving Monkeytype stats:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve Monkeytype stats', 
      details: error.message 
    });
  }
});

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

app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

app.use('/data', express.static(path.join(__dirname, 'data')));

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// THIS MUST BE THE LAST ROUTE - Catch-all route for serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 