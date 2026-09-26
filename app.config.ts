import type { ExpoConfig } from 'expo/config';

// ios/ and android/ are generated from this file by `npm run prebuild` (CNG).
// Never edit the native folders directly; change this config or add a config plugin.

const config: ExpoConfig = {
  name: 'geopin',
  slug: 'geopin',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.josellausas.geopin',
  },
  android: {
    package: 'com.josellausas.geopin',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location to show it on the map.',
      },
    ],
    [
      'react-native-maps',
      {
        // Loaded by Expo CLI from .env.local. iOS uses Apple Maps and needs no key.
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    ],
  ],
};

export default config;
