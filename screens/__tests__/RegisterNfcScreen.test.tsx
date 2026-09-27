import { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CharactersProvider } from '../../context/CharactersContext';
import { NfcProvider } from '../../nfc/NfcContext';
import { createFakeNfcReader, FAKE_TAG, FakeNfc } from '../../nfc/adapters/fakeNfcReader';
import { RegisterNfcScreen } from '../RegisterNfcScreen';
import * as swapi from '../../api/swapi';

const LUKE_URL = 'https://swapi.info/api/people/1';

const luke = {
  url: LUKE_URL, name: 'Luke Skywalker', height: '172', mass: '77', hair_color: 'blond',
  skin_color: 'fair', eye_color: 'blue', birth_year: '19BBY', gender: 'male',
  homeworld: 'p/1', films: [], species: [], vehicles: [], starships: [], created: '', edited: '',
} as unknown as Awaited<ReturnType<typeof swapi.fetchCharacters>>[number];

const renderScreen = (nfc: FakeNfc, characterId = LUKE_URL) => {
  const setOptions = jest.fn();
  const popTo = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CharactersProvider>
      <NfcProvider reader={nfc.reader} control={nfc.control}>{children}</NfcProvider>
    </CharactersProvider>
  );
  const view = render(
    <RegisterNfcScreen
      route={{ params: { characterId } } as never}
      navigation={{ setOptions, popTo } as never}
    />,
    { wrapper }
  );
  return { setOptions, popTo, ...view };
};

describe('RegisterNfcScreen', () => {
  beforeEach(() => jest.spyOn(swapi, 'fetchCharacters').mockResolvedValue([luke]));
  afterEach(() => jest.restoreAllMocks());

  it('starts a write for the character once it loads, and waits', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);

    await waitFor(() => expect(screen.getByText('Waiting for NFC…')).toBeOnTheScreen());
    // The payload written is the character's stable id, not its name.
    expect(nfc.control.pending).toMatchObject({ kind: 'write', payload: LUKE_URL });
  });

  it('does not touch NFC until the character has resolved', () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    expect(nfc.control.pending).toBeNull();
  });

  it('reports success and records the payload', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    await waitFor(() => expect(nfc.control.pending).not.toBeNull());

    await act(async () => {
      nfc.control.resolveWrite({ status: 'written', tag: FAKE_TAG });
    });

    expect(screen.getByText('Tag registered')).toBeOnTheScreen();
    expect(nfc.control.written).toEqual([LUKE_URL]);
  });

  it('Done returns to the character list', async () => {
    const nfc = createFakeNfcReader();
    const { popTo } = renderScreen(nfc);
    await waitFor(() => expect(nfc.control.pending).not.toBeNull());
    await act(async () => {
      nfc.control.resolveWrite({ status: 'written', tag: FAKE_TAG });
    });

    fireEvent.press(screen.getByText('Done'));

    expect(popTo).toHaveBeenCalledWith('charactersList');
  });

  it('offers no Done button while a write is still pending', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    await waitFor(() => expect(screen.getByText('Waiting for NFC…')).toBeOnTheScreen());

    expect(screen.queryByText('Done')).toBeNull();
  });

  it.each([
    ['cancelled', { status: 'cancelled' as const }, 'Cancelled'],
    ['read-only', { status: 'read-only' as const }, 'Tag is locked'],
    ['too-large', { status: 'too-large' as const, capacityBytes: 504 }, 'Does not fit'],
    ['error', { status: 'error' as const, message: 'Tag connection lost' }, 'Something went wrong'],
  ])('renders the %s outcome', async (_label, outcome, expected) => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    await waitFor(() => expect(nfc.control.pending).not.toBeNull());

    await act(async () => {
      nfc.control.resolveWrite(outcome);
    });

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('reports unavailable hardware without ever waiting', async () => {
    const nfc = createFakeNfcReader({ available: false });
    renderScreen(nfc);

    await waitFor(() => expect(screen.getByText('NFC unavailable')).toBeOnTheScreen());
    expect(screen.getByText('This device has no NFC reader.')).toBeOnTheScreen();
  });

  it('Try again starts a second write', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    await waitFor(() => expect(nfc.control.pending).not.toBeNull());
    await act(async () => {
      nfc.control.resolveWrite({ status: 'cancelled' });
    });

    fireEvent.press(screen.getByText('Try again'));

    await waitFor(() => expect(nfc.control.pending).toMatchObject({ kind: 'write' }));
    expect(screen.getByText('Waiting for NFC…')).toBeOnTheScreen();
  });

  /** The stuck-session failure mode this port exists to prevent. */
  it('aborts the session when the screen unmounts', async () => {
    const nfc = createFakeNfcReader();
    const { unmount } = renderScreen(nfc);
    await waitFor(() => expect(nfc.control.pending).not.toBeNull());

    unmount();

    await waitFor(() => expect(nfc.control.pending).toBeNull());
    expect(nfc.control.written).toEqual([]);
  });

  it('falls back and never starts a session for an unknown id', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc, 'not-a-real-id');

    await waitFor(() => expect(screen.getByText('Character not found')).toBeOnTheScreen());
    expect(nfc.control.pending).toBeNull();
  });

  it('shows the dev panel for a fake and its buttons drive the flow', async () => {
    const nfc = createFakeNfcReader();
    renderScreen(nfc);
    await waitFor(() => expect(screen.getByText('Tag written')).toBeOnTheScreen());

    fireEvent.press(screen.getByText('Tag written'));

    await waitFor(() => expect(screen.getByText('Tag registered')).toBeOnTheScreen());
  });

  it('hides the dev panel when a real adapter is injected', async () => {
    const nfc = createFakeNfcReader();
    const setOptions = jest.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CharactersProvider>
        {/* control deliberately omitted — this is what a real adapter looks like */}
        <NfcProvider reader={nfc.reader}>{children}</NfcProvider>
      </CharactersProvider>
    );
    render(
      <RegisterNfcScreen
        route={{ params: { characterId: LUKE_URL } } as never}
        navigation={{ setOptions } as never}
      />,
      { wrapper }
    );

    await waitFor(() => expect(screen.getByText('Waiting for NFC…')).toBeOnTheScreen());
    expect(screen.queryByText('Tag written')).toBeNull();
  });
});
