import { FlatList, StyleSheet, View } from 'react-native';
import { Divider, List, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { usePins } from '../context/PinsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'characterProfile'>;
  
export const CharacterProfileScreen = ({ route, navigation }: Props) => {
  // TODO: Use Characters Context here
  const { profileId } = route.params;

  return (
      <View style={styles.container}>
        <Text>{'Character profile goes here'}</Text>
        <Text>{profileId}</Text>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});
