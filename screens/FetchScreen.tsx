import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Divider, List, Text } from 'react-native-paper';
import { Character } from '../interfaces/interfaces';
import { FIRST_CHARACTERS_PAGE, fetchCharactersPaged } from '../api/swapi';
import { useAsyncData } from '../hooks/useAsyncData';

/**
 * swapi.dev tells us the page number in the URL it hands back. Reading it with
 * a regex rather than `new URL()` because React Native's URL implementation is
 * partial — `searchParams` is not reliably there without a polyfill.
 *
 * This is display-only. Nothing in the paging logic depends on it, which is
 * the point: the client never does page arithmetic.
 */
const pageNumberOf = (url: string) => Number(/[?&]page=(\d+)/.exec(url)?.[1] ?? 1);

// Reads neither route params nor navigation, so it takes no props —
// same shape as SettingsScreen and DebugScreen.
export const FetchScreen = () => {
  // The entire paging state is one URL. Not a page index, not an offset, not a
  // page size — the server owns all of that and expresses it through `next`
  // and `previous`, which are complete addresses we hand straight back.
  const [pageUrl, setPageUrl] = useState<string>(FIRST_CHARACTERS_PAGE);

  // `pageUrl` is the dep, so changing it refetches — the same role a queryKey
  // plays in react-query. It also means useAsyncData's abort-on-deps-change
  // does real work here: tap Next three times quickly and the two superseded
  // responses are cancelled instead of racing to overwrite the third.
  const { state, retry } = useAsyncData(
    (signal) => fetchCharactersPaged(signal, pageUrl),
    [pageUrl]
  );

  if (state.status === 'idle' || state.status === 'loading') {
    // Known rough edge: the list blanks out on every page change rather than
    // holding the old rows until the new ones land. AsyncState has no "fetching
    // but I still have the last result" case, which is precisely what
    // react-query's `placeholderData: keepPreviousData` provides. To do it by
    // hand, stash the last 'ready' page in state and render that while loading.
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating size="large" />
        <Text variant="bodyMedium" style={styles.message}>Loading page {pageNumberOf(pageUrl)}…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.message}>{state.message}</Text>
        <Button mode="contained" onPress={retry}>Retry</Button>
      </View>
    );
  }

  const { count, next, previous, results } = state.data;

  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={styles.header}>
        Page {pageNumberOf(pageUrl)} · showing {results.length} of {count}
      </Text>

      <FlatList
        data={results}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(character: Character) => character.url}
        ItemSeparatorComponent={Divider}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.birth_year} · ${item.gender}`}
          />
        )}
      />

      {/*
        The buttons carry no arithmetic. `next` and `previous` are either a URL
        to navigate to or null, and null is exactly the signal to disable the
        control — no "am I on the last page" calculation from count and page
        size, which is the classic place for an off-by-one.
      */}
      <View style={styles.pager}>
        <Button
          mode="outlined"
          disabled={previous === null}
          onPress={() => previous && setPageUrl(previous)}
        >
          Previous
        </Button>
        <Button
          mode="contained"
          disabled={next === null}
          onPress={() => next && setPageUrl(next)}
        >
          Next
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  message: {
    marginVertical: 12,
    textAlign: 'center',
  },
  header: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
});
