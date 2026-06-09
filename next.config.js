/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Yeh line Next.js ke Font parser bug ko bypass kar degi
  optimizeFonts: false,
}

module.exports = nextConfig
