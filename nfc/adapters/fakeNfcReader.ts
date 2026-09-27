import {
  NfcReader,
  NfcRequestOptions,
  NfcScan,
  NfcTag,
  NfcUnavailableReason,
  NfcWrite,
} from '../types';

/**
 * An NfcReader with no hardware behind it.
 *
 * Serves two jobs from one implementation:
 *
 *   Scripted   — `control.enqueueScan(...)` pre-loads an outcome, so a test
 *                gets a deterministic result with no manual step.
 *   Interactive — with nothing queued, a request stays PENDING and is exposed
 *                via `control.pending`. The dev panel resolves it by hand, so
 *                the whole UI is reachable on a simulator.
 *
 * It also enforces one-session-at-a-time, because real NFC does. A screen with
 * a double-start bug fails here instead of on a device.
 */

export type PendingNfcRequest =
  | { kind: 'scan'; prompt?: string }
  | { kind: 'write'; payload: string; prompt?: string };

export interface FakeNfcControl {
  /** What the app is currently waiting on, or null when idle. */
  readonly pending: PendingNfcRequest | null;
  /** Payloads accepted by a 'written' outcome, in order. For assertions. */
  readonly written: readonly string[];

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

  /**
   * A payload the dev panel can offer as "a tag that already has something on
   * it", so the read flow is testable without registering a tag first.
   * Supplied by the app, because the nfc layer must not know what a SWAPI id
   * looks like.
   */
  readonly sampleTagPayload?: string;

  /** Back to a clean slate. Any in-flight request settles as cancelled. */
  reset(): void;
}

export interface FakeNfc {
  reader: NfcReader;
  control: FakeNfcControl;
}

/** A recognisable stand-in UID, so fake data is obvious in logs and snapshots. */
export const FAKE_TAG: NfcTag = { id: '04a1b2c3d4e580', payload: null };

const BUSY_MESSAGE = 'An NFC session is already in progress';

export const createFakeNfcReader = (options?: {
  available?: boolean;
  sampleTagPayload?: string;
}): FakeNfc => {
  let available = options?.available ?? true;
  let unavailableReason: NfcUnavailableReason = 'no-hardware';

  const scanQueue: NfcScan[] = [];
  const writeQueue: NfcWrite[] = [];
  const written: string[] = [];
  const listeners = new Set<() => void>();

  let pending: PendingNfcRequest | null = null;
  // Set while a request is in flight; calling it settles that request exactly
  // once. Typed loosely here because scan and write share the mechanism — the
  // public resolveScan/resolveWrite keep callers honest.
  let settle: ((outcome: NfcScan | NfcWrite) => void) | null = null;

  const notify = () => listeners.forEach((listener) => listener());

  const start = <T extends NfcScan | NfcWrite>(
    request: PendingNfcRequest,
    queue: T[],
    requestOptions: NfcRequestOptions | undefined,
    unavailable: T,
    busy: T,
    cancelled: T
  ): Promise<T> => {
    if (!available) return Promise.resolve(unavailable);
    if (pending !== null) return Promise.resolve(busy);

    const queued = queue.shift();
    if (queued) {
      if (request.kind === 'write' && queued.status === 'written') {
        written.push(request.payload);
      }
      return Promise.resolve(queued);
    }

    if (requestOptions?.signal?.aborted) return Promise.resolve(cancelled);

    return new Promise<T>((resolve) => {
      const finish = (outcome: NfcScan | NfcWrite) => {
        if (settle !== finish) return; // already settled; ignore late callers
        requestOptions?.signal?.removeEventListener('abort', onAbort);
        if (request.kind === 'write' && outcome.status === 'written') {
          written.push(request.payload);
        }
        pending = null;
        settle = null;
        notify();
        resolve(outcome as T);
      };

      const onAbort = () => finish(cancelled);

      pending = request;
      settle = finish;
      requestOptions?.signal?.addEventListener('abort', onAbort);
      notify();
    });
  };

  const reader: NfcReader = {
    isAvailable: async () => available,

    scan: (requestOptions) =>
      start<NfcScan>(
        { kind: 'scan', prompt: requestOptions?.prompt },
        scanQueue,
        requestOptions,
        { status: 'unavailable', reason: unavailableReason },
        { status: 'error', message: BUSY_MESSAGE },
        { status: 'cancelled' }
      ),

    write: (payload, requestOptions) =>
      start<NfcWrite>(
        { kind: 'write', payload, prompt: requestOptions?.prompt },
        writeQueue,
        requestOptions,
        { status: 'unavailable', reason: unavailableReason },
        { status: 'error', message: BUSY_MESSAGE },
        { status: 'cancelled' }
      ),
  };

  const control: FakeNfcControl = {
    get pending() {
      return pending;
    },
    get written() {
      return written;
    },
    sampleTagPayload: options?.sampleTagPayload,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    enqueueScan(outcome) {
      scanQueue.push(outcome);
    },
    enqueueWrite(outcome) {
      writeQueue.push(outcome);
    },
    resolveScan(outcome) {
      if (pending?.kind !== 'scan') return;
      settle?.(outcome);
    },
    resolveWrite(outcome) {
      if (pending?.kind !== 'write') return;
      settle?.(outcome);
    },
    setAvailable(next) {
      available = next;
      notify();
    },
    setUnavailableReason(reason) {
      unavailableReason = reason;
      notify();
    },
    reset() {
      settle?.({ status: 'cancelled' });
      scanQueue.length = 0;
      writeQueue.length = 0;
      written.length = 0;
      available = options?.available ?? true;
      unavailableReason = 'no-hardware';
      notify();
    },
  };

  return { reader, control };
};
