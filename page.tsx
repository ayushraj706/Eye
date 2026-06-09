import dynamic from 'next/dynamic'

// Dynamically import to avoid SSR issues with browser APIs
const YTMusicPlayer = dynamic(() => import('@/components/YTMusicPlayer'), {
  ssr: false,
})

export default function Home() {
  return (
    <main
      style={{
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#0f0f0f',
      }}
    >
      <YTMusicPlayer />
    </main>
  )
}
