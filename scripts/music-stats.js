document.addEventListener('DOMContentLoaded', function() {
  const timespanButtons = document.querySelectorAll('.timespan-btn');
  
  timespanButtons.forEach(button => {
    button.addEventListener('click', function() {
      timespanButtons.forEach(btn => btn.classList.remove('active'));
      
      this.classList.add('active');
      
      const timespan = this.dataset.timespan;
      
      loadMusicData(timespan);
    });
  });
  
  loadMusicData('7day');
});

const mockData = {
  topArtists: [
    {
      name: "Radiohead",
      playcount: "127",
      image: "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png"
    },
    {
      name: "Daft Punk",
      playcount: "98",
      image: "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png"
    }
  ],
  topTracks: [
    {
      name: "Karma Police",
      artist: "Radiohead",
      playcount: "36",
      image: "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png"
    },
    {
      name: "Get Lucky",
      artist: "Daft Punk",
      playcount: "29",
      image: "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png"
    }
  ],
  topAlbums: [
    {
      name: "OK Computer",
      artist: "Radiohead",
      playcount: "87",
      image: "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png"
    },
    {
      name: "Random Access Memories",
      artist: "Daft Punk",
      playcount: "75",
      image: "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png"
    }
  ]
};

async function loadMusicData(timespan) {
  console.log(`Loading music data for timespan: ${timespan}`);
  
  document.querySelectorAll('.music-box-content').forEach(box => {
    box.innerHTML = '<div class="music-item-loading">Loading...</div>';
  });
  
  try {
    let data = null;
    let usedMockData = false;
    
    try {
      const timestamp = new Date().getTime();
      const url = `/data/lastfm-${timespan}.json?_=${timestamp}`;
      console.log(`Fetching from static file: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load static data: ${response.status}`);
      }
      
      data = await response.json();
      console.log('Static data loaded:', data);
      
    } catch (fetchError) {
      console.warn("Failed to fetch from static file, using mock data:", fetchError);
      data = mockData;
      usedMockData = true;
    }
    
    updateMusicDisplay(data);
    
    if (usedMockData) {
      document.querySelectorAll('.music-box-content').forEach(box => {
        const noteElement = document.createElement('div');
        noteElement.className = 'mock-data-note';
        noteElement.textContent = 'Using sample data';
        noteElement.style.fontSize = '0.7rem';
        noteElement.style.fontStyle = 'italic';
        noteElement.style.color = '#999';
        noteElement.style.marginTop = '8px';
        box.appendChild(noteElement);
      });
    }
  } catch (error) {
    console.error('Error in loadMusicData:', error);
    document.querySelectorAll('.music-box-content').forEach(box => {
      box.innerHTML = '<div class="music-item-loading">Error loading data</div>';
    });
  }
}

function updateMusicDisplay(data) {
  const formatNumber = (num) => {
    return parseInt(num).toLocaleString();
  };
  
  const isValidImageUrl = (url) => {
    if (!url) return false;
    if (url.length < 10) return false;
    if (url.endsWith('/noimage/noimage.png')) return false;
    if (url.includes('2a96cbd8b46e442fc41c2b86b821562f')) return false; 
    return true;
  };
  
  const defaultArtistImage = './assets/default-artist.jpg';
  const defaultTrackImage = './assets/default-track.jpg';
  const defaultAlbumImage = './assets/default-album.jpg';
  
  if (data.topArtists && data.topArtists.length > 0) {
    const artistsList = data.topArtists.slice(0, 5).map(artist => {
      const imageUrl = isValidImageUrl(artist.image) ? artist.image : defaultArtistImage;
      return `
        <div class="music-list-item">
          <img class="music-thumbnail" src="${imageUrl}" alt="${artist.name}" onerror="this.src='${defaultArtistImage}';">
          <div class="music-item-text">
            <span class="play-count">${formatNumber(artist.playcount)} plays</span>
            <span class="item-separator">-</span>
            <span class="item-name">${artist.name}</span>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('top-artist-box').querySelector('.music-box-content').innerHTML = `
      <div class="music-list">
        ${artistsList}
      </div>
    `;
  }
  
  if (data.topTracks && data.topTracks.length > 0) {
    const tracksList = data.topTracks.slice(0, 5).map(track => {
      const imageUrl = isValidImageUrl(track.image) ? track.image : defaultTrackImage;
      return `
        <div class="music-list-item">
          <img class="music-thumbnail" src="${imageUrl}" alt="${track.name}" onerror="this.src='${defaultTrackImage}';">
          <div class="music-item-text">
            <span class="play-count">${formatNumber(track.playcount)} plays</span>
            <span class="item-separator">-</span>
            <span class="item-name">${track.name}</span>
            <span class="item-separator">-</span>
            <span class="item-artist">${track.artist}</span>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('top-track-box').querySelector('.music-box-content').innerHTML = `
      <div class="music-list">
        ${tracksList}
      </div>
    `;
  }
  
  if (data.topAlbums && data.topAlbums.length > 0) {
    const albumsList = data.topAlbums.slice(0, 5).map(album => {
      const imageUrl = isValidImageUrl(album.image) ? album.image : defaultAlbumImage;
      return `
        <div class="music-list-item">
          <img class="music-thumbnail" src="${imageUrl}" alt="${album.name}" onerror="this.src='${defaultAlbumImage}';">
          <div class="music-item-text">
            <span class="play-count">${formatNumber(album.playcount)} plays</span>
            <span class="item-separator">-</span>
            <span class="item-name">${album.name}</span>
            <span class="item-separator">-</span>
            <span class="item-artist">${album.artist}</span>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('top-album-box').querySelector('.music-box-content').innerHTML = `
      <div class="music-list">
        ${albumsList}
      </div>
    `;
  }
} 