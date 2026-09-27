import { createRef, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { CharactersProvider } from '../../context/CharactersContext';
import { NfcProvider } from '../../nfc/NfcContext';
import { createFakeNfcReader, FakeNfc } from '../../nfc/adapters/fakeNfcReader';
import { RootStackParamList } from '../../navigation/types';
import { RegisterNfcScreen } from '../RegisterNfcScreen';
import { NfcReadScreen } from '../NfcReadScreen';
import * as swapi from '../../api/swapi';

const LUKE_URL = 'https://swapi.info/api/people/1';
const luke = {
  url: LUKE_URL, name: 'Luke Skywalker', height: '172', mass: '77', hair_color: 'blond',
  skin_color: 'fair', eye_color: 'blue', birth_year: '19BBY', gender: 'male',
  homeworld: 'p/1', films: [], species: [], vehicles: [], starships: [], created: '', edited: '',
} as unknown as Awaited<ReturnType<typeof swapi.fetchCharacters>>[number];

const Stack = createNativeStackNavigator<RootStackParamList>();
const ListStub = () => <View><Text>List</Text></View>;

/**
 * Renders a REAL navigator rather than unmounting a screen by hand, so this
 * exercises the actual pop that a back press performs.
 */
const renderStack = (nfc: FakeNfc, initial: 'registerNfc' | 'nfcRead') => {
  const navRef = createRef<NavigationContainerRef<RootStackParamList>>();
  const Providers = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}
    >
      <PaperProvider>
        <CharactersProvider>
          <NfcProvider reader={nfc.reader} control={nfc.control}>{children}</NfcProvider>
        </CharactersProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );

  render(
    <Providers>
      <NavigationContainer ref={navRef}>
        <Stack.Navigator initialRouteName="charactersList">
          <Stack.Screen name="charactersList" component={ListStub} />
          <Stack.Screen name="registerNfc" component={RegisterNfcScreen} />
          <Stack.Screen name="nfcRead" component={NfcReadScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Providers>
  );
  return navRef;
};

describe('back navigation cancels the NFC session', () => {
  beforeEach(() => jest.spyOn(swapi, 'fetchCharacters').mockResolvedValue([luke]));
  afterEach(() => jest.restoreAllMocks());

  it('write screen: going back aborts the in-flight write', async () => {
    const nfc = createFakeNfcReader();
    const nav = renderStack(nfc, 'registerNfc');

    await act(async () => {
      nav.current?.navigate('registerNfc', { characterId: LUKE_URL });
    });
    await waitFor(() => expect(nfc.control.pending).toMatchObject({ kind: 'write' }));

    // Exactly what the header back button and Android hardware back do.
    await act(async () => {
      nav.current?.goBack();
    });

    await waitFor(() => expect(nfc.control.pending).toBeNull());
    expect(nfc.control.written).toEqual([]);
  });

  it('read screen: going back aborts the in-flight scan', async () => {
    const nfc = createFakeNfcReader();
    const nav = renderStack(nfc, 'nfcRead');

    await act(async () => {
      nav.current?.navigate('nfcRead');
    });
    await waitFor(() => expect(nfc.control.pending).toMatchObject({ kind: 'scan' }));

    await act(async () => {
      nav.current?.goBack();
    });

    await waitFor(() => expect(nfc.control.pending).toBeNull());
  });

  /**
   * The counter-case, and the one that would bite: pushing ANOTHER screen on
   * top does not unmount, so the session must stay open.
   */
  it('pushing a screen on top leaves the session running', async () => {
    const nfc = createFakeNfcReader();
    const nav = renderStack(nfc, 'nfcRead');

    await act(async () => {
      nav.current?.navigate('nfcRead');
    });
    await waitFor(() => expect(nfc.control.pending).toMatchObject({ kind: 'scan' }));

    await act(async () => {
      nav.current?.navigate('registerNfc', { characterId: LUKE_URL });
    });

    // Still the scan — the read screen never unmounted.
    expect(nfc.control.pending).toMatchObject({ kind: 'scan' });
  });
});
