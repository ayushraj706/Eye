'use client'

import React from 'react'

interface TopBarProps {
  isLoaded: boolean
}

export default function TopBar({ isLoaded }: TopBarProps) {
  if (!isLoaded) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'env(safe-area-inset-top, 0px)',
        background: '#0f0f0f',
        zIndex: 150,
        pointerEvents: 'none',
      }}
    />
  )
}
