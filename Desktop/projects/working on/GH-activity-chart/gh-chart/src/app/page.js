'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import GitHubActivityChart from '../components/GitHubActivityChart';
import GridBackground from '../components/GridBackground';

const calculateDateRange = (timeframe) => {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case 'last6months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case 'last3months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'last12months':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      return { startDate: null, endDate: null };
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

const timeframeOptions = [
  { value: '', label: 'All time' },
  { value: 'last3months', label: 'Last 3 months' },
  { value: 'last6months', label: 'Last 6 months' },
  { value: 'last12months', label: 'Last 12 months' }
];

export default function Home() {
  const searchParams = useSearchParams();
  
  // Form state
  const [formState, setFormState] = useState({
    username: searchParams.get('username') || 'florianruby',
    startColor: searchParams.get('startColor') || '#ebedf0',
    endColor: searchParams.get('endColor') || '#7e14eb',
    borderRadius: searchParams.get('borderRadius') || '2px',
    showMonthLabels: searchParams.get('showMonthLabels') !== 'false',
    showWeekdayLabels: searchParams.get('showWeekdayLabels') !== 'false',
    labelColor: searchParams.get('labelColor') || '#959da5',
    showContributionCount: searchParams.get('showContributionCount') !== 'false',
    timeframe: searchParams.get('timeframe') || ''
  });

  // Generate URL based on form state
  const generateUrl = () => {
    const params = new URLSearchParams();
    Object.entries(formState).forEach(([key, value]) => {
      if (value !== '' && value !== null) {
        if (typeof value === 'boolean') {
          if (!value) params.append(key, 'false');
        } else {
          params.append(key, value);
        }
      }
    });
    return `${window.location.origin}/?${params.toString()}`;
  };

  const [generatedUrl, setGeneratedUrl] = useState('');
  
  useEffect(() => {
    setGeneratedUrl(generateUrl());
  }, [formState]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      alert('URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Calculate date range based on timeframe
  const dateRange = formState.timeframe ? calculateDateRange(formState.timeframe) : {};

  return (
    <>
      <GridBackground />
      <div className="gradient-overlay" />
      <main className="min-h-screen bg-transparent text-gray-100 relative">
        <div className="max-w-6xl mx-auto p-8 relative z-10">
          <h1 className="text-4xl font-bold mb-8 text-center glow-text">
            GitHub Activity Chart Generator
          </h1>
          
          {/* Settings and Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Settings Form */}
            <div className="glass rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-white/90">Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-white/80">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formState.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-md glass-input focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/80">Start Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="startColor"
                      value={formState.startColor}
                      onChange={handleInputChange}
                      className="h-10 w-20 bg-transparent rounded-md"
                    />
                    <input
                      type="text"
                      value={formState.startColor}
                      onChange={handleInputChange}
                      name="startColor"
                      className="flex-1 px-3 py-2 rounded-md glass-input focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/80">End Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="endColor"
                      value={formState.endColor}
                      onChange={handleInputChange}
                      className="h-10 w-20 bg-transparent rounded-md"
                    />
                    <input
                      type="text"
                      value={formState.endColor}
                      onChange={handleInputChange}
                      name="endColor"
                      className="flex-1 px-3 py-2 rounded-md glass-input focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/80">Label Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="labelColor"
                      value={formState.labelColor}
                      onChange={handleInputChange}
                      className="h-10 w-20 bg-transparent rounded-md"
                    />
                    <input
                      type="text"
                      value={formState.labelColor}
                      onChange={handleInputChange}
                      name="labelColor"
                      className="flex-1 px-3 py-2 rounded-md glass-input focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/80">Border Radius (px)</label>
                  <input
                    type="number"
                    name="borderRadius"
                    value={formState.borderRadius.replace('px', '')}
                    onChange={(e) => handleInputChange({
                      target: {
                        name: 'borderRadius',
                        value: `${e.target.value}px`
                      }
                    })}
                    className="w-full px-3 py-2 rounded-md glass-input focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/80">Time Range</label>
                  <select
                    name="timeframe"
                    value={formState.timeframe}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-md glass-input focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {timeframeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleInputChange({
                        target: {
                          name: 'showMonthLabels',
                          type: 'checkbox',
                          checked: !formState.showMonthLabels
                        }
                      })}
                      className={`toggle-button w-full ${formState.showMonthLabels ? 'active' : ''}`}
                    >
                      Show Month Labels
                    </button>
                    <div className="mt-1 text-amber-400 text-xs italic">
                      Note: Month labels positioning may not work - it's advised to not use it.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInputChange({
                      target: {
                        name: 'showWeekdayLabels',
                        type: 'checkbox',
                        checked: !formState.showWeekdayLabels
                      }
                    })}
                    className={`toggle-button w-full ${formState.showWeekdayLabels ? 'active' : ''}`}
                  >
                    Show Weekday Labels
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange({
                      target: {
                        name: 'showContributionCount',
                        type: 'checkbox',
                        checked: !formState.showContributionCount
                      }
                    })}
                    className={`toggle-button w-full ${formState.showContributionCount ? 'active' : ''}`}
                  >
                    Show Contribution Count
                  </button>
                </div>
              </div>
            </div>

            {/* Preview, URL, and Support Section */}
            <div className="glass rounded-lg p-6 space-y-8">
              {/* Preview Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-white/90">Live Preview</h2>
                <GitHubActivityChart 
                  {...formState}
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                />
              </div>

              {/* Generated URL Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-white/90">Generated URL</h2>
                <div className="space-y-4">
                  <pre className="glass-input p-4 rounded-md overflow-x-auto text-sm">
                    <code className="text-white/90">{generatedUrl}</code>
                  </pre>
                  <button
                    onClick={copyToClipboard}
                    className="w-full px-4 py-2 glass-input hover:bg-blue-500/20 rounded-md transition-all duration-300 text-white/90 border border-white/10 hover:border-white/20"
                  >
                    Copy URL
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 text-white/90">Embed Code</h3>
                <pre className="glass-input p-4 rounded-md overflow-x-auto text-sm mb-8">
                  <code className="text-white/90">{`<img src="${generatedUrl}" alt="GitHub Contribution Chart" />`}</code>
                </pre>

                <div className="border-t border-white/10 pt-8">
                  <h3 className="text-xl font-semibold mb-4 text-white/90">Support the Project</h3>
                  <p className="text-white/80 mb-4">
                    If you find this tool useful, consider checking out my other projects..
                  </p>
                  <a
                    href="https://github.com/florianruby"
            target="_blank"
            rel="noopener noreferrer"
                    className="support-link"
          >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <span>Check out my GitHub</span>
          </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
