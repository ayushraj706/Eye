import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Next.js ka official tareeka font load karne ka
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YT Music',
  description: 'YouTube Music — Enhanced',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'YT Music',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0F0F0F',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      {/* inter.className se font automatically apply ho jayega */}
      <body className={`${inter.className} bg-black text-white overscroll-none`}>
        {children}
      </body>
    </html>
  )
}
