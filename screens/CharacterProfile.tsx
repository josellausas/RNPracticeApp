import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCharacter } from '../context/CharactersContext';
import { CharacterLookupFallback } from '../components/CharacterLookupFallback';

type Props = NativeStackScreenProps<RootStackParamList, 'characterProfile'>;

export const CharacterProfileScreen = ({ route }: Props) => {
  const { characterId } = route.params;
  const lookup = useCharacter(characterId);

  // Loading, error and not-found render identically on every screen that looks
  // a character up, so they live in one component. Narrowing to 'found' here
  // means the rest of this file only deals with the happy path.
  if (lookup.status !== 'found') {
    return <CharacterLookupFallback lookup={lookup} />;
  }

  const { name, birth_year, gender, height, mass } = lookup.character;

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.name}>{name}</Text>
      <Text variant="bodyMedium" style={styles.field}>Birth year: {birth_year}</Text>
      <Text variant="bodyMedium" style={styles.field}>Gender: {gender}</Text>
      {/* Both arrive as strings and can be the literal "unknown" — see interfaces.ts. */}
      <Text variant="bodyMedium" style={styles.field}>Height: {height} cm</Text>
      <Text variant="bodyMedium" style={styles.field}>Mass: {mass} kg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
  },
  name: {
    marginBottom: 12,
  },
  field: {
    marginVertical: 2,
  },
});
