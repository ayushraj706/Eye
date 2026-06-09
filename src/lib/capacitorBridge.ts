/**
 * capacitorBridge.ts
 *
 * Utilities for Capacitor-specific functionality.
 * Safely wraps Capacitor APIs so the app works
 * in both browser and native WebView environments.
 */

let _isCapacitor: boolean | null = null

export function isCapacitor(): boolean {
  if (_isCapacitor !== null) return _isCapacitor
  _isCapacitor =
    typeof window !== 'undefined' &&
    'Capacitor' in window &&
    (window as any).Capacitor?.isNativePlatform?.() === true
  return _isCapacitor
}

export function isAndroid(): boolean {
  if (!isCapacitor()) return false
  return (window as any).Capacitor?.getPlatform?.() === 'android'
}

// Keep screen awake during playback
export async function keepScreenAwake(enable: boolean): Promise<void> {
  if (!isCapacitor()) return
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake')
    if (enable) {
      await KeepAwake.keepAwake()
    } else {
      await KeepAwake.allowSleep()
    }
  } catch {
    // Plugin not installed — silent fail
  }
}

// Set status bar style
export async function setStatusBarDark(): Promise<void> {
  if (!isCapacitor()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0F0F0F' })
  } catch { /* ignore */ }
}

// Handle Android back button
export function setupBackButtonHandler(onBack: () => boolean): () => void {
  if (!isCapacitor()) return () => {}

  let unsubscribe = () => {}

  import('@capacitor/app').then(({ App }) => {
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const handled = onBack()
      if (!handled && !canGoBack) {
        App.exitApp()
      }
    })
    listener.then(l => {
      unsubscribe = () => l.remove()
    })
  })

  return () => unsubscribe()
}

// Haptic feedback for controls
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!isCapacitor()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }
    await Haptics.impact({ style: map[style] })
  } catch { /* ignore */ }
}
