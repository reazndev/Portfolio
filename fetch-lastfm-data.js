const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration for Last.fm
const LASTFM_API_KEY = '974fb2e0a3add0ac42c2729f6c1e854a';
const LASTFM_USER = 'syntiiix';
const OUTPUT_DIR = path.join(__dirname, 'data');

// Spotify API credentials (you need to create these at https://developer.spotify.com/dashboard/)
const SPOTIFY_CLIENT_ID = 'b6d7bfe3938a41018e0691da3f1cca23';
const SPOTIFY_CLIENT_SECRET = '81ebaae101f44508a231c820bd7ba240';

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Time periods to fetch from Last.fm
const periods = ['7day', '1month', '3month', '12month', 'overall'];

// Variable to store Spotify access token
let spotifyToken = null;

// Function to get Spotify access token with better error handling
async function getSpotifyToken() {
  if (spotifyToken) return spotifyToken;
  
  try {
    console.log('Requesting Spotify access token...');
    
    // Encode credentials properly
    const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: 'grant_type=client_credentials'
    });
    
    const responseText = await response.text();
    console.log(`Spotify response status: ${response.status}`);
    
    if (!response.ok) {
      console.error('Spotify token response:', responseText);
      throw new Error(`Failed to get Spotify token: ${response.status} - ${responseText}`);
    }
    
    try {
      const data = JSON.parse(responseText);
      spotifyToken = data.access_token;
      console.log('Successfully obtained Spotify access token');
      return spotifyToken;
    } catch (parseError) {
      console.error('Error parsing Spotify token response:', parseError);
      console.error('Response text:', responseText);
      throw new Error('Invalid JSON in Spotify response');
    }
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    
    // Fall back to using only Last.fm
    console.log('Will continue with Last.fm data only');
    return null;
  }
}

// Function to search for an artist on Spotify
async function searchSpotifyArtist(artistName) {
  try {
    const token = await getSpotifyToken();
    if (!token) return null;
    
    const encodedName = encodeURIComponent(artistName);
    const url = `https://api.spotify.com/v1/search?q=${encodedName}&type=artist&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.log(`Spotify artist search failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.artists && data.artists.items && data.artists.items.length > 0) {
      const artist = data.artists.items[0];
      // Get largest image
      const image = artist.images && artist.images.length > 0 ? artist.images[0].url : null;
      return { id: artist.id, image };
    }
    
    return null;
  } catch (error) {
    console.error(`Spotify artist search error for ${artistName}:`, error);
    return null;
  }
}

// Function to search for a track on Spotify
async function searchSpotifyTrack(trackName, artistName) {
  try {
    const token = await getSpotifyToken();
    if (!token) return null;
    
    // Search with both track and artist for better results
    const encodedQuery = encodeURIComponent(`track:${trackName} artist:${artistName}`);
    const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.log(`Spotify track search failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      // Get album image
      const image = track.album && track.album.images && track.album.images.length > 0 
        ? track.album.images[0].url : null;
      return { id: track.id, image, albumName: track.album ? track.album.name : null };
    }
    
    return null;
  } catch (error) {
    console.error(`Spotify track search error for ${trackName} by ${artistName}:`, error);
    return null;
  }
}

// Function to search for an album on Spotify
async function searchSpotifyAlbum(albumName, artistName) {
  try {
    const token = await getSpotifyToken();
    if (!token) return null;
    
    // Search with both album and artist for better results
    const encodedQuery = encodeURIComponent(`album:${albumName} artist:${artistName}`);
    const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=album&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.log(`Spotify album search failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.albums && data.albums.items && data.albums.items.length > 0) {
      const album = data.albums.items[0];
      // Get largest image
      const image = album.images && album.images.length > 0 ? album.images[0].url : null;
      return { id: album.id, image };
    }
    
    return null;
  } catch (error) {
    console.error(`Spotify album search error for ${albumName} by ${artistName}:`, error);
    return null;
  }
}

// Function to fetch data from Last.fm
async function fetchLastFmData(method, period, limit = 10) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=${method}&user=${LASTFM_USER}&period=${period}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching ${method} for ${period}: ${response.status} ${errorText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${method} for ${period}:`, error);
    return null;
  }
}

// Function to check if an image URL is valid
function isValidImage(imageUrl) {
  if (!imageUrl) return false;
  if (imageUrl.length < 10) return false;
  if (imageUrl.endsWith('/noimage/noimage.png')) return false;
  if (imageUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) return false; // Last.fm default placeholder
  return true;
}

// Wait between API calls to respect rate limits
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process and save data for each time period
async function processAllData() {
  for (const period of periods) {
    console.log(`\n===== Fetching data for period: ${period} =====\n`);
    
    try {
      // Fetch artists, tracks, and albums from Last.fm
      const [artistsData, tracksData, albumsData] = await Promise.all([
        fetchLastFmData('user.gettopartists', period),
        fetchLastFmData('user.gettoptracks', period),
        fetchLastFmData('user.gettopalbums', period)
      ]);
      
      // Process artists data
      let topArtists = [];
      if (artistsData && artistsData.topartists && artistsData.topartists.artist) {
        console.log(`Processing ${Math.min(5, artistsData.topartists.artist.length)} artists...`);
        
        for (const artist of artistsData.topartists.artist.slice(0, 5)) {
          console.log(`- Processing artist: ${artist.name}`);
          
          let artistInfo = {
            name: artist.name,
            playcount: artist.playcount,
            image: artist.image[3]['#text'] || artist.image[2]['#text'] || null
          };
          
          // Try to get better image from Spotify
          if (!isValidImage(artistInfo.image)) {
            console.log(`  > Last.fm image not valid, trying Spotify...`);
            const spotifyArtist = await searchSpotifyArtist(artist.name);
            await sleep(300); // Spotify has higher rate limits, but still be cautious
            
            if (spotifyArtist && spotifyArtist.image) {
              console.log(`  > Using artist image from Spotify`);
              artistInfo.image = spotifyArtist.image;
            } else {
              console.log(`  > No Spotify image found for ${artist.name}`);
            }
          }
          
          topArtists.push(artistInfo);
        }
      }
      
      // Process tracks data
      let topTracks = [];
      if (tracksData && tracksData.toptracks && tracksData.toptracks.track) {
        console.log(`Processing ${Math.min(5, tracksData.toptracks.track.length)} tracks...`);
        
        for (const track of tracksData.toptracks.track.slice(0, 5)) {
          console.log(`- Processing track: ${track.name} by ${track.artist.name}`);
          
          let trackInfo = {
            name: track.name,
            artist: track.artist.name,
            playcount: track.playcount,
            image: track.image[3]['#text'] || track.image[2]['#text'] || null
          };
          
          // Try to get better image from Spotify
          if (!isValidImage(trackInfo.image)) {
            console.log(`  > Last.fm image not valid, trying Spotify...`);
            const spotifyTrack = await searchSpotifyTrack(track.name, track.artist.name);
            await sleep(300);
            
            if (spotifyTrack && spotifyTrack.image) {
              console.log(`  > Using track image from Spotify album: ${spotifyTrack.albumName}`);
              trackInfo.image = spotifyTrack.image;
            } else {
              console.log(`  > No Spotify image found for ${track.name}`);
            }
          }
          
          topTracks.push(trackInfo);
        }
      }
      
      // Process albums data
      let topAlbums = [];
      if (albumsData && albumsData.topalbums && albumsData.topalbums.album) {
        console.log(`Processing ${Math.min(5, albumsData.topalbums.album.length)} albums...`);
        
        for (const album of albumsData.topalbums.album.slice(0, 5)) {
          console.log(`- Processing album: ${album.name} by ${album.artist.name}`);
          
          let albumInfo = {
            name: album.name,
            artist: album.artist.name,
            playcount: album.playcount,
            image: album.image[3]['#text'] || album.image[2]['#text'] || null
          };
          
          // Try to get better image from Spotify
          if (!isValidImage(albumInfo.image)) {
            console.log(`  > Last.fm image not valid, trying Spotify...`);
            const spotifyAlbum = await searchSpotifyAlbum(album.name, album.artist.name);
            await sleep(300);
            
            if (spotifyAlbum && spotifyAlbum.image) {
              console.log(`  > Using album image from Spotify`);
              albumInfo.image = spotifyAlbum.image;
            } else {
              console.log(`  > No Spotify image found for ${album.name}`);
            }
          }
          
          topAlbums.push(albumInfo);
        }
      }
      
      // Combine all data
      const combinedData = {
        topArtists,
        topTracks,
        topAlbums,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to file
      const outputFile = path.join(OUTPUT_DIR, `lastfm-${period}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2));
      console.log(`\nSaved data for ${period} to ${outputFile}`);
    } catch (error) {
      console.error(`Error processing data for period ${period}:`, error);
    }
  }
}

// Run the script
processAllData()
  .then(() => console.log('\nAll Last.fm data has been fetched and saved with Spotify images!'))
  .catch(error => console.error('\nScript failed:', error)); 