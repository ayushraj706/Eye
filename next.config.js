/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export ke liye zaroori
  output: 'export',
  
  // URL path fix karne ke liye
  trailingSlash: true,
  
  // Images optimization static site ke liye band karna zaroori hai
  images: {
    unoptimized: true,
  },
  
  // Headers hata diye gaye hain kyunki static export mein ye server-side kaam nahi karte.
  // CSP (Content Security Policy) agar zaroori hai, toh use 'layout.tsx' mein 
  // <meta http-equiv="Content-Security-Policy" content="..."> tag ki tarah daalna.
}

module.exports = nextConfig
