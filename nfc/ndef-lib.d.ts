/**
 * Types for react-native-nfc-manager's deep `ndef-lib` entry point.
 *
 * The package ships types for its main module but not for this subpath. The
 * subpath matters because `ndef-lib` is pure JavaScript with no native
 * dependency — importing it directly is what lets `ndefCodec.test.ts` exercise
 * the REAL encoder and decoder under jest, instead of a mock written from the
 * same assumptions as the adapter.
 *
 * Deliberately loose: this describes only the surface the codec test uses, and
 * claiming more precision than the untyped JS actually guarantees would be a
 * lie the compiler would then enforce.
 */
declare module 'react-native-nfc-manager/ndef-lib' {
  export interface NdefRecord {
    tnf: number;
    type: number[] | string;
    id: number[];
    payload: number[];
  }

  interface NdefLib {
    readonly TNF_WELL_KNOWN: number;
    readonly RTD_URI: string;
    readonly RTD_TEXT: string;

    uriRecord(uri: string, id?: number[]): NdefRecord;
    textRecord(text: string, languageCode?: string, id?: number[]): NdefRecord;

    encodeMessage(records: NdefRecord[]): number[];
    decodeMessage(bytes: number[]): NdefRecord[];
    isType(record: unknown, tnf: number, type: string): boolean;

    uri: { decodePayload(payload: number[]): string };
    text: { decodePayload(payload: number[]): string };
  }

  const Ndef: NdefLib;
  export default Ndef;
}
