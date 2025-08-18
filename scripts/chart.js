
let listeningChart = null;


async function initializeChart() {
    try {
        
        const canvas = document.getElementById('listening-chart');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

        
        if (listeningChart instanceof Chart) {
            listeningChart.destroy();
        }

        
        const response = await fetch('weekly_chart.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}`);
        }
        const chartData = await response.json();
        console.log('Chart data:', chartData);

        
        const chartConfig = {
            type: 'line',
            data: {
                labels: chartData.data.map(d => d.day),
                datasets: [{
                    label: 'Tracks Played',
                    data: chartData.data.map(d => ({
                        x: d.day,
                        y: d.count,
                        date: d.date 
                    })),
                    backgroundColor: 'rgba(142, 141, 190, 0.0)',
                    borderColor: 'rgba(142, 141, 190, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
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
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
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
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                const date = new Date(point.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                });
                                return `${point.y} tracks on ${date}`;
                            }
                        }
                    }
                }
            }
        };

        
        listeningChart = new Chart(canvas, chartConfig);
        console.log('Chart initialized:', listeningChart);

        
        setupHoverEffects();

    } catch (error) {
        console.error('Failed to initialize chart:', error);
    }
}


function setupHoverEffects() {
    const musicBox = document.getElementById('box-lastfm');
    if (!musicBox) {
        console.error('Music box element not found');
        return;
    }

    
    musicBox.addEventListener('mouseenter', () => {
        if (listeningChart) {
            listeningChart.data.datasets[0].backgroundColor = 'rgba(142, 141, 190, 0.2)';
            listeningChart.update('none');
        }
    });

    
    musicBox.addEventListener('mouseleave', () => {
        if (listeningChart) {
            listeningChart.data.datasets[0].backgroundColor = 'rgba(142, 141, 190, 0.0)';
            listeningChart.update('none');
        }
    });
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChart);
} else {
    initializeChart();
}


window.updateChart = initializeChart;