import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, TextInput } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { usePins } from '../context/PinsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'editPin'>;

export const EditPinScreen = ({ route, navigation }: Props) => {
  const { pinId } = route.params;
  const { getPin, updatePinTitle } = usePins();
  const [title, setTitle] = useState(getPin(pinId)?.title ?? '');

  const handleSave = () => {
    updatePinTitle(pinId, title);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TextInput label="Pin title" value={title} onChangeText={setTitle} style={styles.input} />
      <Button mode="contained" onPress={handleSave}>Save</Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
});
