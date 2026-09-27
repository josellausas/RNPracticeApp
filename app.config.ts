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
    [
      // Writes the iOS entitlement (com.apple.developer.nfc.readersession.formats),
      // NFCReaderUsageDescription, android.permission.NFC, and bumps compileSdkVersion.
      //
      // Note: that entitlement cannot be carried by a free-account provisioning
      // profile, so signing for a physical iPhone needs a paid Apple Developer
      // Program membership. Simulator builds are unaffected.
      'react-native-nfc-manager',
      {
        nfcPermission: 'Allow $(PRODUCT_NAME) to read NFC tags so you can link them to characters.',
      },
    ],
  ],
};

export default config;
