import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NetraScope AI — Digital Eye Analysis System',
  description: 'Advanced multi-layer digital eye health screening tool. Educational use only.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  )
}
