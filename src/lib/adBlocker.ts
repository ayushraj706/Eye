/**
 * adBlocker.ts
 *
 * Injects into the YouTube Music iframe context via postMessage
 * and MutationObserver to hide/remove ad elements.
 *
 * Strategy:
 * 1. CSS injection to hide known ad selectors (immediate)
 * 2. MutationObserver to catch dynamically injected ads (persistent)
 * 3. postMessage bridge to communicate with the iframe if same-origin allows
 * 4. Auto-skip: detect video ad state and fast-forward past it
 */

// All known YouTube Music ad selectors (updated June 2026)
export const AD_SELECTORS = [
  // YTMusic specific promo containers
  'ytmusic-mealbar-promo-renderer',
  'ytmusic-banner-standalone-ad-renderer',
  'ytmusic-statement-banner-renderer',
  'ytmusic-shelf-renderer[is-ad]',

  // Standard YouTube ad overlays
  '.ytp-ad-module',
  '.ytp-ad-overlay-container',
  '.ytp-ad-text-overlay',
  '.ytp-ad-player-overlay',
  '.ytp-ad-player-overlay-instream-info',
  '.ytp-ad-skip-button-container',
  '.ytp-ad-progress-list',
  '.video-ads',
  '.ytp-paid-content-overlay',
  '.ytp-ce-element',

  // Masthead and banner ads
  '#masthead-ad',
  'ytd-banner-promo-renderer',
  'ytd-statement-banner-renderer',
  'ytd-ad-slot-renderer',
  'ytd-in-feed-ad-layout-renderer',

  // Promoted items in search/home
  '[aria-label="Promoted"]',
  '[data-is-ad]',
  '.ytmusic-shelf-renderer[page-type="FEmusic_home"] ytmusic-responsive-list-item-renderer:has(.ytmusic-badge-supported-renderers)',

  // Interstitial ads
  'tp-yt-paper-dialog:has(.ytmusic-mealbar-promo-renderer)',
  '.ytmusic-popup-container:has([class*="ad"])',
  '.ytmusic-popup-container:has([class*="promo"])',
  '.ytmusic-popup-container:has([class*="survey"])',

  // Premium upsell overlays
  '[aria-label="Get YouTube Music Premium"]',
  '.ytmusic-you-there-renderer',
]

// Generate CSS string from selectors
export function generateAdBlockCSS(): string {
  return `
/* YTMusic Wrapper — Ad Block Layer */
${AD_SELECTORS.map(s => `${s}`).join(',\n')} {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
}

/* Skip ad buttons — auto-click targets */
.ytp-ad-skip-button,
.ytp-skip-ad-button,
[class*="skip-ad"],
[aria-label*="Skip"] {
  opacity: 0 !important;
}

/* Hide premium prompts in menus */
ytmusic-menu-renderer [aria-label*="Premium"],
ytmusic-menu-renderer [aria-label*="Upgrade"] {
  display: none !important;
}
`
}

// Script to inject into page context (runs inside WebView)
export function generateAdBlockScript(): string {
  return `
(function() {
  'use strict';

  const AD_SELECTORS = ${JSON.stringify(AD_SELECTORS)};

  // Inject CSS immediately
  const style = document.createElement('style');
  style.id = 'ytmusic-adblock';
  style.textContent = \`${generateAdBlockCSS()}\`;
  (document.head || document.documentElement).appendChild(style);

  // Helper: remove matching elements from DOM entirely
  function removeAds(root) {
    AD_SELECTORS.forEach(selector => {
      try {
        root.querySelectorAll(selector).forEach(el => {
          el.remove();
        });
      } catch(e) {}
    });
  }

  // Auto-skip video ads
  function skipVideoAd() {
    // Method 1: Click skip button
    const skipBtn = document.querySelector(
      '.ytp-ad-skip-button, .ytp-skip-ad-button, [aria-label*="Skip Ads"]'
    );
    if (skipBtn) {
      skipBtn.click();
      return true;
    }

    // Method 2: Fast-forward video element past ad
    const video = document.querySelector('video');
    if (video && video.duration && !isNaN(video.duration)) {
      const adIndicator = document.querySelector('.ytp-ad-player-overlay, .ytp-ad-progress');
      if (adIndicator) {
        console.log('[AdBlock] Video ad detected, fast-forwarding...');
        video.currentTime = video.duration;
        return true;
      }
    }

    return false;
  }

  // Remove promo dialogs/popups
  function removePromoDialogs() {
    const selectors = [
      'tp-yt-paper-dialog',
      '.ytmusic-popup-container',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.textContent || '';
        if (
          text.includes('Premium') ||
          text.includes('ad-free') ||
          text.includes('Try it free') ||
          text.includes('Subscribe') ||
          text.includes('No thanks') ||
          el.querySelector('[class*="promo"]') ||
          el.querySelector('[class*="mealbar"]')
        ) {
          el.remove();
        }
      });
    });
  }

  // Initial cleanup
  removeAds(document);
  removePromoDialogs();

  // MutationObserver: watch for dynamically injected ads
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            removeAds(node);
          }
        });
        // Check for video ads on DOM changes
        skipVideoAd();
        removePromoDialogs();
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Periodic check as backup (every 2 seconds)
  setInterval(() => {
    skipVideoAd();
    removePromoDialogs();
  }, 2000);

  console.log('[YTMusic Wrapper] Ad blocker active ✓');
})();
`
}

// Hook to inject script into iframe (same-origin workaround using Capacitor)
export function injectAdBlockerViaCapacitor(): void {
  if (typeof window === 'undefined') return

  // Wait for Capacitor WebView bridge
  const tryInject = () => {
    const iframe = document.querySelector<HTMLIFrameElement>('#yt-frame')
    if (!iframe?.contentWindow) return

    try {
      // Try direct script injection (works if iframe is same-origin or about:blank init)
      const doc = iframe.contentDocument || iframe.contentWindow.document
      if (doc && doc.body) {
        const script = doc.createElement('script')
        script.textContent = generateAdBlockScript()
        doc.head.appendChild(script)
        console.log('[AdBlock] Injected via iframe contentDocument')
      }
    } catch {
      // Cross-origin — use postMessage bridge
      iframe.contentWindow.postMessage(
        { type: 'YTMW_INJECT_ADBLOCK', script: generateAdBlockScript() },
        'https://music.youtube.com'
      )
    }
  }

  // Try multiple times as iframe loads
  [500, 1500, 3000, 5000].forEach(delay => {
    setTimeout(tryInject, delay)
  })
}
