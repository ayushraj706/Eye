'use client'

import React from 'react'
import { NowPlayingInfo } from '@/lib/ytmusicScraper'

interface NowPlayingBarProps {
  nowPlaying: NowPlayingInfo
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrev: () => void
}

export default function NowPlayingBar({
  nowPlaying,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
}: NowPlayingBarProps) {
  const progress = nowPlaying.duration > 0
    ? (nowPlaying.currentTime / nowPlaying.duration) * 100
    : 0

  return (
    <div
      className="now-playing-bar"
      style={{
        background: 'rgba(15,15,15,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #ff0000, #ff4444)',
            transition: 'width 1s linear',
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
            background: '#1a1a1a',
          }}
        >
          {nowPlaying.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nowPlaying.thumbnailUrl}
              alt={nowPlaying.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: '#f1f1f1',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {nowPlaying.title}
          </p>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: '#aaaaaa',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {nowPlaying.artist}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <ControlButton onClick={onPrev} label="Previous">
            <PrevIcon />
          </ControlButton>
          <ControlButton
            onClick={isPlaying ? onPause : onPlay}
            label={isPlaying ? 'Pause' : 'Play'}
            primary
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </ControlButton>
          <ControlButton onClick={onNext} label="Next">
            <NextIcon />
          </ControlButton>
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  onClick,
  label,
  children,
  primary = false,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: primary ? 40 : 36,
        height: primary ? 40 : 36,
        borderRadius: '50%',
        border: 'none',
        background: primary ? '#ff0000' : 'rgba(255,255,255,0.08)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'transform 0.1s, background 0.2s',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.92)')}
      onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  )
}

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)

const NextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
)

const PrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
  </svg>
)
