import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { Character } from '../interfaces/interfaces';

const API_URL = 'https://swapi.info/api/people' 

type ListObject = {
  title: string
  id: string
}

type ListItemProps = {
  item: ListObject
}

function ListItemCreate(title: string, id: string): ListObject {
  return {
    title,
    id
  }
}

const ListItemAdd = (props: {onPress: (value: string) => void}) => {
  const [newItemText, setNewItemText] = useState(''); 
  return (
    <View style={styles.borderedContainer}>
      <Text>{'New item'}</Text>
      <TextInput onChangeText={setNewItemText} value={newItemText}/>
      <Button onPress={() => {
        if (!newItemText.trim()) return;
        props.onPress(newItemText); setNewItemText('')
      }}>
        {'Add'}
      </Button>
    </View>
  )
}

const ListItem = ({item}: ListItemProps) => {
  return (
    <Pressable onPress={() => {console.log(`pressed: ${item.title}`)}}>
    <View style={styles.listItem}>
      <Text style={styles.listItemTitle}>
        {item.title}
      </Text>
    </View>
    </Pressable>
  )
}

const testItems: ListObject[] = [
  {title: "Test1", id: "1"},
  {title: "Test2", id: "2"},
]

export const PracticeScreen = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [listData, setListData] = useState<ListObject[]>([...testItems]);

  const componentLoad = () => {
    setLoading(true);
    fetchFromAPI(API_URL);
    setLoading(false);
  }

  useEffect(componentLoad, []);

  const fetchFromAPI = (url: string) => {
    setLoading(true);
    fetch(url)
      .then(response => response.json())
      .then(list => list.map((c: Character) => ListItemCreate(c.name, c.url)))
      .then(data => setListData(prev => [...prev, ...data]))
      .catch(error => console.error(error))
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="headlineSmall">Loading</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Practice Screen</Text>
      <View style={{margin: 12}}></View>
      <Button onPress={() => {setListData([])}}>{'Clear'}</Button>
      <Button onPress={() => {fetchFromAPI(API_URL)}}>{'Get From API'}</Button>
      <View style={{margin: 12}}></View>
      <ListItemAdd onPress={(value) => { 
        setListData(prev => [...prev, ListItemCreate(value, `${Date.now()}`)]);
      }}/>
      
      <FlatList data={listData} renderItem={({item}) => <ListItem item={item} />} keyExtractor={(item) => item.id} /> 
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    padding: 12,
  },
  listItemTitle: {
    fontSize: 18,
  },
  listContainer: {
  },
  borderedContainer: {
    borderWidth: 2,
    borderColor: '#333333'
  }
});
