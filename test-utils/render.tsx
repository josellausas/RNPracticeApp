import { ReactElement, ReactNode } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, RenderOptions } from '@testing-library/react-native';

/**
 * Mirrors the provider stack in App.tsx. Keeping it in one place means a test
 * exercises the same Paper configuration the app ships — notably the icon
 * setting, without which Paper logs a warning and renders no icons.
 */
const AllProviders = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}
  >
    <PaperProvider settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
      {children}
    </PaperProvider>
  </SafeAreaProvider>
);

/** Drop-in replacement for RTL's `render` that supplies the app's providers. */
export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react-native';
