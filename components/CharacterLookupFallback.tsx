import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { CharacterLookup } from '../context/CharactersContext';

/**
 * Every outcome of useCharacter except 'found'.
 *
 * Derived with Exclude rather than written out, so adding a fifth case to
 * CharacterLookup automatically widens this and the switch below stops
 * compiling until it is handled — in one place instead of in every screen.
 */
export type PendingLookup = Exclude<CharacterLookup, { status: 'found' }>;

/**
 * The shared "no character to show yet" rendering.
 *
 * Both CharacterProfileScreen and RegisterNfcScreen need identical loading,
 * error and not-found states and differ only in what they do once the
 * character arrives, so only that difference lives in the screens.
 */
export const CharacterLookupFallback = ({ lookup }: { lookup: PendingLookup }) => {
  switch (lookup.status) {
    case 'loading':
      return (
        <View style={styles.centered}>
          <ActivityIndicator animating size="large" />
          <Text variant="bodyMedium" style={styles.message}>Loading…</Text>
        </View>
      );

    case 'error':
      // No retry here on purpose: useCharacter exposes no refresh, so the
      // honest recovery path is the header's back button to the list.
      return (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.message}>{lookup.message}</Text>
          <Text variant="bodySmall" style={styles.message}>Go back and try again.</Text>
        </View>
      );

    case 'missing':
      // Distinct from 'error': the fetch worked, this id just is not in it.
      return (
        <View style={styles.centered}>
          <Text variant="titleMedium" style={styles.message}>Character not found</Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
  },
  message: {
    marginVertical: 6,
    textAlign: 'center',
  },
});
