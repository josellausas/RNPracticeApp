import { NfcReader, NfcRequestOptions, NfcScan, NfcWrite } from './types';

/**
 * Wraps an NfcReader so it cannot violate the port contract, however badly the
 * thing underneath behaves.
 *
 * This exists because react-native-nfc-manager can leave a request permanently
 * unsettled. Its iOS `cancelTechnologyRequest` invalidates the session and
 * returns immediately, but the pending `requestTechnology` callback is only
 * fired later by the `didInvalidateWithError` delegate — if that delegate never
 * runs, the promise never settles. Neither screen has a `.catch()` and the
 * "waiting" state has no cancel button, so a hung promise strands the UI with
 * no way out but the back button.
 *
 * Three guarantees, in order of importance:
 *
 *   1. ALWAYS SETTLES. Every call races the adapter against the abort signal
 *      and a watchdog. Teardown continues in the background; the caller does
 *      not wait for it.
 *   2. NEVER REJECTS, and never resolves something that is not a valid union
 *      member — both become `{ status: 'error' }`.
 *   3. ONE SESSION AT A TIME, matching real hardware, but without breaking the
 *      retry buttons (see the note on `waitForSlot`).
 *
 * Apply once at module scope. The reader ends up in both screens' effect
 * dependency arrays, so a new identity per render would abort and restart the
 * session on every render.
 */

export interface GuardOptions {
  /**
   * Ceiling on a single request. Must exceed iOS's own session limit (~60s) so
   * it only fires when the adapter has genuinely lost its callback, never to
   * cut short a session the user is still using. Milliseconds in tests.
   */
  watchdogMs?: number;
  /**
   * Ceiling on waiting for a previous session to finish tearing down before
   * declaring the reader busy.
   */
  slotWaitMs?: number;
}

const DEFAULT_WATCHDOG_MS = 70_000;
const DEFAULT_SLOT_WAIT_MS = 5_000;

export const GUARD_MESSAGES = {
  busy: 'Another NFC session is still finishing. Try again in a moment.',
  timeout: 'The NFC reader stopped responding.',
  crashed: 'The NFC reader failed unexpectedly.',
} as const;

const SCAN_STATUSES = ['tag', 'cancelled', 'unavailable', 'error'];
const WRITE_STATUSES = ['written', 'cancelled', 'read-only', 'too-large', 'unavailable', 'error'];

/** A resolved value is only trusted if it actually looks like a union member. */
const isValid = (value: unknown, allowed: string[]): boolean =>
  typeof value === 'object' &&
  value !== null &&
  allowed.includes((value as { status?: string }).status ?? '');

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const guardReader = (reader: NfcReader, options: GuardOptions = {}): NfcReader => {
  const watchdogMs = options.watchdogMs ?? DEFAULT_WATCHDOG_MS;
  const slotWaitMs = options.slotWaitMs ?? DEFAULT_SLOT_WAIT_MS;

  /**
   * True from the instant a session is claimed until the ADAPTER settles — not
   * until the caller is released. A watchdog- or abort-settled call leaves the
   * radio busy, and starting a second session then would be exactly the race
   * this guard exists to prevent.
   *
   * It must be a plain synchronous flag: an `await` between checking and
   * claiming lets two callers in the same tick both pass, which is precisely
   * what the serialization tests caught.
   */
  let adapterBusy = false;
  let adapterSettled: Promise<unknown> = Promise.resolve();

  const startNow = <T>(
    work: () => Promise<T>,
    requestOptions: NfcRequestOptions | undefined,
    allowed: string[],
    cancelled: T,
    timedOut: T,
    crashed: T
  ): Promise<T> => {
    adapterBusy = true;

    let settle!: (outcome: T) => void;
    const settled = new Promise<T>((resolve) => {
      settle = resolve;
    });

    let done = false;
    const cleanup = () => {
      clearTimeout(timer);
      requestOptions?.signal?.removeEventListener('abort', onAbort);
    };
    const finish = (outcome: T) => {
      if (done) return;
      done = true;
      cleanup();
      settle(outcome);
    };
    const onAbort = () => finish(cancelled);
    const timer = setTimeout(() => finish(timedOut), watchdogMs);

    requestOptions?.signal?.addEventListener('abort', onAbort);

    // Not awaited: if the adapter hangs, the abort listener and the watchdog
    // still release the caller. Both handlers are supplied so a rejection here
    // can never surface as an unhandled one.
    const attempt = work().then(
      (outcome) => finish(isValid(outcome, allowed) ? outcome : crashed),
      () => finish(crashed)
    );
    adapterSettled = attempt.finally(() => {
      adapterBusy = false;
    });

    return settled;
  };

  const run = <T>(
    work: () => Promise<T>,
    requestOptions: NfcRequestOptions | undefined,
    allowed: string[],
    cancelled: T,
    busy: T,
    timedOut: T,
    crashed: T
  ): Promise<T> => {
    // Aborted before we start: never open a session at all. On iOS, opening one
    // only to invalidate it flashes the system sheet and burns session quota.
    if (requestOptions?.signal?.aborted) return Promise.resolve(cancelled);

    if (!adapterBusy) {
      return startNow(work, requestOptions, allowed, cancelled, timedOut, crashed);
    }

    /**
     * Both retry buttons bump a counter that is an effect dependency, so React
     * runs the cleanup (`abort()`) and the next effect body synchronously in one
     * commit — while the adapter's own teardown is still in flight. Failing
     * outright here would make every "Try again" return busy. So wait for the
     * predecessor, bounded, and only report busy if it is still running. The
     * bound is also what stops a hung adapter wedging the guard forever.
     */
    return (async () => {
      const freed = await Promise.race([
        adapterSettled.then(() => true),
        sleep(slotWaitMs).then(() => false),
      ]);
      if (!freed) return busy;
      if (requestOptions?.signal?.aborted) return cancelled;
      if (adapterBusy) return busy; // another waiter claimed it first
      return startNow(work, requestOptions, allowed, cancelled, timedOut, crashed);
    })();
  };

  return {
    isAvailable: async () => {
      try {
        return (await reader.isAvailable()) === true;
      } catch {
        return false;
      }
    },

    scan: (requestOptions) =>
      run<NfcScan>(
        () => reader.scan(requestOptions),
        requestOptions,
        SCAN_STATUSES,
        { status: 'cancelled' },
        { status: 'error', message: GUARD_MESSAGES.busy },
        { status: 'error', message: GUARD_MESSAGES.timeout },
        { status: 'error', message: GUARD_MESSAGES.crashed }
      ) as Promise<NfcScan>,

    write: (payload, requestOptions) =>
      run<NfcWrite>(
        () => reader.write(payload, requestOptions),
        requestOptions,
        WRITE_STATUSES,
        { status: 'cancelled' },
        { status: 'error', message: GUARD_MESSAGES.busy },
        { status: 'error', message: GUARD_MESSAGES.timeout },
        { status: 'error', message: GUARD_MESSAGES.crashed }
      ),
  };
};
