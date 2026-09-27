/**
 * Error-mapping and session-lifecycle tests for the real adapter.
 *
 * HONESTY NOTE: the library is mocked, so this proves the adapter maps errors
 * the way it intends — not that nfc-manager actually produces those errors. The
 * iOS rows use the library's REAL error classes (via requireActual), so the
 * instanceof checks are genuine. The Android rows match on inferred message
 * strings and stay PROVISIONAL until captured from a device.
 *
 * The tests that prove something independent of these assumptions live in
 * ndefCodec.test.ts (real encoder/decoder) and guardReader.test.ts (real
 * misbehaviour).
 */
import NfcManager, { Ndef, NfcError } from 'react-native-nfc-manager';
import RealNdef from 'react-native-nfc-manager/ndef-lib';
import { createNfcManagerReader } from '../adapters/nfcManagerReader';

// babel-jest hoists this above the imports above, so the adapter never sees the
// real module. Written below them so `import/first` stays satisfied.
jest.mock('react-native-nfc-manager', () => {
  const actualError = jest.requireActual('react-native-nfc-manager/src/NfcError');
  const actualNdef = jest.requireActual('react-native-nfc-manager/ndef-lib');
  return {
    __esModule: true,
    default: {
      start: jest.fn().mockResolvedValue(undefined),
      isSupported: jest.fn().mockResolvedValue(true),
      isEnabled: jest.fn().mockResolvedValue(true),
      requestTechnology: jest.fn().mockResolvedValue(undefined),
      cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
      getTag: jest.fn().mockResolvedValue({ id: 'AABBCC', ndefMessage: [] }),
      ndefHandler: {
        getNdefStatus: jest.fn().mockResolvedValue({ status: 2, capacity: 504 }),
        writeNdefMessage: jest.fn().mockResolvedValue(undefined),
      },
    },
    Ndef: actualNdef,
    NfcError: actualError,
    NfcTech: { Ndef: 'Ndef' },
  };
});

const nfc = NfcManager as unknown as {
  start: jest.Mock;
  isSupported: jest.Mock;
  isEnabled: jest.Mock;
  requestTechnology: jest.Mock;
  cancelTechnologyRequest: jest.Mock;
  getTag: jest.Mock;
  ndefHandler: { getNdefStatus: jest.Mock; writeNdefMessage: jest.Mock };
};

const LUKE_URL = 'https://swapi.info/api/people/1';
const reader = createNfcManagerReader();

beforeEach(() => {
  jest.clearAllMocks();
  nfc.start.mockResolvedValue(undefined);
  nfc.isSupported.mockResolvedValue(true);
  nfc.isEnabled.mockResolvedValue(true);
  nfc.requestTechnology.mockResolvedValue(undefined);
  nfc.cancelTechnologyRequest.mockResolvedValue(undefined);
  nfc.getTag.mockResolvedValue({ id: 'AABBCC', ndefMessage: [] });
  nfc.ndefHandler.getNdefStatus.mockResolvedValue({ status: 2, capacity: 504 });
  nfc.ndefHandler.writeNdefMessage.mockResolvedValue(undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('error mapping — iOS typed classes (real classes, genuine instanceof)', () => {
  it.each([
    ['UserCancel', () => new NfcError.UserCancel(), { status: 'cancelled' }],
    ['Timeout', () => new NfcError.Timeout(), { status: 'cancelled' }],
    ['SessionInvalidated', () => new NfcError.SessionInvalidated(), { status: 'cancelled' }],
    ['RadioDisabled', () => new NfcError.RadioDisabled(), { status: 'unavailable', reason: 'disabled' }],
    ['SecurityViolation', () => new NfcError.SecurityViolation(), { status: 'unavailable', reason: 'no-permission' }],
    ['UnsupportedFeature', () => new NfcError.UnsupportedFeature(), { status: 'unavailable', reason: 'no-hardware' }],
  ])('scan maps %s', async (_label, makeError, expected) => {
    nfc.requestTechnology.mockRejectedValue(makeError());

    await expect(reader.scan()).resolves.toEqual(expected);
  });

  it.each([
    ['TagNotWritable', () => new NfcError.TagNotWritable(), { status: 'read-only' }],
    ['TagSizeTooSmall', () => new NfcError.TagSizeTooSmall(), { status: 'too-large', capacityBytes: 504 }],
    ['UserCancel', () => new NfcError.UserCancel(), { status: 'cancelled' }],
  ])('write maps %s', async (_label, makeError, expected) => {
    nfc.ndefHandler.writeNdefMessage.mockRejectedValue(makeError());

    await expect(reader.write(LUKE_URL)).resolves.toEqual(expected);
  });

  it('never leaks a library error string into user-facing copy', async () => {
    nfc.requestTechnology.mockRejectedValue('Not even registered');

    const outcome = await reader.scan();

    expect(outcome.status).toBe('error');
    expect(outcome).not.toMatchObject({ message: expect.stringContaining('registered') });
  });

  it('logs the unmapped raw error rather than showing it', async () => {
    nfc.requestTechnology.mockRejectedValue('Not connected');

    await reader.scan();

    expect(console.warn).toHaveBeenCalledWith('[nfc] unmapped error:', 'Not connected');
  });
});

describe('scan', () => {
  it('reads a URI payload off the tag', async () => {
    nfc.getTag.mockResolvedValue({
      id: 'AABBCC',
      ndefMessage: Ndef.decodeMessage(Ndef.encodeMessage([Ndef.uriRecord(LUKE_URL)])),
    });

    await expect(reader.scan()).resolves.toEqual({
      status: 'tag',
      tag: { id: 'aabbcc', payload: LUKE_URL },
    });
  });

  it('treats a tag with no NDEF data as blank, not as an error', async () => {
    nfc.getTag.mockResolvedValue({ id: 'AABBCC', ndefMessage: [] });

    await expect(reader.scan()).resolves.toEqual({
      status: 'tag',
      tag: { id: 'aabbcc', payload: null },
    });
  });

  it('reports a blank payload as null, never an empty string', async () => {
    nfc.getTag.mockResolvedValue({ id: 'AABBCC', ndefMessage: undefined });

    const outcome = await reader.scan();

    // NfcReadScreen checks `=== null` to tell "blank tag" from "unknown tag".
    expect(outcome).toMatchObject({ tag: { payload: null } });
  });

  it('lowercases the hardware id', async () => {
    nfc.getTag.mockResolvedValue({ id: '04A1B2C3D4E580', ndefMessage: [] });

    await expect(reader.scan()).resolves.toMatchObject({ tag: { id: '04a1b2c3d4e580' } });
  });
});

describe('write', () => {
  it('encodes the payload as a URI record and reports the tag', async () => {
    const outcome = await reader.write(LUKE_URL);

    expect(outcome).toEqual({ status: 'written', tag: { id: 'aabbcc', payload: LUKE_URL } });
    // Decoded through the deep ndef-lib path, which is the real codec and is
    // typed by nfc/ndef-lib.d.ts — the main module's bundled types describe
    // bytes as a Uint8Array, which is not what the JS actually produces.
    const [bytes] = nfc.ndefHandler.writeNdefMessage.mock.calls[0];
    expect(RealNdef.uri.decodePayload(RealNdef.decodeMessage(bytes)[0].payload)).toBe(LUKE_URL);
  });

  it('refuses up front when the tag reports itself read-only', async () => {
    nfc.ndefHandler.getNdefStatus.mockResolvedValue({ status: 3, capacity: 504 });

    await expect(reader.write(LUKE_URL)).resolves.toEqual({ status: 'read-only' });
    expect(nfc.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  });

  it('refuses up front when the payload exceeds the tag capacity', async () => {
    nfc.ndefHandler.getNdefStatus.mockResolvedValue({ status: 2, capacity: 8 });

    await expect(reader.write(LUKE_URL)).resolves.toEqual({
      status: 'too-large',
      capacityBytes: 8,
    });
  });

  /** Unformatted tags make getNdefStatus reject; that must not abort the write. */
  it('proceeds when the status query fails', async () => {
    nfc.ndefHandler.getNdefStatus.mockRejectedValue(new Error('no ndef tech'));

    await expect(reader.write(LUKE_URL)).resolves.toMatchObject({ status: 'written' });
    expect(nfc.ndefHandler.writeNdefMessage).toHaveBeenCalled();
  });
});

describe('session lifecycle', () => {
  it('always closes the session, on success and on failure', async () => {
    await reader.scan();
    expect(nfc.cancelTechnologyRequest).toHaveBeenCalledTimes(1);

    nfc.requestTechnology.mockRejectedValue(new NfcError.UserCancel());
    await reader.scan();
    expect(nfc.cancelTechnologyRequest).toHaveBeenCalledTimes(2);
  });

  it('never opens a session when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(reader.scan({ signal: controller.signal })).resolves.toEqual({
      status: 'cancelled',
    });
    await expect(reader.write(LUKE_URL, { signal: controller.signal })).resolves.toEqual({
      status: 'cancelled',
    });
    expect(nfc.requestTechnology).not.toHaveBeenCalled();
  });

  it('passes the prompt through as the iOS sheet copy', async () => {
    await reader.scan({ prompt: 'Hold a registered tag near your phone' });

    expect(nfc.requestTechnology).toHaveBeenCalledWith('Ndef', {
      alertMessage: 'Hold a registered tag near your phone',
    });
  });

  it('reports unavailable when the radio is not supported', async () => {
    nfc.isSupported.mockResolvedValue(false);

    await expect(reader.scan()).resolves.toEqual({
      status: 'unavailable',
      reason: 'no-hardware',
    });
    expect(nfc.requestTechnology).not.toHaveBeenCalled();
  });
});
