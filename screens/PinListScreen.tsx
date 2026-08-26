import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, List, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { usePins } from '../context/PinsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'pinList'>;

export const PinListScreen = ({ navigation }: Props) => {
  const { pins } = usePins();

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listCard}
        data={pins}
        keyExtractor={(pin) => pin.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.title}
            onPress={() => navigation.navigate('editPin', { pinId: item.id })}
            right={(iconProps) => <List.Icon {...iconProps} icon="chevron-right" />}
          />
        )}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={<Text style={styles.empty}>No pins yet. Tap the map to drop one.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  list: {
    flex: 1,
    alignSelf: 'stretch',
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
  },
});
