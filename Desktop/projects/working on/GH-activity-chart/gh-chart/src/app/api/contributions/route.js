import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const query = `
      query($username: String!, $from: DateTime, $to: DateTime) {
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

    const variables = {
      username,
      from: startDate ? new Date(startDate).toISOString() : undefined,
      to: endDate ? new Date(endDate).toISOString() : undefined
    };

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    const calendar = data.data.user.contributionsCollection.contributionCalendar;
    
    // Transform the data into the format we need
    const contributions = [];
    const dates = [];
    let currentWeek = [];
    let currentWeekDates = [];

    calendar.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        currentWeek.push(day.contributionCount);
        currentWeekDates.push(day.date);
        
        if (currentWeek.length === 7) {
          contributions.push(currentWeek);
          dates.push(...currentWeekDates);
          currentWeek = [];
          currentWeekDates = [];
        }
      });
    });

    // Add any remaining days
    if (currentWeek.length > 0) {
      // Pad the week with zeros if needed
      while (currentWeek.length < 7) {
        currentWeek.push(0);
        currentWeekDates.push(null);
      }
      contributions.push(currentWeek);
      dates.push(...currentWeekDates);
    }

    return NextResponse.json({
      contributions,
      dates,
      dateRange: {
        totalContributions: calendar.totalContributions,
      }
    });

  } catch (error) {
    console.error('Error fetching contributions:', error);
    return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 });
  }
} 