import { FlatList, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { RootStackParamList } from '../navigation/types';
import { Character } from '../interfaces/interfaces';
import { useCharacters } from '../context/CharactersContext';
import { CharacterCard } from '../components/CharCard';

type Props = NativeStackScreenProps<RootStackParamList, 'charactersList'>;

export const CharacterListScreen = ({ navigation }: Props) => {
  // The data now lives in CharactersProvider, not here. This screen kept the
  // trigger (`refresh`) and gave up ownership of the list — which is why the
  // profile screen can read it without going through this component.
  //
  // None of the JSX below had to change when the data moved, because the
  // context re-exports the same AsyncState union this screen already rendered.
  const { state, refresh } = useCharacters();

  return (
    <View style={styles.container}>
      {/* 'idle' lasts one frame — useCharacters kicks the load off on mount — but
          it still needs a branch, or the screen flashes empty before loading. */}
      {(state.status === 'idle' || state.status === 'loading') && (
        <View style={styles.centered}>
          <ActivityIndicator animating size="large" />
          <Text variant="bodyMedium" style={styles.message}>Loading…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.message}>{state.message}</Text>
          <Button mode="contained" onPress={refresh}>Retry</Button>
        </View>
      )}

      {state.status === 'ready' && (
        <FlatList
          data={state.data}
          contentInsetAdjustmentBehavior='automatic'
          // Keyed on the stable id, not the display name: duplicate keys make
          // FlatList recycle the wrong row, which is a miserable bug to chase.
          keyExtractor={(character: Character) => character.url}
          renderItem={({ item }) => (
              <CharacterCard 
                character={item} 
                onProfile={
                  () => {
                    navigation.navigate('characterProfile', { characterId: item.url })
                  }
                }
                onNFC={
                  () => {
                    navigation.navigate('registerNfc', { characterId: item.url })
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
