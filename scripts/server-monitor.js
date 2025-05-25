const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.MONITOR_PORT || 3004;

app.use(cors({
    origin: ['http://100.64.190.77:3004/stats', 'http://100.64.190.77:3004/stats'],
    methods: ['GET'],
    credentials: false
}));

// Function to get CPU temperature on Windows using wmic
function getWindowsCpuTemp() {
    return new Promise((resolve) => {
        exec('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature', (error, stdout) => {
            if (error) {
                console.error('Error reading Windows CPU temperature:', error);
                resolve(null);
                return;
            }
            try {
                // Parse the output - it's in tenths of Kelvin
                const lines = stdout.split('\n').filter(line => line.trim());
                if (lines.length >= 2) {
                    const temp = parseInt(lines[1]);
                    if (!isNaN(temp)) {
                        // Convert from tenths of Kelvin to Celsius
                        const celsius = Math.round((temp / 10 - 273.15) * 10) / 10;
                        resolve(celsius);
                        return;
                    }
                }
                resolve(null);
            } catch (e) {
                console.error('Error parsing Windows CPU temperature:', e);
                resolve(null);
            }
        });
    });
}

// Function to get CPU temperature based on platform
async function getCpuTemp() {
    if (process.platform === 'win32') {
        return await getWindowsCpuTemp();
    } else if (process.platform === 'linux') {
        return new Promise((resolve) => {
            exec('cat /sys/class/thermal/thermal_zone0/temp', (error, stdout) => {
                if (error) {
                    console.error('Error reading Linux CPU temperature:', error);
                    resolve(null);
                    return;
                }
                // Convert temperature from millidegrees to degrees Celsius
                const temp = parseInt(stdout) / 1000;
                resolve(temp);
            });
        });
    }
    return null;
}

// Function to get detailed CPU usage
function getCpuUsage() {
    const cpus = os.cpus();
    const usage = cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
        const idle = cpu.times.idle;
        return 100 - (idle / total * 100);
    });
    return usage.reduce((acc, val) => acc + val, 0) / cpus.length;
}

// Function to format bytes into human readable format
function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

app.get('/stats', async (req, res) => {
    try {
        // Get CPU usage
        const cpuUsage = Math.round(getCpuUsage());

        // Get memory usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const ramUsage = Math.round((usedMem / totalMem) * 100);

        // Get CPU temperature
        const cpuTemp = await getCpuTemp();

        // Get system uptime in hours
        const uptimeHours = Math.floor(os.uptime() / 3600);

        // Get load averages for 1, 5, and 15 minutes
        const loadAvg = os.loadavg();

        const stats = {
            cpuUsage,
            ram: {
                usage: ramUsage,
                total: formatBytes(totalMem),
                used: formatBytes(usedMem),
                free: formatBytes(freeMem)
            },
            cpuTemp: cpuTemp !== null ? Math.round(cpuTemp * 10) / 10 : 'N/A',
            platform: process.platform,
            uptime: uptimeHours,
            loadAverage: {
                '1min': Math.round(loadAvg[0] * 100) / 100,
                '5min': Math.round(loadAvg[1] * 100) / 100,
                '15min': Math.round(loadAvg[2] * 100) / 100
            },
            timestamp: new Date().toISOString()
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting server stats:', error);
        res.status(500).json({ error: 'Failed to get server stats' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

app.listen(port, () => {
    console.log(`Server monitoring service running on port ${port}`);
    console.log(`Access stats at: http://localhost:${port}/stats`);
    console.log(`Health check at: http://localhost:${port}/health`);
    console.log(`Platform: ${process.platform}`);
}); 