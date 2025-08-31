const cursor = document.querySelector('.custom-cursor');
const clickableElements = document.querySelectorAll('a:not(.nav-item), .box');

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

clickableElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
        cursor.classList.add('active');
        
        if (element.tagName === 'A' && !element.getAttribute('onclick') && !element.classList.contains('nav-item')) {
            cursor.classList.add('external');
            cursor.classList.remove('internal');
            cursor.setAttribute('data-href', element.getAttribute('href'));
        } else {
            cursor.classList.add('internal');
            cursor.classList.remove('external');
            cursor.removeAttribute('data-href');
        }
    });
    
    element.addEventListener('mouseleave', () => {
        cursor.classList.remove('active', 'internal', 'external');
        cursor.removeAttribute('data-href');
    });
});

const arrowIcons = document.querySelectorAll('.link-icon');
arrowIcons.forEach(icon => {
    icon.addEventListener('mouseenter', () => {
        const previewWindow = document.querySelector('.preview-window');
        previewWindow.style.display = 'none'; 
    });
});

function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ 
        behavior: 'smooth'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                entry.target.querySelectorAll('.project').forEach(project => {
                    project.classList.add('visible');
                });
                
                entry.target.querySelectorAll('.about-section-content > div').forEach(div => {
                    div.classList.add('visible');
                });
                
                entry.target.querySelectorAll('.timeline-item').forEach(item => {
                    item.classList.add('visible');
                });
            }
        });
    }, {
        threshold: 0.1,  
        rootMargin: '0px 0px -10% 0px'  
    });

    document.querySelectorAll('.content-section').forEach((section) => {
        observer.observe(section);
    });

    const timelineItems = document.querySelectorAll('.timeline-item');
    const aboutSection = document.querySelector('#about-section');
    
    window.addEventListener('scroll', () => {
        if (!aboutSection) return;
        
        const viewportHeight = window.innerHeight;
        const scrollPosition = window.scrollY;
        
        timelineItems.forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            const itemTop = itemRect.top;
            const startTrigger = viewportHeight * 1; 
            const endTrigger = viewportHeight * 0.75;  
            
            if (itemTop <= startTrigger && itemTop >= endTrigger) {
                const progress = (startTrigger - itemTop) / (startTrigger - endTrigger);
                
                const opacity = progress;
                item.style.setProperty('--timeline-color', `rgba(142, 141, 190, ${opacity})`);
                item.style.setProperty('--timeline-opacity', opacity);
            } else if (itemTop < endTrigger) {
                item.style.setProperty('--timeline-color', '#8E8DBE');
                item.style.setProperty('--timeline-opacity', '1');
            } else {
                item.style.setProperty('--timeline-color', 'rgba(142, 141, 190, 0)'); 
                item.style.setProperty('--timeline-opacity', '0');
            }
        });
    });
});

const artistImages = {
    'd4vd': './assets/cover/Leave Her.jpg', 
};

async function fetchArtistImageFromMusicBrainz(artistName) {
    try {
        const lastfmResponse = await fetch(`/api/lastfm/artist.getinfo?artist=${encodeURIComponent(artistName)}`);
        const lastfmData = await lastfmResponse.json();
        const mbid = lastfmData.artist?.mbid;
        
        if (!mbid) {
            console.log('No MusicBrainz ID found for', artistName);
            return null;
        }
        
        const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`;
        const response = await fetch(url);
        const data = await response.json();
        
        const relations = data.relations || [];
        for (let i = 0; i < relations.length; i++) {
            if (relations[i].type === 'image') {
                let imageUrl = relations[i].url.resource;
                
                if (imageUrl.startsWith('https://commons.wikimedia.org/wiki/File:')) {
                    const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
                    imageUrl = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/' + filename;
                }
                
                console.log('Found artist image:', imageUrl);
                return imageUrl;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching artist image:', error);
        return null;
    }
}

async function displayMusicStats() {
    try {
        const recentResponse = await fetch('/api/lastfm/user.getRecentTracks?user=syntiiix&limit=1');
        const recentData = await recentResponse.json();
        
        if (!recentData.recenttracks || !recentData.recenttracks.track || recentData.recenttracks.track.length === 0) {
            throw new Error('No recent tracks found');
        }
        
        const recentTrack = recentData.recenttracks.track[0];

        document.getElementById('recent-track').innerHTML = `
            <h4 style="font-size: 0.95em; margin-bottom: 8px;">Most Recent Track</h4>
            <div style="display: flex; align-items: center;">
                <img src="${recentTrack.image[2]['#text'] || './assets/default-album.png'}" alt="${recentTrack.name}" style="border-radius: 8px; width: 40px; height: 40px; margin-right: 8px;">
                <div>
                    <p style="font-size: 0.90em; margin: 0;">${recentTrack.name}</p>
                    <p style="margin: 0; font-size: 0.75em;">by ${recentTrack.artist['#text']}</p>
                </div>
            </div>
        `;

        const monthlyResponse = await fetch('monthly_stats.json');
        const monthlyStats = await monthlyResponse.json();

        document.getElementById('top-track').innerHTML = `
            <h4 style="font-size: 0.95em; margin-bottom: 8px;">Top Track This Month</h4>
            <div style="display: flex; align-items: center;">
                <img src="${monthlyStats.topTrack.image || './assets/default-album.png'}" alt="${monthlyStats.topTrack.name}" style="border-radius: 8px; width: 40px; height: 40px; margin-right: 8px;">
                <div>
                    <p style="font-size: 0.90em; margin: 0;">${monthlyStats.topTrack.name}</p>
                    <p style="margin: 0; font-size: 0.75em;">by ${monthlyStats.topTrack.artist}</p>
                    <p style="margin: 0; font-size: 0.7em; color: #666;">${monthlyStats.topTrack.plays} plays</p>
                </div>
            </div>
        `;

        let artistImageUrl = artistImages[monthlyStats.topArtist.name]; 
        
        if (!artistImageUrl) {
            const mbImage = await fetchArtistImageFromMusicBrainz(monthlyStats.topArtist.name);
            artistImageUrl = mbImage || './assets/default-album.png';
        }
        
        document.getElementById('top-artist').innerHTML = `
            <h4 style="font-size: 0.95em; margin-bottom: 8px;">Top Artist This Month</h4>
            <div style="display: flex; align-items: center;">
                <img src="${artistImageUrl}" alt="${monthlyStats.topArtist.name}" style="border-radius: 8px; width: 40px; height: 40px; margin-right: 8px;">
                <div>
                    <p style="font-size: 1em; margin: 0;">${monthlyStats.topArtist.name}</p>
                    <p style="margin: 0; font-size: 0.7em; color: #666;">${monthlyStats.topArtist.plays} plays</p>
                </div>
            </div>
        `;

        document.getElementById('top-album').innerHTML = `
            <h4 style="font-size: 0.95em; margin-bottom: 8px;">Top Album This Month</h4>
            <div style="display: flex; align-items: center;">
                <img src="${monthlyStats.topAlbum.image || './assets/default-album.png'}" alt="${monthlyStats.topAlbum.name}" style="border-radius: 8px; width: 40px; height: 40px; margin-right: 8px;">
                <div>
                    <p style="font-size: 0.90em; margin: 0;">${monthlyStats.topAlbum.name}</p>
                    <p style="margin: 0; font-size: 0.75em;">by ${monthlyStats.topAlbum.artist}</p>
                    <p style="margin: 0; font-size: 0.7em; color: #666;">${monthlyStats.topAlbum.plays} plays</p>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error fetching music stats:', error);
        const elements = ['recent-track', 'top-track', 'top-artist', 'top-album'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = `
                    <div style="color: #666;">
                        <p>Unable to load music stats</p>
                        <p style="font-size: 0.8em;">Please try again later</p>
                    </div>
                `;
            }
        });
    }
}

async function displayRandomRecommendation() {
    try {
        const playlistTracks = [
            { name: "Dirty Secrets", artist: "d4vd", image: "./assets/cover/Dirty Secrets.jpg" },
            { name: "DTN", artist: "d4vd", image: "./assets/cover/DTN.jpg" },
            { name: "Lady Brown (feat. Cise Starr from CYNE)", artist: "Nujabes", image: "./assets/cover/Lady Brown.jpg" },
            { name: "Lullaby", artist: "Ichiko Aoba", image: "./assets/cover/Lullaby.jpg" },
            { name: "Music On The Radio", artist: "Empire Of The Sun", image: "./assets/cover/Music On The Radio.jpg" },
            { name: "Husk", artist: "Men I Trust", image: "./assets/cover/Husk.jpg" },
            { name: "What's Going On", artist: "Marvin Gaye", image: "./assets/cover/What's Going On.jpg" },
            { name: "I'll Be Right There", artist: "JPEGMAFIA", image: "./assets/cover/I'll Be Right There.jpg" },
            { name: "either on or off the drugs", artist: "JPEGMAFIA", image: "./assets/cover/either on or off the drugs.jpg" },
            { name: "i recovered from this", artist: "JPEGMAFIA", image: "./assets/cover/i recovered from this.jpg" },
            { name: "Don't Put Anything On the Bible (feat. Buzzy Lee)", artist: "JPEGMAFIA", image: "./assets/cover/Don't Put Anything On the Bible.jpg" },
            { name: "Imaginary Folklore", artist: "clammbon", image: "./assets/cover/Imaginary Folklore.jpg" },
            { name: "Kids", artist: "MGMT", image: "./assets/cover/Kids.jpg" },
            { name: "Wonderful World", artist: "The Flying Pickets", image: "./assets/cover/Wonderful World.jpg" },
            { name: "Love Lost", artist: "Mac Miller", image: "./assets/cover/Love Lost.jpg" },
            { name: "Cigarette Daydreams", artist: "Cage The Elephant", image: "./assets/cover/Cigarette Daydreams.jpg" },
            { name: "Call me when you're home", artist: "kkanji", image: "./assets/cover/Call me when you're home.jpg" },
            { name: "Levitation", artist: "Beach House", image: "./assets/cover/Levitation.jpg" },
            { name: "Sparks", artist: "Beach House", image: "./assets/cover/Sparks.jpg" },
            { name: "Greed", artist: "kkanji", image: "./assets/cover/Greed.jpg" },
            { name: "The Spins", artist: "Mac Miller", image: "./assets/cover/The Spins.jpg" },
            { name: "Just Can't Get Enough", artist: "Black Eyed Peas", image: "./assets/cover/Just Cant Get Enough.jpg" },
            { name: "DIKEMBE!", artist: "JPEGMAFIA", image: "./assets/cover/DIKEMBE.jpg" },
            { name: "ARE YOU HAPPY?", artist: "JPEGMAFIA", image: "./assets/cover/ARE YOU HAPPY.jpg" },
            { name: "Meet Me Halfway", artist: "Black Eyed Peas", image: "./assets/cover/Meet Me Halfway.jpg" },
            { name: "Who Did You Touch?", artist: "Montell Fish", image: "./assets/cover/Who Did You Touch?.jpg" },
            { name: "Ain't No Mountain High Enough", artist: "Marvin Gaye", image: "./assets/cover/Ain't No Mountain High Enough.jpg" },
            { name: "Smalltown Boy", artist: "Bronski Beat", image: "./assets/cover/Smalltown Boy.jpg" },
            { name: "Off The Wall", artist: "石川紅奈", image: "./assets/cover/Off The Wall.jpg" },
            { name: "The Youth", artist: "MGMT", image: "./assets/cover/The Youth.jpg" },
            { name: "Electric Feel", artist: "MGMT", image: "./assets/cover/Electric Feel.jpg" },
            { name: "Pink Frost", artist: "The Chills", image: "./assets/cover/Pink Frost.jpg" },
            { name: "Remember Me (from the series Arcane League of Legends)", artist: "d4vd", image: "./assets/cover/Remember Me.jpg" },
            { name: "No One Noticed (Extended English)", artist: "The Marías", image: "./assets/cover/No One Noticed.jpg" },
            { name: "Malmo", artist: "STRFKR", image: "./assets/cover/Malmo.jpg" },
            { name: "Dancing In The Moonlight", artist: "King Harvest", image: "./assets/cover/Dancing In The Moonlight.jpg" },
            { name: "Self Control", artist: "Frank Ocean", image: "./assets/cover/Self Control.jpg" },
            { name: "Seigfried", artist: "Frank Ocean", image: "./assets/cover/Seigfried.jpg" },
            { name: "Lost", artist: "Frank Ocean", image: "./assets/cover/Lost.jpg" },
            { name: "Worth It. - Live at Montreux Jazz Festival", artist: "RAYE", image: "./assets/cover/Worth It.jpg" },
            { name: "BULLSEYE", artist: "Paris Texas", image: "./assets/cover/BULLSEYE.jpg" },
            { name: "RHM", artist: "Paris Texas", image: "./assets/cover/RHM.jpg" },
            { name: "SITUATIONS", artist: "Paris Texas", image: "./assets/cover/SITUATIONS.jpg" },
            { name: "NOBODY", artist: "John michel", image: "./assets/cover/NOBODY.jpg" },
            { name: "L$D", artist: "A$AP Rocky", image: "./assets/cover/L$D.jpg" },
            { name: "The Less I Know The Better", artist: "Tame Impala", image: "./assets/cover/The Less I Know The Better.jpg" },
            { name: "ANGEL", artist: "Brent Faiyaz", image: "./assets/cover/ANGEL.jpg" },
            { name: "ALL MINE", artist: "Brent Faiyaz", image: "./assets/cover/ALL MINE.jpg" },
            { name: "FYTB (FEAT. JOONY)", artist: "Brent Faiyaz", image: "./assets/cover/FYTB.jpg" },
            { name: "ROLE MODEL", artist: "Brent Faiyaz", image: "./assets/cover/ROLE MODEL.jpg" },
            { name: "Leave Her", artist: "d4vd", image: "./assets/cover/Leave Her.jpg" },
            { name: "Where'd It Go Wrong?", artist: "d4vd", image: "./assets/cover/Where'd It Go Wrong.jpg" },
            { name: "Spill", artist: "acloudyskye", image: "./assets/cover/Spill.jpg" },
            { name: "This Is How It Went", artist: "beabadoobee", image: "./assets/cover/This Is How It Went.jpg" },
            { name: "Cry for Me", artist: "Magdalena Bay", image: "./assets/cover/Cry for Me.jpg" },
            { name: "Inaka", artist: "Mei Semones", image: "./assets/cover/Inaka.jpg" },
            { name: "TSLAMP", artist: "MGMT", image: "./assets/cover/TSLAMP.jpg" },
            { name: "breathe", artist: "jev.", image: "./assets/cover/breathe.jpg" },
            { name: "Across The Universe - Remastered 2009", artist: "The Beatles", image: "./assets/cover/Across The Universe.jpg" },
            { name: "Regressa", artist: "Kaz Moon", image: "./assets/cover/Regressa.jpg" },
            { name: "In A Sentimental Mood", artist: "Duke Ellington", image: "./assets/cover/In A Sentimental Mood.jpg" }
        ];

        const randomTrack = playlistTracks[Math.floor(Math.random() * playlistTracks.length)];

        document.getElementById('random-recommendation').innerHTML = `
            <h4 style="font-size: 0.95em; margin-bottom: 8px;">Random Recommendation</h4>
            <div style="display: flex; align-items: center;">
                <img src="${randomTrack.image}" alt="${randomTrack.name}" style="border-radius: 8px; width: 40px; height: 40px; margin-right: 8px;">
                <div>
                    <p style="font-size: 0.90em; margin: 0;">${randomTrack.name}</p>
                    <p style="margin: 0; font-size: 0.75em;">by ${randomTrack.artist}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error displaying random recommendation:', error);
    }
}

async function updateChart() {
    try {
        const response = await fetch('weekly_chart.json');
        const chartData = await response.json();

        console.log('Raw chart data:', chartData);
        console.log('Labels:', chartData.data.map(d => d.day));
        console.log('Values:', chartData.data.map(d => d.count));

        const ctx = document.getElementById('listening-chart').getContext('2d');
        const myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.data.map(d => d.day),
                datasets: [{
                    label: 'Tracks Played',
                    data: chartData.data.map(d => ({ x: d.day, y: d.count })),
                    backgroundColor: 'rgba(142, 141, 190, 0.0)',
                    borderColor: 'rgba(142, 141, 190, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    transition: {
                        duration: 200
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                parsing: {
                    xAxisKey: 'x',
                    yAxisKey: 'y'
                },
                scales: {
                    x: {
                        type: 'category',
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            source: 'data',
                            autoSkip: false,
                            maxRotation: 0,
                            minRotation: 0,
                            font: {
                                size: 10
                            },
                            color: '#666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            stepSize: 20,
                            font: {
                                size: 10
                            },
                            color: '#666'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });

        const lastfmBox = document.getElementById('box-lastfm');

        lastfmBox.addEventListener('mouseenter', () => {
            myChart.data.datasets[0].backgroundColor = 'rgba(142, 141, 190, 0.4)';
            myChart.update({
                duration: 400,
                easing: 'easeOutQuad'
            });
        });

        lastfmBox.addEventListener('mouseleave', () => {
            myChart.data.datasets[0].backgroundColor = 'rgba(142, 141, 190, 0.0)';
            myChart.update({
                duration: 400,
                easing: 'easeOutQuad'
            });
        });
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

displayMusicStats();
displayRandomRecommendation();
updateChart();

document.addEventListener('DOMContentLoaded', function() {
  const digits = [
    [" 000 ", "0   0", "0   0", "0   0", " 000 "],
    ["  1  ", " 11  ", "  1  ", "  1  ", " 111 "],
    [" 222 ", "2   2", "  22 ", " 2   ", " 2222"],
    [" 333 ", "    3", "  33 ", "    3", " 333 "],
    [" 4  4", "4  4 ", " 4444", "    4", "    4"],
    [" 5555", " 5   ", " 555 ", "    5", " 555 "],
    [" 666 ", " 6   ", " 666 ", " 6  6", " 666 "],
    [" 7777", "    7", "   7 ", "  7  ", " 7   "],
    [" 888 ", "8   8", " 888 ", "8   8", " 888 "],
    [" 999 ", "9   9", " 999 ", "    9", " 999 "],
    ["     ", "  *  ", "     ", "  *  ", "     "] 
  ];
  
  function getAsciiTime() {
    const now = new Date();
    const berlinTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    
    const h = berlinTime.getHours().toString().padStart(2, '0');
    const m = berlinTime.getMinutes().toString().padStart(2, '0');
    const s = berlinTime.getSeconds().toString().padStart(2, '0');
    const timeStr = h + ':' + m + ':' + s;
    let asciiTime = "";
    
    for (let row = 0; row < 5; row++) {
      for (let char of timeStr) {
        asciiTime += digits[char === ':' ? 10 : parseInt(char)][row] + "  ";
      }
      asciiTime += "\n";
    }
    
    return asciiTime;
  }
  
  function updateClock() {
    const clockElement = document.getElementById('ascii-clock');
    if (clockElement) {
      clockElement.textContent = getAsciiTime();
    }
  }
  
  setInterval(updateClock, 1000);
  updateClock();
  
  const clockElement = document.getElementById('ascii-clock');
  clockElement.setAttribute('data-timezone', 'CEST / BERLIN');
  clockElement.classList.add('has-info');
  
  console.log('ASCII clock initialized with Berlin time');
});

document.addEventListener('DOMContentLoaded', function() {
  const cestCities = [
    "BERLIN", "PARIS", "ROME", "MADRID", "VIENNA", 
    "AMSTERDAM", "BRUSSELS", "COPENHAGEN", "WARSAW", "PRAGUE", 
    "BUDAPEST", "MUNICH", "MILAN", "BARCELONA", "ZURICH", 
    "GENEVA", "FRANKFURT", "HAMBURG", "LYON", "STOCKHOLM", 
    "OSLO", "VIENNA", "ZAGREB", "LJUBLJANA", "BRATISLAVA", 
    "BELGRADE", "BERN", "LUXEMBOURG", "MONACO", "VADUZ"
  ];
  
  const clockElement = document.querySelector('#ascii-clock');
  if (clockElement) {
    clockElement.addEventListener('mouseenter', () => {
      const randomCity = cestCities[Math.floor(Math.random() * cestCities.length)];
      cursor.classList.add('active', 'clock-hover');
      cursor.innerHTML = `CEST / ${randomCity}`;
    });
    
    clockElement.addEventListener('mouseleave', () => {
      cursor.classList.remove('active', 'clock-hover');
      cursor.innerHTML = '';
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      let targetPosition;
      
      if (targetId === '#content') {
        targetPosition = 0; 
      } else {
        const targetElement = document.querySelector(targetId);
        targetPosition = targetElement.offsetTop;
      }

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });

  function highlightNavigation() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    
    navItems.forEach(item => item.classList.remove('active'));
    
    if (scrollY < windowHeight * 0.3) {
        navItems.forEach(item => {
            if (item.getAttribute('href') === '#content') {
                item.classList.add('active');
            }
        });
        return;
    }
    
    let closestSection = null;
    let closestDistance = Infinity;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - windowHeight * 0.4;
        const sectionMiddle = sectionTop + (section.offsetHeight / 2);
        const distance = Math.abs(scrollY - sectionMiddle);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestSection = section;
        }
    });
    
    if (closestSection) {
        const sectionId = closestSection.getAttribute('id');
        navItems.forEach(item => {
            if (item.getAttribute('href') === `#${sectionId}`) {
                item.classList.add('active');
            }
        });
    }
  }

  highlightNavigation();

  window.addEventListener('scroll', highlightNavigation);
}); 

function openDajiaPopup(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const popup = document.getElementById('dajia-popup');
    if (popup) {
        popup.classList.add('active');
        document.body.style.overflow = 'hidden'; 
        
        if (window.location.hash !== '#dajia-popup') {
            history.pushState(null, null, '#dajia-popup');
        }
        
        document.addEventListener('keydown', handleEscapeKey);
    }
}

function closeDajiaPopup() {
    const popup = document.getElementById('dajia-popup');
    if (popup) {
        popup.classList.remove('active');
        document.body.style.overflow = ''; 
        
        if (window.location.hash === '#dajia-popup') {
            history.pushState(null, null, window.location.pathname + window.location.search);
        }
        
        document.removeEventListener('keydown', handleEscapeKey);
    }
}

function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        closeDajiaPopup();
    }
}

function copyPopupLink() {
    const url = window.location.origin + window.location.pathname + '#dajia-popup';
    
    navigator.clipboard.writeText(url).then(function() {
        const shareButton = document.querySelector('.popup-share');
        const originalIcon = shareButton.innerHTML;
        const originalColor = shareButton.style.color;
        
        shareButton.innerHTML = '<i class="fas fa-check"></i>';
        shareButton.style.color = '#28a745';
        
        setTimeout(() => {
            shareButton.innerHTML = originalIcon;
            shareButton.style.color = originalColor;
        }, 2000);
        
        console.log('Popup link copied to clipboard:', url);
    }).catch(function(err) {
        console.error('Failed to copy link to clipboard:', err);
        
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        const shareButton = document.querySelector('.popup-share');
        const originalIcon = shareButton.innerHTML;
        const originalColor = shareButton.style.color;
        
        shareButton.innerHTML = '<i class="fas fa-check"></i>';
        shareButton.style.color = '#28a745';
        
        setTimeout(() => {
            shareButton.innerHTML = originalIcon;
            shareButton.style.color = originalColor;
        }, 2000);
        
        console.log('Popup link copied to clipboard (fallback):', url);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const popup = document.getElementById('dajia-popup');
    if (popup) {
        popup.addEventListener('click', function(event) {
            if (event.target === popup) {
                closeDajiaPopup();
            }
        });
    }
    
    initializeTOC();
    
    if (window.location.hash === '#dajia-popup') {
        openDajiaPopup();
    }
    
    window.addEventListener('popstate', function(event) {
        if (window.location.hash === '#dajia-popup') {
            openDajiaPopup();
        } else {
            closeDajiaPopup();
        }
    });
    
    window.addEventListener('hashchange', function(event) {
        if (window.location.hash === '#dajia-popup') {
            openDajiaPopup();
        } else {
            const popup = document.getElementById('dajia-popup');
            if (popup && popup.classList.contains('active')) {
                closeDajiaPopup();
            }
        }
    });
}); 

function initializeTOC() {
    const tocItems = document.querySelectorAll('.toc-item');
    const sections = document.querySelectorAll('.popup-section h2, .popup-section h3, .popup-section h4');
    
    if (tocItems.length === 0 || sections.length === 0) return;
    
    const tocObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                if (sectionId) {
                    tocItems.forEach(item => item.classList.remove('active'));
                    
                    const activeTocItem = document.querySelector(`.toc-item[href="#${sectionId}"]`);
                    if (activeTocItem) {
                        activeTocItem.classList.add('active');
                    }
                }
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-20% 0px -60% 0px'
    });
    
    sections.forEach(section => {
        if (section.id) {
            tocObserver.observe(section);
        }
    });
    
    tocItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

