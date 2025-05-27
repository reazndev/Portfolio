require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Configure CORS
app.use(cors({
    origin: ['https://reazn.tech', 'https://stats.reazn.tech', 'https://gh.reazn.tech'],
    methods: ['GET'],
    credentials: true
}));

app.use(express.json());

// Check if GitHub token is available
if (!process.env.GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN is not set in .env file');
  process.exit(1);
}

const DEFAULT_COLORS = {
  background: '#ffffff',
  border: '#ebedf0',
  inactive: '#ebedf0',
  minActivity: '#9be9a8',
  maxActivity: '#216e39'
};

async function fetchContributions(username, from, to) {
  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post('https://api.github.com/graphql', {
      query,
      variables: { username, from, to }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    return response.data.data.user.contributionsCollection.contributionCalendar;
  } catch (error) {
    console.error('Error fetching GitHub contributions:', error);
    throw error;
  }
}

function interpolateColor(color1, color2, factor) {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);
  
  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function generateColorGradient(minColor, maxColor, steps) {
  const colors = [];
  for (let i = 0; i < steps; i++) {
    colors.push(interpolateColor(minColor, maxColor, i / (steps - 1)));
  }
  return colors;
}

function getMonthLabel(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[new Date(date).getMonth()];
}

function generateSVG(contributions, options = {}) {
  if (!contributions || !contributions.weeks || !Array.isArray(contributions.weeks)) {
    throw new Error('Invalid contributions data');
  }

  const {
    boxSize = 10,
    boxSpacing = 2,
    borderRadius = 2,
    backgroundColor = DEFAULT_COLORS.background,
    borderColor = DEFAULT_COLORS.border,
    inactiveColor = DEFAULT_COLORS.inactive,
    minActivityColor = DEFAULT_COLORS.minActivity,
    maxActivityColor = DEFAULT_COLORS.maxActivity,
    showLabels = true,
    labelColor = '#24292f'
  } = options;

  // Ensure all numeric values are valid
  const validBoxSize = Math.max(1, Number(boxSize) || 10);
  const validBoxSpacing = Math.max(0, Number(boxSpacing) || 2);
  const validBorderRadius = Math.max(0, Number(borderRadius) || 2);

  const weeks = contributions.weeks;
  const boxWidth = validBoxSize;
  const boxHeight = validBoxSize;
  const labelHeight = showLabels ? 20 : 0; // Height for month labels
  const width = (boxWidth + validBoxSpacing) * weeks.length;
  const height = (boxHeight + validBoxSpacing) * 7 + labelHeight;

  // Find the maximum contribution count
  let maxCount = 0;
  weeks.forEach(week => {
    week.contributionDays.forEach(day => {
      maxCount = Math.max(maxCount, day.contributionCount);
    });
  });

  // Generate color gradient
  const activityColors = generateColorGradient(minActivityColor, maxActivityColor, 4);
  
  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" 
             xmlns="http://www.w3.org/2000/svg" style="background-color: ${backgroundColor}">`;

  // Add month labels if enabled
  if (showLabels) {
    let currentMonth = '';
    let monthStartX = 0;
    let monthLabelWidth = 0;
    
    weeks.forEach((week, weekIndex) => {
      if (week.contributionDays && week.contributionDays.length > 0) {
        const firstDayOfWeek = week.contributionDays[0].date;
        const month = getMonthLabel(firstDayOfWeek);
        
        if (month !== currentMonth) {
          // If it's a new month, add the label
          if (monthLabelWidth > 0) {
            // Add the previous month label centered over its weeks
            const labelX = monthStartX + (monthLabelWidth - 30) / 2; // 30 is approximate text width
            svg += `<text x="${labelX}" y="15" font-family="Arial" font-size="12" fill="${labelColor}">${currentMonth}</text>`;
          }
          currentMonth = month;
          monthStartX = weekIndex * (boxWidth + validBoxSpacing);
          monthLabelWidth = 0;
        }
        monthLabelWidth += (boxWidth + validBoxSpacing);
      }
    });
    
    // Add the last month label
    if (monthLabelWidth > 0) {
      const labelX = monthStartX + (monthLabelWidth - 30) / 2;
      svg += `<text x="${labelX}" y="15" font-family="Arial" font-size="12" fill="${labelColor}">${currentMonth}</text>`;
    }
  }

  // Add contribution boxes
  weeks.forEach((week, weekIndex) => {
    if (!week.contributionDays || !Array.isArray(week.contributionDays)) return;
    
    week.contributionDays.forEach((day, dayIndex) => {
      if (!day || typeof day.contributionCount !== 'number') return;
      
      const x = weekIndex * (boxWidth + validBoxSpacing);
      const y = dayIndex * (boxHeight + validBoxSpacing) + labelHeight; // Offset by labelHeight
      
      const count = day.contributionCount;
      let color = inactiveColor;

      if (count > 0) {
        const level = Math.min(3, Math.floor((count / maxCount) * 4));
        color = activityColors[level];
      }

      // Format the date for the tooltip
      const date = new Date(day.date);
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Create the contribution text
      const contributionText = count === 0 
        ? 'No contributions' 
        : `${count} contribution${count === 1 ? '' : 's'}`;

      svg += `<g>
        <title>${formattedDate}\n${contributionText}</title>
        <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" 
              rx="${validBorderRadius}" ry="${validBorderRadius}" fill="${color}"/>
      </g>`;
    });
  });

  svg += '</svg>';
  return svg;
}

function calculateDateRange(months = 12) {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  
  // Set to beginning of day for 'from' and end of day for 'to'
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

app.get('/contributions/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { 
      months,
      from,
      to,
      boxSize = '10',
      boxSpacing = '2',
      borderRadius = '2',
      backgroundColor = DEFAULT_COLORS.background,
      borderColor = DEFAULT_COLORS.border,
      inactiveColor = DEFAULT_COLORS.inactive,
      minActivityColor = DEFAULT_COLORS.minActivity,
      maxActivityColor = DEFAULT_COLORS.maxActivity,
      showLabels = 'true',
      labelColor = '#24292f'
    } = req.query;

    // Calculate date range based on months parameter or use provided from/to dates
    let dateRange;
    if (months) {
      dateRange = calculateDateRange(parseInt(months));
    } else if (from && to) {
      dateRange = { from, to };
    } else {
      dateRange = calculateDateRange(12); // Default to 12 months
    }

    const contributions = await fetchContributions(username, dateRange.from, dateRange.to);
    
    const svg = generateSVG(contributions, {
      boxSize: Number(boxSize) || 10,
      boxSpacing: Number(boxSpacing) || 2,
      borderRadius: Number(borderRadius) || 2,
      backgroundColor,
      borderColor,
      inactiveColor,
      minActivityColor,
      maxActivityColor,
      showLabels: showLabels !== 'false',
      labelColor
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch contributions', details: error.message });
  }
});

const startServer = async (initialPort) => {
  const findAvailablePort = async (startPort) => {
    let port = startPort;
    while (port < startPort + 10) { // Try up to 10 ports
      try {
        await new Promise((resolve, reject) => {
          const server = app.listen(port)
            .once('error', () => {
              port++;
              server.close();
              resolve(false);
            })
            .once('listening', () => {
              resolve(true);
            });
        });
        return port;
      } catch (err) {
        port++;
      }
    }
    throw new Error('No available ports found');
  };

  try {
    const port = await findAvailablePort(initialPort);
    console.log(`Server running on port ${port}`);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer(process.env.PORT || 3003); 