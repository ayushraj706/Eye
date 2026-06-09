/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Allow YouTube Music domain in iframes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://music.youtube.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src https://music.youtube.com https://www.youtube.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' https: blob:",
              "connect-src 'self' https://music.youtube.com https://www.youtube.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
