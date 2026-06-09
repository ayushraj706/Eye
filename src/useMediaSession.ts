'use client'

import { useEffect, useRef, useCallback } from 'react'

export interface MediaMetadata {
  title: string
  artist: string
  album: string
  artwork: string
}

export interface MediaSessionHandlers {
  onPlay?: () => void
  onPause?: () => void
  onNextTrack?: () => void
  onPreviousTrack?: () => void
  onSeekForward?: () => void
  onSeekBackward?: () => void
  onStop?: () => void
}

/**
 * useMediaSession
 *
 * Pushes rich metadata to the Android OS via navigator.mediaSession.
 * This is what makes Origin Island (Vivo), Samsung Now Bar, and
 * Android system controls recognize this app as a real media player.
 *
 * Key insight: Android reads MediaSession metadata from the foreground
 * web context. Capacitor's WebView exposes this to the OS via
 * MediaSessionService, which in turn powers:
 *  - Lock screen controls
 *  - Notification media controls
 *  - Vivo Origin Island music pill
 *  - Android Auto (with additional setup)
 */
export function useMediaSession(
  metadata: MediaMetadata | null,
  handlers: MediaSessionHandlers = {},
  playbackState: 'playing' | 'paused' | 'none' = 'none'
) {
  const positionRef = useRef(0)
  const durationRef = useRef(0)

  const updateMetadata = useCallback((meta: MediaMetadata) => {
    if (!('mediaSession' in navigator)) {
      console.warn('[MediaSession] Not supported in this browser/WebView')
      return
    }

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: meta.title || 'Unknown Track',
        artist: meta.artist || 'Unknown Artist',
        album: meta.album || '',
        artwork: [
          { src: meta.artwork, sizes: '96x96', type: 'image/jpeg' },
          { src: meta.artwork, sizes: '128x128', type: 'image/jpeg' },
          { src: meta.artwork, sizes: '192x192', type: 'image/jpeg' },
          { src: meta.artwork, sizes: '256x256', type: 'image/jpeg' },
          { src: meta.artwork, sizes: '384x384', type: 'image/jpeg' },
          { src: meta.artwork, sizes: '512x512', type: 'image/jpeg' },
        ].filter(a => a.src),
      })
      console.log('[MediaSession] Metadata updated:', meta.title, '→', meta.artist)
    } catch (err) {
      console.error('[MediaSession] Failed to set metadata:', err)
    }
  }, [])

  const updatePlaybackState = useCallback((state: 'playing' | 'paused' | 'none') => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = state
    } catch (err) {
      console.error('[MediaSession] Failed to set playback state:', err)
    }
  }, [])

  const updatePositionState = useCallback((
    duration: number,
    position: number,
    playbackRate = 1
  ) => {
    if (!('mediaSession' in navigator)) return
    if (!('setPositionState' in navigator.mediaSession)) return
    try {
      if (duration > 0 && position >= 0 && position <= duration) {
        navigator.mediaSession.setPositionState({
          duration,
          position,
          playbackRate,
        })
        positionRef.current = position
        durationRef.current = duration
      }
    } catch (err) {
      // Some older WebViews don't support setPositionState — silent fail
    }
  }, [])

  // Register action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const actionMap: Record<string, MediaSessionActionHandler | null> = {
      play: handlers.onPlay ?? null,
      pause: handlers.onPause ?? null,
      nexttrack: handlers.onNextTrack ?? null,
      previoustrack: handlers.onPreviousTrack ?? null,
      seekforward: handlers.onSeekForward ?? null,
      seekbackward: handlers.onSeekBackward ?? null,
      stop: handlers.onStop ?? null,
    }

    const registered: string[] = []

    for (const [action, handler] of Object.entries(actionMap)) {
      if (handler) {
        try {
          navigator.mediaSession.setActionHandler(
            action as MediaSessionAction,
            handler
          )
          registered.push(action)
        } catch {
          // Action not supported — skip
        }
      }
    }

    console.log('[MediaSession] Registered handlers:', registered)

    return () => {
      // Cleanup handlers on unmount
      for (const action of registered) {
        try {
          navigator.mediaSession.setActionHandler(
            action as MediaSessionAction,
            null
          )
        } catch { /* ignore */ }
      }
    }
  }, [handlers])

  // Update metadata when it changes
  useEffect(() => {
    if (metadata) {
      updateMetadata(metadata)
    }
  }, [metadata, updateMetadata])

  // Update playback state
  useEffect(() => {
    updatePlaybackState(playbackState)
  }, [playbackState, updatePlaybackState])

  return { updatePositionState }
}
