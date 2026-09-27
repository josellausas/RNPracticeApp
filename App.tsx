import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from './navigation/types';
import { PinsProvider } from './context/PinsContext';
import { CharactersProvider } from './context/CharactersContext';
import { useLocationPermission } from './hooks/useLocationPermission';
import { MenuScreen } from './screens/MenuScreen';
import { MapScreen } from './screens/MapScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DebugScreen } from './screens/DebugScreen';
import { PinListScreen } from './screens/PinListScreen';
import { EditPinScreen } from './screens/EditPinScreen';
import { CharacterListScreen } from './screens/CharacterLists';
import {FetchScreen} from './screens/FetchScreen'
import { CharacterProfileScreen } from './screens/CharacterProfile';
import { RegisterNfcScreen } from './screens/RegisterNfcScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useLocationPermission();

  return (
    <SafeAreaProvider>
      <PaperProvider settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
        {/*
          Both providers sit outside NavigationContainer so their data outlives
          any single screen: popping the list screen does not throw the fetched
          characters away. Kept as two siblings rather than one merged
          "AppContext" — merging them would re-render every character consumer
          whenever a pin changes.
        */}
        <PinsProvider>
          <CharactersProvider>
            <View style={styles.container}>
              <StatusBar style="auto" />
              <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Menu" component={MenuScreen} />
                  <Stack.Screen name="map" component={MapScreen} options={{ headerShown: true, title: 'Map' }} />
                  <Stack.Screen name="settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
                  <Stack.Screen name="debug" component={DebugScreen} options={{ headerShown: true, title: 'Debug' }} />
                  <Stack.Screen name="pinList" component={PinListScreen} options={{ headerShown: true, title: 'Pins' }} />
                  <Stack.Screen name="editPin" component={EditPinScreen} options={{ headerShown: true, title: 'Edit Pin' }} />
                  <Stack.Screen name="charactersList" component={CharacterListScreen} options={{ headerShown: true, title: 'SW Characters' }} />
                  <Stack.Screen name="fscreen" component={FetchScreen} options={{ headerShown: true, title: 'Fetch Characters' }} />
                  <Stack.Screen name="characterProfile" component={CharacterProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
                {/* title is a placeholder — the screen overwrites it with the character's name. */}
                <Stack.Screen name="registerNfc" component={RegisterNfcScreen} options={{ headerShown: true, title: 'Register NFC' }} />
                </Stack.Navigator>
              </NavigationContainer>
            </View>
          </CharactersProvider>
        </PinsProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
