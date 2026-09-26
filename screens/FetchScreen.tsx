import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useEffect, useState } from "react";

type Props = NativeStackScreenProps<RootStackParamList, 'fscreen'>;

interface Character {
  name: string
  films: [string]
}

interface Film {
  title: string;
  episode_id: number;
}

export const FetchScreen = ({navigation}: Props) => {
  const API = "https://swapi.info/api/people"
  const [characters, setCharacters] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect( () => {
    let cancelled = false;
    fetch(API).then(r => r.json()).then(d => { if (!cancelled) setCharacters(d); });
    return () => {cancelled = true; }; 
  }, []);

  // TODO: Convert this to actual navigation
  if (selected) {
    return (
        <FilmView character={selected as Character} onBack={() => {setSelected(null)}}/>
    );
  }

  if (!characters) {
    return <Loading />
  }

  return (
      <FlatList 
        data={characters}
        keyExtractor={(r) => r.url}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({item}) => (
          <Pressable onPress={() => setSelected(item)}>
            <Text style={{padding: 10, fontSize: 18}}>{item.name}</Text>
          </Pressable>
        )}
      />
  )
}

type FilmViewProps = {
  character: Character
  onBack: () => void
}

const fetchFilm = async (url: string): Promise<Film> => {
  const response = await fetch(url);
  if(!response.ok) throw new Error(`Could not load film (HTTP ${response.status})`);
  return (await response.json()) as Film;
}

const FilmView = ({character, onBack}: FilmViewProps) => {
  const [films, setFilms] = useState<Film[] | null >(null);

  useEffect(() => {
    Promise.all(
      character.films.map(fetchFilm)
    )
    .then(setFilms);
  }, [character]);

  if (!films) return <Loading />;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Pressable onPress={onBack}><Text>Back</Text></Pressable>
      <Text style={{ fontSize: 22, fontWeight: '600', marginVertical: 12 }}>{character.name}</Text>
      {films.map(f => <Text key={f.title} style={{ paddingVertical: 6 }}>{f.title}</Text>)}
    </View>
  );
}

function Loading() {
  return (
    <ActivityIndicator style={{ flex: 1 }} size="large" />
  );
}