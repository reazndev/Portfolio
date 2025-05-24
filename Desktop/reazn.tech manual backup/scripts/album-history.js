// Album history tracking from Last.fm
document.addEventListener('DOMContentLoaded', function() {
  loadAlbumHistory();
});

// Function to load the album history
async function loadAlbumHistory() {
  const albumGrid = document.getElementById('album-history-grid');
  
  if (!albumGrid) return;
  
  albumGrid.innerHTML = '<div class="loading-albums">Loading album history...</div>';
  
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/data/lastfm-albums-history.json?_=${timestamp}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load album history: ${response.status}`);
    }
    
    const data = await response.json();
    displayAlbumHistory(data.albums);
  } catch (error) {
    console.error('Error loading album history:', error);
    albumGrid.innerHTML = '<div class="error-loading">Could not load album history</div>';
  }
}

// Function to display the album history grid
function displayAlbumHistory(albums) {
  const albumGrid = document.getElementById('album-history-grid');
  
  if (!albums || albums.length === 0) {
    albumGrid.innerHTML = '<div class="no-albums">No album history available</div>';
    return;
  }
  
  // Clear the loading message
  albumGrid.innerHTML = '';
  
  // Create album elements
  albums.forEach(album => {
    const albumElement = document.createElement('div');
    albumElement.className = 'album-item';
    
    // Default image if none provided
    const imageUrl = album.image || './assets/default-album.jpg';
    
    // Add tooltip with album info
    albumElement.setAttribute('title', `${album.name} by ${album.artist} - ${album.date}`);
    
    albumElement.innerHTML = `
      <div class="album-cover">
        <img src="${imageUrl}" alt="${album.name}" onerror="this.src='./assets/default-album.jpg';">
      </div>
      <div class="album-info">
        <div class="album-name">${album.name}</div>
        <div class="album-artist">${album.artist}</div>
      </div>
    `;
    
    albumGrid.appendChild(albumElement);
  });
} 