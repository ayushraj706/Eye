# YTMusic Wrapper

A high-performance YouTube Music wrapper app built with **Next.js + Capacitor.js**.  
Runs as a native Android APK with full **Origin Island / Lock Screen / Notification media controls** support.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Android APK (Capacitor)             │
│  ┌──────────────────────────────────────────────┐   │
│  │           Next.js WebView Layer              │   │
│  │                                              │   │
│  │  ┌────────────────┐  ┌──────────────────┐   │   │
│  │  │  YTMusic iframe│  │  navigator.      │   │   │
│  │  │  (music.youtube│  │  mediaSession    │   │   │
│  │  │   .com)        │  │  ↓               │   │   │
│  │  │                │  │  Android OS      │   │   │
│  │  │  MutationObs.  │  │  MediaSession    │   │   │
│  │  │  AdBlocker     │  │  ↓               │   │   │
│  │  │  Scraper       │  │  Origin Island ✓ │   │   │
│  │  │       ↓        │  │  Lock Screen   ✓ │   │   │
│  │  │  postMessage   │  │  Notif. Bar    ✓ │   │   │
│  │  └────────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Android Studio | Hedgehog+ |
| Java JDK | 17 |
| Android SDK | API 26+ |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Build Next.js (static export)
```bash
npm run build
```

### 3. Initialize Capacitor (first time only)
```bash
npx cap init YTMusicWrapper com.ytmusic.wrapper --web-dir=out
npx cap add android
```

### 4. Sync to Android
```bash
npx cap sync android
```

### 5. Open in Android Studio
```bash
npx cap open android
```
Then press **Run ▶** in Android Studio.

### Or — single command for everything:
```bash
npm run build:android
```

---

## Creating a Release Keystore

Generate a keystore for signing your APK:

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias ytmusic \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Place `release.keystore` in `android/app/`.

Create `android/keystore.properties` (⚠️ DO NOT commit this file):
```properties
storeFile=release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=ytmusic
keyPassword=YOUR_KEY_PASSWORD
```

---

## GitHub Actions Setup

For CI/CD automated builds, add these secrets to your repository:  
`Settings → Secrets and Variables → Actions`

| Secret | Value |
|--------|-------|
| `KEYSTORE_BASE64` | `base64 -w 0 release.keystore` |
| `KEYSTORE_PASSWORD` | Your store password |
| `KEY_ALIAS` | `ytmusic` |
| `KEY_PASSWORD` | Your key password |

Push to `main` branch → GitHub Actions builds and uploads APK artifact.  
Push a tag like `v1.0.0` → Creates a GitHub Release with the APK attached.

---

## How Origin Island Works

The Origin Island integration follows this flow:

```
YouTube Music DOM → MutationObserver/Polling Scraper
        ↓
    postMessage (iframe → parent Next.js app)
        ↓
navigator.mediaSession.metadata = { title, artist, artwork }
navigator.mediaSession.setActionHandler('play', ...)
navigator.mediaSession.playbackState = 'playing'
        ↓
Capacitor WebView → Android MediaSession API
        ↓
Origin Island / Lock Screen / Notification Controls
```

**Key requirement:** The WebView must have an active `<video>` element playing audio. YouTube Music's own video player satisfies this automatically.

---

## Ad Blocking Strategy

The ad blocker uses a **3-layer approach**:

1. **CSS injection** — Immediately hides known ad selectors via injected `<style>` tag
2. **MutationObserver** — Watches for dynamically injected ad containers and removes them
3. **Auto-skip** — Detects video ad state via `.ytp-ad-player-overlay` and fast-forwards `video.currentTime` to `video.duration`

**Note:** Ad blocking effectiveness depends on YouTube's current DOM structure. CSS selectors may need updating as YouTube updates their frontend.

---

## Project Structure

```
ytmusic-wrapper/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── page.tsx            # Main page (mounts player)
│   │   └── globals.css         # Global styles + ad block CSS
│   ├── components/
│   │   ├── YTMusicPlayer.tsx   # Core iframe wrapper
│   │   ├── NowPlayingBar.tsx   # Bottom controls bar
│   │   ├── LoadingScreen.tsx   # Splash screen
│   │   └── TopBar.tsx          # Status bar spacer
│   ├── hooks/
│   │   └── useMediaSession.ts  # MediaSession hook → Origin Island
│   └── lib/
│       ├── adBlocker.ts        # Ad removal logic
│       ├── ytmusicScraper.ts   # Metadata extraction from YTM DOM
│       └── capacitorBridge.ts  # Capacitor API wrappers
├── android/
│   └── app/
│       ├── build.gradle        # Android build config + signing
│       ├── proguard-rules.pro  # R8/ProGuard rules
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── java/com/ytmusic/wrapper/
│               └── MainActivity.java
├── .github/
│   └── workflows/
│       └── build.yml           # CI/CD pipeline
├── capacitor.config.ts         # Capacitor configuration
├── next.config.js              # Next.js static export config
└── package.json                # Scripts + dependencies
```

---

## Troubleshooting

### Origin Island not showing
- Ensure music is actively **playing** (not just loaded)
- Check that `navigator.mediaSession` is supported: `'mediaSession' in navigator`
- On Vivo Origin OS 6, go to **Settings → Notifications & Status Bar → Origin Island** and ensure your app is enabled
- Try toggling airplane mode off/on to refresh the media session

### Ad blocker not working
- YouTube regularly updates their frontend — CSS selectors may be stale
- Check browser console for `[AdBlock] active ✓` message
- Update selectors in `src/lib/adBlocker.ts`

### Black screen on launch
- Ensure `npm run build` completed successfully and the `out/` folder exists
- Run `npx cap sync android` after every build
- Check that `minSdkVersion` in `build.gradle` is 26+

### iframe not loading YouTube Music
- YouTube Music requires a valid browser User Agent — set in `MainActivity.java`
- Check the `allowNavigation` list in `capacitor.config.ts`

---

## Legal Notice

This project is a personal wrapper for YouTube Music. It does not download, redistribute, or modify YouTube content. Usage must comply with [YouTube's Terms of Service](https://www.youtube.com/t/terms). This tool is intended for personal use only.
