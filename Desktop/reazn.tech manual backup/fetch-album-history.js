const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const LASTFM_API_KEY = '974fb2e0a3add0ac42c2729f6c1e854a';
const LASTFM_USER = 'syntiiix';
const OUTPUT_DIR = path.join(__dirname, 'data');
const SPOTIFY_CLIENT_ID = 'b6d7bfe3938a41018e0691da3f1cca23';
const SPOTIFY_CLIENT_SECRET = '81ebaae101f44508a231c820bd7ba240';
const FROM_YEAR = 2025; // Only include listens from 2025 onward
const MIN_TRACKS = 3; // Minimum tracks for an album (to exclude singles)
const LISTEN_THRESHOLD = 0.7; // 70% of tracks must be played

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Variable to store Spotify access token
let spotifyToken = null;

// Function to get Spotify access token
async function getSpotifyToken() {
  if (spotifyToken) return spotifyToken;
  
  try {
    console.log('Requesting Spotify access token...');
    
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
    
    if (!response.ok) {
      console.error('Spotify token response:', responseText);
      throw new Error(`Failed to get Spotify token: ${response.status}`);
    }
    
    const data = JSON.parse(responseText);
    spotifyToken = data.access_token;
    console.log('Successfully obtained Spotify access token');
    return spotifyToken;
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return null;
  }
}

// Function to search for an album on Spotify and get track details
async function getSpotifyAlbumDetails(albumName, artistName) {
  try {
    const token = await getSpotifyToken();
    if (!token) return null;
    
    // First search for the album
    const encodedQuery = encodeURIComponent(`album:${albumName} artist:${artistName}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=album&limit=1`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!searchResponse.ok) {
      console.log(`Spotify album search failed: ${searchResponse.status}`);
      return null;
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.albums || !searchData.albums.items || searchData.albums.items.length === 0) {
      return null;
    }
    
    const album = searchData.albums.items[0];
    const albumId = album.id;
    
    // Now get detailed album info including tracks
    const albumUrl = `https://api.spotify.com/v1/albums/${albumId}`;
    const albumResponse = await fetch(albumUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!albumResponse.ok) {
      console.log(`Spotify album details fetch failed: ${albumResponse.status}`);
      return null;
    }
    
    const albumData = await albumResponse.json();
    
    // Extract relevant details
    const image = albumData.images && albumData.images.length > 0 ? albumData.images[0].url : null;
    const releaseDate = albumData.release_date || null;
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
    const totalTracks = albumData.tracks && albumData.tracks.items ? albumData.tracks.items.length : 0;
    const trackNames = albumData.tracks && albumData.tracks.items 
      ? albumData.tracks.items.map(track => track.name) 
      : [];
    
    return {
      id: albumId,
      name: albumData.name,
      artist: albumData.artists[0].name,
      image,
      releaseDate,
      releaseYear,
      totalTracks,
      trackNames
    };
  } catch (error) {
    console.error(`Spotify album details error for ${albumName} by ${artistName}:`, error);
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

// Function to fetch tracks from Last.fm
async function fetchUserTracks(page = 1, limit = 200, fromDate) {
  try {
    let url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}&page=${page}`;
    
    // Add from date if specified
    if (fromDate) {
      const timestamp = Math.floor(new Date(fromDate).getTime() / 1000);
      url += `&from=${timestamp}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching user tracks: ${response.status} ${errorText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user tracks:', error);
    return null;
  }
}

// Function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to fetch and process album history
async function processAlbumHistory() {
  console.log('Fetching recent tracks from Last.fm...');
  
  // Set date from beginning of 2025
  const fromDate = `${FROM_YEAR}-01-01`;
  console.log(`Collecting tracks listened to from ${fromDate} onwards...`);
  
  // Get the first page to determine total pages
  const firstPage = await fetchUserTracks(1, 200, fromDate);
  
  if (!firstPage || !firstPage.recenttracks || !firstPage.recenttracks['@attr']) {
    console.error('Failed to fetch user tracks or invalid response format');
    return;
  }
  
  const totalPages = parseInt(firstPage.recenttracks['@attr'].totalPages);
  const totalTracks = parseInt(firstPage.recenttracks['@attr'].total);
  
  console.log(`Found ${totalTracks} tracks across ${totalPages} pages from ${fromDate}`);
  
  // Use all available pages
  const pagesToFetch = totalPages;
  
  let allTracks = [];
  
  // Process the first page we already fetched
  if (firstPage.recenttracks.track) {
    allTracks = allTracks.concat(firstPage.recenttracks.track);
  }
  
  // Fetch additional pages
  for (let page = 2; page <= pagesToFetch; page++) {
    console.log(`Fetching page ${page} of ${pagesToFetch}...`);
    
    const pageData = await fetchUserTracks(page, 200, fromDate);
    await sleep(300); // Respect rate limits
    
    if (pageData && pageData.recenttracks && pageData.recenttracks.track) {
      allTracks = allTracks.concat(pageData.recenttracks.track);
    }
  }
  
  console.log(`Processing ${allTracks.length} tracks...`);
  
  // Group tracks by album
  const albumMap = new Map();
  const tracksListenedByAlbum = new Map();
  
  for (const track of allTracks) {
    // Skip currently playing tracks
    if (track['@attr'] && track['@attr'].nowplaying === 'true') continue;
    
    const albumKey = `${track.album['#text']}:${track.artist['#text']}`;
    
    // Track this track as listened for this album
    if (!tracksListenedByAlbum.has(albumKey)) {
      tracksListenedByAlbum.set(albumKey, new Set());
    }
    tracksListenedByAlbum.get(albumKey).add(track.name);
    
    // Store basic album info if not already stored
    if (!albumMap.has(albumKey)) {
      const trackDate = new Date(parseInt(track.date.uts) * 1000);
      albumMap.set(albumKey, {
        name: track.album['#text'],
        artist: track.artist['#text'],
        firstListened: trackDate.toISOString().split('T')[0], // YYYY-MM-DD
        image: track.image[3]['#text'] || track.image[2]['#text'] || null,
        spotifyDetails: null,
        tracksListened: 0,
        totalTracks: 0
      });
    }
  }
  
  console.log(`Found ${albumMap.size} potential albums to analyze`);
  
  // Get detailed album information from Spotify
  const processedAlbums = [];
  
  for (const [albumKey, albumInfo] of albumMap.entries()) {
    console.log(`Analyzing album: ${albumInfo.name} by ${albumInfo.artist}`);
    
    // Get detailed album info from Spotify
    const spotifyDetails = await getSpotifyAlbumDetails(albumInfo.name, albumInfo.artist);
    await sleep(300); // Respect rate limits
    
    if (!spotifyDetails) {
      console.log(`- Could not find on Spotify, skipping`);
      continue;
    }
    
    // Skip albums with fewer than MIN_TRACKS
    if (spotifyDetails.totalTracks < MIN_TRACKS) {
      console.log(`- Only has ${spotifyDetails.totalTracks} tracks, minimum is ${MIN_TRACKS}, skipping`);
      continue;
    }
    
    // Get the list of tracks listened to for this album
    const tracksListened = tracksListenedByAlbum.get(albumKey) || new Set();
    
    // Calculate percentage of album listened to
    const listenPercentage = tracksListened.size / spotifyDetails.totalTracks;
    
    console.log(`- Album has ${spotifyDetails.totalTracks} tracks, you've listened to ${tracksListened.size} (${Math.round(listenPercentage * 100)}%)`);
    
    // Only include album if LISTEN_THRESHOLD of tracks have been listened to
    if (listenPercentage < LISTEN_THRESHOLD) {
      console.log(`- Below ${LISTEN_THRESHOLD * 100}% threshold, skipping`);
      continue;
    }
    
    // Use Spotify image if Last.fm image is not valid
    if (!isValidImage(albumInfo.image) && spotifyDetails.image) {
      albumInfo.image = spotifyDetails.image;
    }
    
    // Add to processed albums list
    processedAlbums.push({
      name: spotifyDetails.name,
      artist: spotifyDetails.artist,
      date: albumInfo.firstListened,
      releaseDate: spotifyDetails.releaseDate,
      releaseYear: spotifyDetails.releaseYear,
      image: albumInfo.image || spotifyDetails.image,
      totalTracks: spotifyDetails.totalTracks,
      tracksListened: tracksListened.size,
      listenPercentage: listenPercentage
    });
    
    console.log(`- Added to album history: ${spotifyDetails.name}`);
  }
  
  console.log(`\nFound ${processedAlbums.length} albums meeting criteria (listened to from ${FROM_YEAR}, min ${MIN_TRACKS} tracks, ${LISTEN_THRESHOLD * 100}% listened)`);
  
  // Sort by date (newest first)
  processedAlbums.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Save to file
  const outputFile = path.join(OUTPUT_DIR, 'lastfm-albums-history.json');
  fs.writeFileSync(outputFile, JSON.stringify({ 
    albums: processedAlbums, 
    lastUpdated: new Date().toISOString(),
    criteria: {
      listenedFrom: FROM_YEAR,
      minTracks: MIN_TRACKS,
      listenThreshold: LISTEN_THRESHOLD
    }
  }, null, 2));
  
  console.log(`Saved album history to ${outputFile}`);
}

// Run the script
processAlbumHistory()
  .then(() => console.log('Album history processing complete!'))
  .catch(error => console.error('Script failed:', error)); 