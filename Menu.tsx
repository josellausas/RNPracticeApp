import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, List, Text } from 'react-native-paper';
import { MenuItem } from './interfaces/interfaces';


const MenuRow = (props: {item: MenuItem, onPress: (item: MenuItem) => void}) => {
  return (
    <List.Item
      title={props.item.title}
      onPress={() => props.onPress(props.item)}
      right={(iconProps) => <List.Icon {...iconProps} icon="chevron-right" />}
    />
  )
}

const MenuList = (props: {items: MenuItem[], onItemPress: (item: MenuItem) => void}) =>{
  const {items, onItemPress} = props;
  return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listCard}
        data={items}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => <MenuRow item={item} onPress={onItemPress} />}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={<Text>{'No characters found.'}</Text>}
      />
  )
}

export const Menu = (props: {items: MenuItem[], onItemPress: (item: MenuItem) => void}) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>{'Main Menu'}</Text>
      <MenuList items={props.items} onItemPress={props.onItemPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  title: {
    textAlign: 'center',
    marginVertical: 12,
  },
  list: {
    flex: 1,
    alignSelf: 'stretch',
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
});