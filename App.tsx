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
import { NfcProvider } from './nfc/NfcContext';
import { guardReader } from './nfc/guardReader';
import { createFakeNfcReader } from './nfc/adapters/fakeNfcReader';
import { createNfcManagerReader } from './nfc/adapters/nfcManagerReader';
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
import { NfcReadScreen } from './screens/NfcReadScreen';
import { PracticeScreen } from './screens/PracticeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/*
  THE adapter swap — the only place that knows which NFC implementation is real.

  Flip USE_REAL_NFC to true to run against hardware. Nothing else changes:
  screens talk to the NfcReader port and cannot tell the difference. Doing it
  by hand rather than sniffing the platform keeps expo-device out of the tree
  and makes the current mode obvious at a glance.

  Before flipping it, know what it costs:
    - iOS on a device needs a PAID Apple Developer Program membership. The NFC
      entitlement this project now requests cannot go in a free Personal Team
      profile, so signing fails; on a simulator there is no radio at all.
    - Android needs only a phone with NFC.
    - `control` is not passed for the real adapter, so DevNfcPanel renders
      nothing and the simulator buttons disappear on their own.
*/
const USE_REAL_NFC = true;

const createNfc = () => {
  if (USE_REAL_NFC) {
    return { reader: guardReader(createNfcManagerReader()) };
  }

  const fake = createFakeNfcReader({
    sampleTagPayload: 'https://swapi.info/api/people/1',
  });
  return { reader: guardReader(fake.reader), control: fake.control };
};
const nfc = createNfc();

export default function App() {
  useLocationPermission();

  return (
    <SafeAreaProvider>
      <PaperProvider settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
        <PinsProvider>
          <CharactersProvider>
            <NfcProvider reader={nfc.reader} control={nfc.control}>
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
                  <Stack.Screen name="registerNfc" component={RegisterNfcScreen} options={{ headerShown: true, title: 'Register NFC' }} />
                  <Stack.Screen name="nfcRead" component={NfcReadScreen} options={{ headerShown: true, title: 'NFC Read' }} />
                  <Stack.Screen name="practice" component={PracticeScreen} options={{ headerShown: true, title: 'Practice' }} />
                </Stack.Navigator>
              </NavigationContainer>
            </View>
            </NfcProvider>
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
