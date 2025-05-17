'use client';

import { useEffect, useState } from 'react';

const interpolateColor = (color1, color2, factor) => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.slice(0, 2), 16);
  const g1 = parseInt(hex1.slice(2, 4), 16);
  const b1 = parseInt(hex1.slice(4, 6), 16);
  
  const r2 = parseInt(hex2.slice(0, 2), 16);
  const g2 = parseInt(hex2.slice(2, 4), 16);
  const b2 = parseInt(hex2.slice(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GitHubActivityChart = ({ 
  username, 
  startColor = '#ebedf0', 
  endColor = '#7e14eb',
  emptyColor = '#ebedf0',
  borderRadius = '2px',
  showMonthLabels = true,
  showWeekdayLabels = true,
  labelColor = '#959da5',
  showContributionCount = true,
  startDate,
  endDate
}) => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxContributions, setMaxContributions] = useState(0);
  const [dates, setDates] = useState([]);
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        let url = `/api/contributions?username=${username}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch contributions');
        }
        const data = await response.json();
        setContributions(data.contributions);
        setDates(data.dates);
        setDateRange(data.dateRange);
        const max = Math.max(...data.contributions.flat());
        setMaxContributions(max);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchContributions();
    }
  }, [username, startDate, endDate]);

  const getColor = (contributionCount) => {
    if (contributionCount === 0) return emptyColor;
    const factor = contributionCount / maxContributions;
    return interpolateColor(startColor, endColor, factor);
  };

  if (loading) return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  const formattedBorderRadius = /^\d+$/.test(borderRadius) ? `${borderRadius}px` : borderRadius;

  // Get unique months and years from dates
  const monthLabels = dates.length > 0 ? dates.reduce((acc, date, weekIndex) => {
    if (weekIndex % 7 === 0) { // First day of each week
      const currentDate = new Date(date);
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();
      
      // Check if this is the first week containing this month
      const prevDate = weekIndex > 0 ? new Date(dates[weekIndex - 7]) : null;
      if (!prevDate || prevDate.getMonth() !== month) {
        // Calculate the exact week number for positioning
        const weekNumber = Math.floor(weekIndex / 7);
        
        acc.push({
          month: MONTHS[month],
          year: year,
          weekIndex: weekNumber
        });
      }
    }
    return acc;
  }, []) : [];

  return (
    <div className="w-full overflow-x-auto">
      {showMonthLabels && monthLabels.length > 0 && (
        <>
          <div className="flex pl-8 text-xs mb-1">
            {monthLabels.map((label, index) => {
              const showYear = index === 0 || label.year !== monthLabels[index - 1]?.year;
              const position = 75 + (label.weekIndex * 13); 
              
              return showYear ? (
                <div
                  key={`year-${label.year}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    color: labelColor,
                    position: 'absolute',
                    left: position + 'px',
                    transform: 'translateX(-8px)',
                  }}
                >
                  {label.year}
                </div>
              ) : null;
            })}
          </div>
          <div className="flex pl-8 text-xs mb-1 relative">
            {monthLabels.map((label, index) => {
              const position = 75 + (label.weekIndex * 13); 
              
              return (
                <div
                  key={`${label.month}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    color: labelColor,
                    position: 'absolute',
                    left: position + 'px',
                    transform: 'translateX(-8px)',
                  }}
                >
                  {label.month}
                </div>
              );
            })}
          </div>
        </>
      )}
      <div className="flex">
        {showWeekdayLabels && (
          <div className="flex flex-col gap-[3px] mr-2 text-xs justify-around py-4 w-8">
            {WEEKDAYS.map((day, index) => (
              <div key={day} style={{ color: labelColor }} className="text-right">
                {index % 2 === 0 ? day : ''}
              </div>
            ))}
          </div>
        )}
        <div className="inline-flex gap-[3px] p-4">
          {contributions.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className="w-[10px] h-[10px] transition-colors duration-200"
                  style={{
                    backgroundColor: getColor(day),
                    borderRadius: formattedBorderRadius
                  }}
                  title={dates[weekIndex * 7 + dayIndex] ? 
                    `${day} contributions on ${new Date(dates[weekIndex * 7 + dayIndex]).toDateString()}` : 
                    `${day} contributions`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {dateRange && showContributionCount && (
        <div className="text-xs mt-2" style={{ color: labelColor }}>
          {dateRange.totalContributions.toLocaleString()} contributions in the last year
        </div>
      )}
    </div>
  );
};

export default GitHubActivityChart; 