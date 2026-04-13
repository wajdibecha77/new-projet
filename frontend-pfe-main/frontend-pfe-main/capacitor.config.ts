import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pfe.intervention',
  appName: 'plab-admin-ng',
  webDir: 'dist/plab-admin-ng', // 👈 هذا الصحيح
  bundledWebRuntime: false
};

export default config;