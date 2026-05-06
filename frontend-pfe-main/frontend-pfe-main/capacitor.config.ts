import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pfe.intervention',
  appName: 'plab-admin-ng',
  webDir: 'dist/frontend-pfe-main', // ✅ هذا الصحيح
  bundledWebRuntime: false
};

export default config;