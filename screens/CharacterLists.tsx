import { FlatList, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, List, Text } from 'react-native-paper';
import { RootStackParamList } from '../navigation/types';
import { Character } from '../interfaces/interfaces';
import { fetchCharacters } from '../api/swapi';
import { useAsyncData } from '../hooks/useAsyncData';
import { CharacterCard } from '../components/CharCard';

type Props = NativeStackScreenProps<RootStackParamList, 'charactersList'>;

export const CharacterListScreen = ({navigation}: Props) => {
  // No deps: fetch once on mount. The hook keys off its deps array, not the
  // fetcher's identity, so an inline arrow here would be safe too.
  const { state, retry } = useAsyncData(fetchCharacters, []);

  return (
    <View style={styles.container}>
      {state.status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator animating size="large" />
          <Text variant="bodyMedium" style={styles.message}>Loading…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.message}>{state.message}</Text>
          <Button mode="contained" onPress={retry}>Retry</Button>
        </View>
      )}

      {state.status === 'ready' && (
        <FlatList
          data={state.data}
          contentInsetAdjustmentBehavior='automatic'
          keyExtractor={(character: Character) => character.name}
          renderItem={({ item }) => (
              <CharacterCard 
                character={item} 
                onProfile={
                  () => {
                    navigation.navigate('characterProfile', {profileId: item.name})
                  }
                }
                onNFC={
                  () => {
                    console.log("TODO: NFC goes here")
                  }
                }
                />
          )}
        />
      )}
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
});
