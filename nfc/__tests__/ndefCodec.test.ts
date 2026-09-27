import Ndef from 'react-native-nfc-manager/ndef-lib';

/**
 * The one adapter test that proves something real.
 *
 * `ndef-lib` is pure JavaScript with no native dependency, so this exercises
 * the ACTUAL encoder and decoder the adapter uses — not a mock written from
 * the same assumptions as the code under test.
 *
 * What it protects: `NfcReadScreen` feeds the decoded payload straight into
 * `useCharacter()`, which matches with `c.url === id`. Any drift in the codec,
 * or any well-meaning normalization, silently turns "Found" into "Unknown tag".
 */

const LUKE_URL = 'https://swapi.info/api/people/1';

const encode = (value: string) => Ndef.encodeMessage([Ndef.uriRecord(value)]);

const decode = (bytes: number[]): string | null => {
  const records = Ndef.decodeMessage(bytes);
  const record = records.find((candidate: unknown) =>
    Ndef.isType(candidate, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)
  );
  if (!record) return null;
  const decoded = Ndef.uri.decodePayload(record.payload);
  return decoded ? decoded : null;
};

describe('NDEF URI codec', () => {
  it('round-trips a character URL byte-identically', () => {
    // toBe, not toEqual: strict equality is what the lookup actually does.
    expect(decode(encode(LUKE_URL))).toBe(LUKE_URL);
  });

  it('preserves the absence of a trailing slash', () => {
    // swapi.info omits it, swapi.dev includes it, and the two are different ids.
    expect(decode(encode('https://swapi.info/api/people/1'))).toBe(
      'https://swapi.info/api/people/1'
    );
    expect(decode(encode('https://swapi.dev/api/people/1/'))).toBe(
      'https://swapi.dev/api/people/1/'
    );
  });

  it('applies prefix compression, so the payload is far under NTAG 215 capacity', () => {
    const bytes = encode(LUKE_URL);
    // 0x04 replaces the leading "https://", so the message is shorter than the URL.
    expect(bytes.length).toBeLessThan(LUKE_URL.length);
    expect(bytes.length).toBeLessThan(504);
  });

  it('writes a well-known URI record, which is what the adapter selects on read', () => {
    const [record] = Ndef.decodeMessage(encode(LUKE_URL));
    expect(Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)).toBe(true);
  });

  it('ignores non-URI records and finds the URI one among them', () => {
    const bytes = Ndef.encodeMessage([
      Ndef.textRecord('a label someone else wrote', 'en'),
      Ndef.uriRecord(LUKE_URL),
    ]);

    expect(decode(bytes)).toBe(LUKE_URL);
  });

  it('reports null when the message carries no URI record', () => {
    const bytes = Ndef.encodeMessage([Ndef.textRecord('just text', 'en')]);

    expect(decode(bytes)).toBeNull();
  });

  /**
   * Why the adapter must not reach for Ndef.text.decodePayload: it reads the
   * URI record's 0x04 prefix byte as a language-code length and returns junk.
   */
  it('decoding a URI record as text produces something other than the URL', () => {
    const [record] = Ndef.decodeMessage(encode(LUKE_URL));

    expect(Ndef.text.decodePayload(record.payload)).not.toBe(LUKE_URL);
  });
});
