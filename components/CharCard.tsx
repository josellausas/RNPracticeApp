import { Character } from "../interfaces/interfaces";
import { StyleSheet, View } from 'react-native';
import {Avatar, Card, Text, Button} from 'react-native-paper'


type CharacterCardProps = {
  character: Character;
  onProfile: () => void;
  onNFC: () => void;
};

const LeftContent = (props: any) => <Avatar.Icon {...props} icon="folder" />

// Using http://oss.callstack.com/react-native-paper/docs/components/Card/Card
export const CharacterCard = ({character, onProfile, onNFC}: CharacterCardProps) => {
  return (
    <View style={styles.card}>
      <Card mode={'elevated'}>
        <Card.Title title={"Character Profile"}  left={LeftContent} />
        <Card.Content>
          <Text variant="titleLarge">{character.name}</Text>
          <Text variant="bodyMedium">Birth year: {character.birth_year}</Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => {
            console.log(`view: ${character.name}`);
            onProfile();
          }}>{'Profile'}</Button>
          <Button onPress={() => {console.log(`NFC: ${character.name}`); onNFC();}}>{'Register NFC'}</Button>
        </Card.Actions>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 8,
  }
});