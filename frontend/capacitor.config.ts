import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.space.harmony',
  appName: 'Harmony',
  webDir: 'dist',

  // OTA updates: APK loads the live web app from the HTTPS server on every launch.
  // Push a frontend update + redeploy Docker and all users get it automatically.
  server: {
    url: 'https://harmonychat.duckdns.org',
    cleartext: false
  }
};

export default config;
