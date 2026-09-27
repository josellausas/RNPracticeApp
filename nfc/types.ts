/**
 * The NFC port.
 *
 * This file describes what the APP needs, in the app's own vocabulary. Nothing
 * from react-native-nfc-manager, CoreNFC or any future Swift module may appear
 * here — that is the whole point. Screens depend on this file; adapters
 * implement it; swapping an adapter changes one line in App.tsx.
 */

/** A physical tag, reduced to the two things this app cares about. */
export interface NfcTag {
  /** Hardware UID as lowercase hex. Stable for the life of the tag. */
  id: string;
  /**
   * Decoded NDEF payload (this app writes URI records), or null if the tag was
   * blank. Never an empty string — callers distinguish "blank tag" from
   * "unrecognised tag" with a `=== null` check.
   */
  payload: string | null;
}

export type NfcUnavailableReason =
  /** Device has no NFC radio (or is a simulator). */
  | 'no-hardware'
  /** Radio present but switched off — Android only; iOS has no such state. */
  | 'disabled'
  /** Entitlement or runtime permission missing. */
  | 'no-permission';

/**
 * Every outcome of a scan, as data.
 *
 * Note what is NOT here: exceptions. A user dismissing the sheet is an
 * expected outcome, not an error, so it is a union member. Same discipline as
 * AsyncState and CharacterLookup — a rejected promise from an adapter means
 * the adapter has a bug, not that the user did something.
 *
 * This is also what contains react-native-nfc-manager's error-string chaos
 * ("Not even registered", "Not connected") — the adapter maps those to cases
 * here, and no screen ever sees a library string.
 */
export type NfcScan =
  | { status: 'tag'; tag: NfcTag }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: NfcUnavailableReason }
  | { status: 'error'; message: string };

export type NfcWrite =
  | { status: 'written'; tag: NfcTag }
  | { status: 'cancelled' }
  /** Tag is locked. NTAG permanently locks once the lock bits are set. */
  | { status: 'read-only' }
  /** NTAG 215 holds ~504 bytes of user memory, less NDEF framing overhead. */
  | { status: 'too-large'; capacityBytes: number }
  | { status: 'unavailable'; reason: NfcUnavailableReason }
  | { status: 'error'; message: string };

export interface NfcRequestOptions {
  /** Copy for the iOS system sheet. Ignored where the platform has no sheet. */
  prompt?: string;
  /** Abort the session — navigating away, or a screen unmounting mid-scan. */
  signal?: AbortSignal;
}

/**
 * The capability every adapter provides.
 *
 * Deliberately three methods. Session lifecycle (begin / connect / invalidate)
 * is an implementation detail of each adapter, not something screens drive —
 * leaking it is exactly how nfc-manager's callers end up with stuck sessions.
 */
export interface NfcReader {
  /** Cheap enough to call on every screen mount. */
  isAvailable(): Promise<boolean>;
  scan(options?: NfcRequestOptions): Promise<NfcScan>;
  write(payload: string, options?: NfcRequestOptions): Promise<NfcWrite>;
}
