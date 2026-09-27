import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCharacter } from '../context/CharactersContext';
import { CharacterLookupFallback } from '../components/CharacterLookupFallback';

type Props = NativeStackScreenProps<RootStackParamList, 'registerNfc'>;

export const RegisterNfcScreen = ({ route, navigation }: Props) => {
  const { characterId } = route.params;
  const lookup = useCharacter(characterId);

  // Resolve the title to a plain string BEFORE the effect. `lookup` is a fresh
  // object on every render, so depending on it directly would call setOptions
  // every render; a string dep only fires when the name actually arrives.
  const title = lookup.status === 'found' ? lookup.character.name : 'Register NFC';

  // useLayoutEffect, not useEffect, so the header updates in the same commit
  // as the body — matches the pattern in MapScreen.
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  // Narrowing here is what lets the fallback take the non-'found' union: after
  // this line TypeScript knows `lookup.character` exists below.
  if (lookup.status !== 'found') {
    return <CharacterLookupFallback lookup={lookup} />;
  }

  return (
    <View style={styles.container}>
      {/* UI only — no NFC radio is wired up yet, so this waits forever. */}
      <ActivityIndicator animating size="large" />
      <Text variant="headlineSmall" style={styles.waiting}>Waiting for NFC…</Text>
      <Text variant="bodyMedium" style={styles.hint}>
        Hold a tag near the top of your phone to link it to {lookup.character.name}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
  },
  waiting: {
    marginTop: 24,
    textAlign: 'center',
  },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});
