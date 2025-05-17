/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static exports
  distDir: 'dist',   // Change build output directory
  images: {
    unoptimized: true, // Required for static export
  },
  basePath: process.env.NODE_ENV === 'production' ? '/GH-activity-chart' : '',
};

if (process.env.NODE_ENV === 'development') {
  Object.assign(nextConfig, {
    server: {
      port: 3010,
    },
  });
}

export default nextConfig;
