import {
  NfcReader,
  NfcRequestOptions,
  NfcScan,
  NfcTag,
  NfcUnavailableReason,
  NfcWrite,
} from '../types';
import { NfcDevControl, PendingNfcRequest } from '../devControl';

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

/** The control surface lives in ../devControl so nothing outside tests imports this file. */
export type FakeNfcControl = NfcDevControl;

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
    // Aborted first, matching the ordering a real adapter must use: opening and
    // instantly invalidating a CoreNFC session flashes the system sheet and
    // counts against iOS session throttling. Previously this sat below the
    // queue, which was a scripting artifact that would have made a shared
    // contract suite dishonest.
    if (requestOptions?.signal?.aborted) return Promise.resolve(cancelled);
    if (!available) return Promise.resolve(unavailable);
    if (pending !== null) return Promise.resolve(busy);

    const queued = queue.shift();
    if (queued) {
      if (request.kind === 'write' && queued.status === 'written') {
        written.push(request.payload);
      }
      return Promise.resolve(queued);
    }

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
    tagTemplate: FAKE_TAG,
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
