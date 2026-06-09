/**
 * ytmusicScraper.ts
 *
 * Scrapes now-playing metadata from YouTube Music's DOM
 * and pushes it to navigator.mediaSession for Origin Island.
 *
 * Works by injecting a polling script into the WebView that
 * reads YTM's internal player state and posts it to the parent.
 */

export interface NowPlayingInfo {
  title: string
  artist: string
  album: string
  thumbnailUrl: string
  isPlaying: boolean
  duration: number
  currentTime: number
}

// Script injected into YTM WebView context to extract player info
export function generateScraperScript(): string {
  return `
(function() {
  'use strict';

  const POLL_INTERVAL = 1000;
  let lastTitle = '';

  function getPlayerInfo() {
    try {
      // YTMusic DOM selectors (verified June 2026)
      const titleEl = document.querySelector(
        'yt-formatted-string.title.ytmusic-player-bar, ' +
        '.content-info-wrapper .title, ' +
        'ytmusic-player-bar .title'
      );

      const artistEl = document.querySelector(
        'yt-formatted-string.byline.ytmusic-player-bar span[role="link"]:first-child, ' +
        '.content-info-wrapper .byline a:first-child, ' +
        'ytmusic-player-bar .byline span:first-child'
      );

      const albumEl = document.querySelector(
        'ytmusic-player-bar .byline span[role="link"]:nth-child(3), ' +
        '.content-info-wrapper .byline a:nth-child(3)'
      );

      const thumbnailEl = document.querySelector(
        'ytmusic-player-bar #thumbnail img, ' +
        '.ytmusic-player-bar img.thumbnail, ' +
        'img#thumbnail'
      );

      const videoEl = document.querySelector('video');

      // Try to get high-res thumbnail from YTM player API
      let thumbnailUrl = '';
      if (thumbnailEl) {
        thumbnailUrl = thumbnailEl.src || '';
        // Upgrade to max resolution
        thumbnailUrl = thumbnailUrl
          .replace(/=w\\d+-h\\d+/, '=w512-h512')
          .replace(/\\/sddefault\\.jpg/, '/maxresdefault.jpg');
      }

      // Fallback: extract video ID from URL and build thumbnail
      if (!thumbnailUrl) {
        const match = window.location.href.match(/[?&]v=([^&]+)/);
        if (match) {
          thumbnailUrl = \`https://i.ytimg.com/vi/\${match[1]}/maxresdefault.jpg\`;
        }
      }

      const info = {
        title: titleEl?.textContent?.trim() || document.title.replace(' - YouTube Music', '') || 'Unknown',
        artist: artistEl?.textContent?.trim() || 'Unknown Artist',
        album: albumEl?.textContent?.trim() || '',
        thumbnailUrl,
        isPlaying: !(videoEl?.paused ?? true),
        duration: videoEl?.duration || 0,
        currentTime: videoEl?.currentTime || 0,
      };

      return info;
    } catch(err) {
      return null;
    }
  }

  // Post info to parent (Next.js app)
  function broadcastInfo() {
    const info = getPlayerInfo();
    if (!info) return;

    // Only send if something changed
    const key = info.title + info.isPlaying;
    if (key !== lastTitle) {
      lastTitle = key;
      window.parent.postMessage({
        type: 'YTMW_NOW_PLAYING',
        payload: info,
      }, '*');
    }

    // Always send position updates for seek bar
    window.parent.postMessage({
      type: 'YTMW_POSITION',
      payload: {
        currentTime: info.currentTime,
        duration: info.duration,
        isPlaying: info.isPlaying,
      },
    }, '*');
  }

  // Also intercept YTM's own events
  document.addEventListener('yt-navigate-finish', broadcastInfo);
  document.addEventListener('yt-page-data-updated', broadcastInfo);

  // Listen for control commands from parent
  window.addEventListener('message', (event) => {
    if (!event.data?.type?.startsWith('YTMW_CMD_')) return;

    const video = document.querySelector('video');
    switch(event.data.type) {
      case 'YTMW_CMD_PLAY':
        video?.play();
        break;
      case 'YTMW_CMD_PAUSE':
        video?.pause();
        break;
      case 'YTMW_CMD_NEXT':
        document.querySelector('[aria-label="Next"]')?.click();
        break;
      case 'YTMW_CMD_PREV':
        document.querySelector('[aria-label="Previous"]')?.click();
        break;
      case 'YTMW_CMD_SEEK':
        if (video && event.data.time != null) {
          video.currentTime = event.data.time;
        }
        break;
    }
  });

  setInterval(broadcastInfo, ${POLL_INTERVAL});
  console.log('[YTMusic Wrapper] Scraper active ✓');
})();
`
}

export const POLL_INTERVAL = 1000
