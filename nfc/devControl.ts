import { NfcScan, NfcTag, NfcUnavailableReason, NfcWrite } from './types';

/**
 * The control surface a test-double reader exposes for driving it by hand.
 *
 * Deliberately NOT in `nfc/types.ts`. That file describes what the *app* needs
 * from NFC; `enqueueScan` and `resolveWrite` are test-double vocabulary and
 * would pollute the port with concepts no real adapter can honour.
 *
 * It lives in its own module so `NfcContext` and `DevNfcPanel` can depend on
 * the interface rather than on `adapters/fakeNfcReader` — previously both
 * imported straight from that adapter, which inverted the dependency and meant
 * the DI layer could not be understood without reading a test double.
 */

export type PendingNfcRequest =
  | { kind: 'scan'; prompt?: string }
  | { kind: 'write'; payload: string; prompt?: string };

export interface NfcDevControl {
  /** What the app is currently waiting on, or null when idle. */
  readonly pending: PendingNfcRequest | null;
  /** Payloads accepted by a 'written' outcome, in order. For assertions. */
  readonly written: readonly string[];

  /**
   * The stand-in tag the dev UI hands back. Exposed here so the panel does not
   * have to import a constant from a specific adapter.
   */
  readonly tagTemplate: NfcTag;

  /**
   * A payload the dev UI can offer as "a tag that already has something on it",
   * so a read flow is testable without writing one first. Supplied by the app,
   * because the nfc layer must not know what a SWAPI id looks like.
   */
  readonly sampleTagPayload?: string;

  /** Re-render hook for the dev panel. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;

  /** Pre-load outcomes; consumed FIFO before a request is ever left pending. */
  enqueueScan(outcome: NfcScan): void;
  enqueueWrite(outcome: NfcWrite): void;

  /** Settle whatever is pending. No-ops when idle or when the kind mismatches. */
  resolveScan(outcome: NfcScan): void;
  resolveWrite(outcome: NfcWrite): void;

  setAvailable(available: boolean): void;
  setUnavailableReason(reason: NfcUnavailableReason): void;

  /** Back to a clean slate. Any in-flight request settles as cancelled. */
  reset(): void;
}
