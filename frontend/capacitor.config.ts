import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.space.harmony',
  appName: 'Harmony',
  webDir: 'dist',

  // OTA updates: the APK loads the live web app from the server on every launch.
  // Push a frontend update to the server and all users get it automatically.
  server: {
    url: 'http://64.181.206.113:5173',
    cleartext: true  // required for plain HTTP (upgrade to HTTPS + set false when you add SSL)
  }
};

export default config;
