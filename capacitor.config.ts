import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ytmusic.wrapper',
  appName: 'YT Music',
  webDir: 'out',
  server: {
    // For development only — point to your dev server
    // url: 'http://192.168.1.100:3000',
    // cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'music.youtube.com',
      '*.youtube.com',
      '*.googlevideo.com',
      '*.ytimg.com',
      '*.ggpht.com',
    ],
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'ytmusic',
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true for debug builds
    backgroundColor: '#0F0F0F',
    // Enable hardware back button handling
    initialFocus: true,
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0F0F0F',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F0F0F',
      showSpinner: false,
    },
  },
};

export default config;
