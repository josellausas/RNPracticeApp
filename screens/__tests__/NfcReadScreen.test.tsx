import { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CharactersProvider } from '../../context/CharactersContext';
import { NfcProvider } from '../../nfc/NfcContext';
import { createFakeNfcReader, FAKE_TAG, FakeNfc } from '../../nfc/adapters/fakeNfcReader';
import { NfcReadScreen } from '../NfcReadScreen';
import * as swapi from '../../api/swapi';

const LUKE_URL = 'https://swapi.info/api/people/1';

const luke = {
  url: LUKE_URL, name: 'Luke Skywalker', height: '172', mass: '77', hair_color: 'blond',
  skin_color: 'fair', eye_color: 'blue', birth_year: '19BBY', gender: 'male',
  homeworld: 'p/1', films: [], species: [], vehicles: [], starships: [], created: '', edited: '',
} as unknown as Awaited<ReturnType<typeof swapi.fetchCharacters>>[number];

const renderScreen = (nfc: FakeNfc) => {
  const navigate = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CharactersProvider>
      <NfcProvider reader={nfc.reader} control={nfc.control}>{children}</NfcProvider>
    </CharactersProvider>
  );
  render(<NfcReadScreen navigation={{ navigate } as never} route={{} as never} />, { wrapper });
  return { navigate };
};

/** Resolve the pending scan with a tag carrying `payload`. */
const tap = async (nfc: FakeNfc, payload: string | null) => {
  await waitFor(() => expect(nfc.control.pending).not.toBeNull());
  await act(async () => {
    nfc.control.resolveScan({ status: 'tag', tag: { ...FAKE_TAG, payload } });
  });
};

describe('NfcReadScreen', () => {
  beforeEach(() => jest.spyOn(swapi, 'fetchCharacters').mockResolvedValue([luke]));
  afterEach(() => jest.restoreAllMocks());

  it('starts scanning on mount', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);

    expect(screen.getByText('Waiting for NFC…')).toBeOnTheScreen();
    await waitFor(() => expect(nfc.control.pending).toEqual({
      kind: 'scan',
      prompt: 'Hold a registered tag near your phone',
    }));
  });

  it('resolves a written tag to the character name', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);

    await tap(nfc, LUKE_URL);

    await waitFor(() => expect(screen.getByText('Found: Luke Skywalker')).toBeOnTheScreen());
    expect(screen.getByText('See Profile')).toBeOnTheScreen();
  });

  it('See Profile navigates with the id read off the tag', async () => {
    const nfc = createFakeNfcReader();
    const { navigate } = renderScreen(nfc);
    await tap(nfc, LUKE_URL);
    await waitFor(() => expect(screen.getByText('See Profile')).toBeOnTheScreen());

    fireEvent.press(screen.getByText('See Profile'));

    expect(navigate).toHaveBeenCalledWith('characterProfile', { characterId: LUKE_URL });
  });

  it('distinguishes a blank tag from an unrecognised one', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);

    await tap(nfc, null);

    expect(screen.getByText('Blank tag')).toBeOnTheScreen();
  });

  it('reports a tag holding an id this build does not know', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);

    await tap(nfc, 'https://swapi.info/api/people/999');

    await waitFor(() => expect(screen.getByText('Unknown tag')).toBeOnTheScreen());
    expect(screen.queryByText('See Profile')).toBeNull();
  });

  it.each([
    ['cancelled', { status: 'cancelled' as const }, 'Cancelled'],
    ['error', { status: 'error' as const, message: 'Tag connection lost' }, 'Something went wrong'],
  ])('renders the %s outcome', async (_l, outcome, expected) => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    await waitFor(() => expect(nfc.control.pending).not.toBeNull());

    await act(async () => {
      nfc.control.resolveScan(outcome);
    });

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('reports unavailable hardware without waiting', async () => {
    const nfc = createFakeNfcReader({ available: false });
    renderScreen(nfc);

    await waitFor(() => expect(screen.getByText('NFC unavailable')).toBeOnTheScreen());
  });

  it('Scan again starts a fresh session', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    await act(async () => {
      nfc.control.resolveScan({ status: 'cancelled' });
    });

    fireEvent.press(screen.getByText('Scan again'));

    await waitFor(() => expect(nfc.control.pending).toMatchObject({ kind: 'scan' }));
    expect(screen.getByText('Waiting for NFC…')).toBeOnTheScreen();
  });

  it('aborts the session when the screen unmounts', async () => {
    const nfc = createFakeNfcReader();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CharactersProvider>
        <NfcProvider reader={nfc.reader} control={nfc.control}>{children}</NfcProvider>
      </CharactersProvider>
    );
    const { unmount } = render(
      <NfcReadScreen navigation={{ navigate: jest.fn() } as never} route={{} as never} />,
      { wrapper }
    );
    await waitFor(() => expect(nfc.control.pending).not.toBeNull());

    unmount();

    await waitFor(() => expect(nfc.control.pending).toBeNull());
  });

  /** The register-then-read loop the dev panel is built around. */
  it('can read back a payload that was written earlier in the session', async () => {
    const nfc = createFakeNfcReader();
    nfc.control.enqueueWrite({ status: 'written', tag: FAKE_TAG });
    await nfc.reader.write(LUKE_URL);
    expect(nfc.control.written).toEqual([LUKE_URL]);

    renderScreen(nfc);
    await tap(nfc, nfc.control.written[nfc.control.written.length - 1]);

    await waitFor(() => expect(screen.getByText('Found: Luke Skywalker')).toBeOnTheScreen());
  });
});
