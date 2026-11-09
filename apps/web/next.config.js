/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://127.0.0.1:3001/api/:path*' },
      { source: '/events/socket.io/:path*', destination: 'http://127.0.0.1:3001/events/socket.io/:path*' }
    ];
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
    ] }];
  }
};
module.exports = nextConfig;
