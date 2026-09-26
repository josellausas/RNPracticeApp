import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AsyncState } from './useAsyncData';

/**
 * The JSX you would otherwise retype on every screen: loading / error /
 * empty / data. Plain react-native only, so it pastes into any repo.
 *
 *   <AsyncBoundary state={state} onRetry={retry}>
 *     {(films) => (
 *       <FlatList data={films} keyExtractor={(f) => f.url} renderItem={...} />
 *     )}
 *   </AsyncBoundary>
 *
 * `children` is a function, not a node. That's what makes `data` available
 * and non-null inside — the union has already been narrowed to 'ready'.
 * Interviewers notice the empty state; almost nobody handles it unprompted.
 */

type Props<T> = {
  state: AsyncState<T>;
  onRetry?: () => void;
  /** Defaults to "an array with no items". Override for other shapes. */
  isEmpty?: (data: T) => boolean;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
};

const defaultIsEmpty = (data: unknown) => Array.isArray(data) && data.length === 0;

export function AsyncBoundary<T>({
  state,
  onRetry,
  isEmpty = defaultIsEmpty,
  emptyMessage = 'Nothing here yet',
  children,
}: Props<T>) {
  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{state.message}</Text>
        {onRetry && (
          <Pressable onPress={onRetry} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonLabel}>Retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (isEmpty(state.data)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{emptyMessage}</Text>
      </View>
    );
  }

  // state.data is T here — narrowed, no null check, no cast.
  return <>{children(state.data)}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  message: { marginVertical: 12, textAlign: 'center' },
  button: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#3478f6' },
  buttonLabel: { color: 'white', fontWeight: '600' },
});
