'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useMediaSession, MediaMetadata } from '@/hooks/useMediaSession'
import { generateAdBlockScript } from '@/lib/adBlocker'
import { generateScraperScript, NowPlayingInfo } from '@/lib/ytmusicScraper'
import { setStatusBarDark, setupBackButtonHandler, triggerHaptic, isCapacitor } from '@/lib/capacitorBridge'
import NowPlayingBar from './NowPlayingBar'
import LoadingScreen from './LoadingScreen'
import TopBar from './TopBar'

const YT_MUSIC_URL = 'https://music.youtube.com'

export default function YTMusicPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null)
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'none'>('none')
  const [mediaMetadata, setMediaMetadata] = useState<MediaMetadata | null>(null)

  // ─── MediaSession handlers → these trigger from lock screen / Origin Island ───
  const sendCommand = useCallback((cmd: string, payload?: object) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: cmd, ...payload },
      YT_MUSIC_URL
    )
  }, [])

  const { updatePositionState } = useMediaSession(
    mediaMetadata,
    {
      onPlay: () => {
        sendCommand('YTMW_CMD_PLAY')
        triggerHaptic('light')
      },
      onPause: () => {
        sendCommand('YTMW_CMD_PAUSE')
        triggerHaptic('light')
      },
      onNextTrack: () => {
        sendCommand('YTMW_CMD_NEXT')
        triggerHaptic('medium')
      },
      onPreviousTrack: () => {
        sendCommand('YTMW_CMD_PREV')
        triggerHaptic('medium')
      },
      onSeekForward: () => {
        if (nowPlaying) {
          const newTime = Math.min(nowPlaying.currentTime + 10, nowPlaying.duration)
          sendCommand('YTMW_CMD_SEEK', { time: newTime })
        }
      },
      onSeekBackward: () => {
        if (nowPlaying) {
          const newTime = Math.max(nowPlaying.currentTime - 10, 0)
          sendCommand('YTMW_CMD_SEEK', { time: newTime })
        }
      },
    },
    playbackState
  )

  // ─── Listen to messages from iframe (scraper output) ───
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== YT_MUSIC_URL && event.origin !== window.location.origin) return

      const { type, payload } = event.data || {}

      if (type === 'YTMW_NOW_PLAYING' && payload) {
        const info = payload as NowPlayingInfo
        setNowPlaying(info)
        setPlaybackState(info.isPlaying ? 'playing' : 'paused')

        // Update MediaSession metadata for Origin Island
        if (info.title && info.title !== 'Unknown') {
          setMediaMetadata({
            title: info.title,
            artist: info.artist,
            album: info.album,
            artwork: info.thumbnailUrl,
          })
        }
      }

      if (type === 'YTMW_POSITION' && payload) {
        const { currentTime, duration, isPlaying } = payload
        setPlaybackState(isPlaying ? 'playing' : 'paused')
        if (duration > 0) {
          updatePositionState(duration, currentTime, 1)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [updatePositionState])

  // ─── Inject scripts when iframe loads ───
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false)
    setIsLoaded(true)

    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    // Inject ad blocker + scraper into iframe context
    const injectScript = (scriptContent: string, name: string) => {
      try {
        // Capacitor WebView allows this via custom scheme
        const doc = iframe.contentDocument
        if (doc) {
          const script = doc.createElement('script')
          script.textContent = scriptContent
          ;(doc.head || doc.documentElement).appendChild(script)
          console.log(`[YTMWrapper] ${name} injected via contentDocument`)
          return
        }
      } catch {
        // Cross-origin fallback
      }

      // Fallback: postMessage (requires cooperation from page)
      iframe.contentWindow?.postMessage(
        { type: 'YTMW_INJECT', script: scriptContent },
        YT_MUSIC_URL
      )
      console.log(`[YTMWrapper] ${name} sent via postMessage`)
    }

    // Small delay to ensure YTM DOM is ready
    setTimeout(() => {
      injectScript(generateAdBlockScript(), 'AdBlocker')
      injectScript(generateScraperScript(), 'Scraper')
    }, 1500)

    // Re-inject after navigation within YTM
    setTimeout(() => {
      injectScript(generateAdBlockScript(), 'AdBlocker (retry)')
      injectScript(generateScraperScript(), 'Scraper (retry)')
    }, 4000)
  }, [])

  // ─── Capacitor setup ───
  useEffect(() => {
    setStatusBarDark()

    const cleanup = setupBackButtonHandler(() => {
      // Let iframe handle its own back navigation
      iframeRef.current?.contentWindow?.history.back()
      return true
    })

    return cleanup
  }, [])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" style={{ height: '100dvh' }}>

      {/* Loading screen */}
      {isLoading && <LoadingScreen />}

      {/* Top overlay bar */}
      <TopBar isLoaded={isLoaded} />

      {/* YouTube Music WebView */}
      <iframe
        ref={iframeRef}
        id="yt-frame"
        src={YT_MUSIC_URL}
        title="YouTube Music"
        onLoad={handleIframeLoad}
        className="w-full border-0"
        style={{
          height: nowPlaying ? 'calc(100dvh - 80px)' : '100dvh',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation"
        referrerPolicy="no-referrer-when-downgrade"
        loading="eager"
      />

      {/* Now Playing Bar — feeds Origin Island data */}
      {nowPlaying && nowPlaying.title !== 'Unknown' && (
        <NowPlayingBar
          nowPlaying={nowPlaying}
          isPlaying={playbackState === 'playing'}
          onPlay={() => {
            sendCommand('YTMW_CMD_PLAY')
            triggerHaptic('light')
          }}
          onPause={() => {
            sendCommand('YTMW_CMD_PAUSE')
            triggerHaptic('light')
          }}
          onNext={() => {
            sendCommand('YTMW_CMD_NEXT')
            triggerHaptic('medium')
          }}
          onPrev={() => {
            sendCommand('YTMW_CMD_PREV')
            triggerHaptic('medium')
          }}
        />
      )}
    </div>
  )
}
