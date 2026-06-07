import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stringart.studio',
  appName: 'String Art Studio',
  webDir: 'dist',  // do NOT change to 'web/android/...' — that ships the Next.js app instead of the Parcel editor
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
