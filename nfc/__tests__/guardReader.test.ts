import { guardReader, GUARD_MESSAGES } from '../guardReader';
import { NfcReader, NfcScan, NfcTag, NfcWrite } from '../types';
import { createFakeNfcReader, FAKE_TAG } from '../adapters/fakeNfcReader';

/** Readers that behave badly on purpose — the whole point of the guard. */
const hangingReader = (): NfcReader => ({
  isAvailable: async () => true,
  scan: () => new Promise<NfcScan>(() => {}),
  write: () => new Promise<NfcWrite>(() => {}),
});

const rejectingReader = (reason: unknown = new Error('native blew up')): NfcReader => ({
  isAvailable: async () => {
    throw reason;
  },
  scan: async () => {
    throw reason;
  },
  write: async () => {
    throw reason;
  },
});

const garbageReader = (value: unknown): NfcReader => ({
  isAvailable: async () => true,
  scan: async () => value as NfcScan,
  write: async () => value as NfcWrite,
});

const tag: NfcTag = FAKE_TAG;

describe('guardReader — always settles', () => {
  it('a hanging scan settles via the watchdog instead of never resolving', async () => {
    const guarded = guardReader(hangingReader(), { watchdogMs: 20 });

    await expect(guarded.scan()).resolves.toEqual({
      status: 'error',
      message: GUARD_MESSAGES.timeout,
    });
  });

  it('a hanging write settles via the watchdog', async () => {
    const guarded = guardReader(hangingReader(), { watchdogMs: 20 });

    await expect(guarded.write('x')).resolves.toEqual({
      status: 'error',
      message: GUARD_MESSAGES.timeout,
    });
  });

  /**
   * The documented nfc-manager failure: cancelling does not settle the pending
   * requestTechnology promise. The abort must release the caller anyway.
   */
  it('abort releases the caller even when the adapter never settles', async () => {
    const guarded = guardReader(hangingReader(), { watchdogMs: 60_000 });
    const controller = new AbortController();

    const promise = guarded.scan({ signal: controller.signal });
    controller.abort();

    await expect(promise).resolves.toEqual({ status: 'cancelled' });
  });

  it('does not open a session at all when handed an already-aborted signal', async () => {
    const reader = hangingReader();
    const scan = jest.spyOn(reader, 'scan');
    const guarded = guardReader(reader, { watchdogMs: 20 });
    const controller = new AbortController();
    controller.abort();

    await expect(guarded.scan({ signal: controller.signal })).resolves.toEqual({
      status: 'cancelled',
    });
    expect(scan).not.toHaveBeenCalled();
  });
});

describe('guardReader — never rejects', () => {
  it('converts a thrown error into an error outcome', async () => {
    const guarded = guardReader(rejectingReader(), { watchdogMs: 1_000 });

    await expect(guarded.scan()).resolves.toEqual({
      status: 'error',
      message: GUARD_MESSAGES.crashed,
    });
    await expect(guarded.write('x')).resolves.toEqual({
      status: 'error',
      message: GUARD_MESSAGES.crashed,
    });
  });

  it('survives a non-Error rejection', async () => {
    const guarded = guardReader(rejectingReader('Not even registered'), { watchdogMs: 1_000 });

    await expect(guarded.scan()).resolves.toMatchObject({ status: 'error' });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a bare string', 'tag'],
    ['an object with no status', { tag }],
    ['an unknown status', { status: 'weird' }],
  ])('treats %s resolved by the adapter as an error', async (_label, value) => {
    const guarded = guardReader(garbageReader(value), { watchdogMs: 1_000 });

    await expect(guarded.scan()).resolves.toEqual({
      status: 'error',
      message: GUARD_MESSAGES.crashed,
    });
  });

  it('isAvailable returns false rather than throwing', async () => {
    const guarded = guardReader(rejectingReader());

    await expect(guarded.isAvailable()).resolves.toBe(false);
  });
});

describe('guardReader — passes good outcomes through untouched', () => {
  it('forwards every valid scan and write outcome', async () => {
    const nfc = createFakeNfcReader();
    const guarded = guardReader(nfc.reader, { watchdogMs: 1_000 });

    nfc.control.enqueueScan({ status: 'tag', tag });
    await expect(guarded.scan()).resolves.toEqual({ status: 'tag', tag });

    nfc.control.enqueueWrite({ status: 'too-large', capacityBytes: 504 });
    await expect(guarded.write('x')).resolves.toEqual({ status: 'too-large', capacityBytes: 504 });

    nfc.control.enqueueScan({ status: 'unavailable', reason: 'no-hardware' });
    await expect(guarded.scan()).resolves.toEqual({ status: 'unavailable', reason: 'no-hardware' });
  });
});

describe('guardReader — session serialization', () => {
  it('reports busy when a second caller overlaps a genuinely running session', async () => {
    const guarded = guardReader(hangingReader(), { watchdogMs: 60_000, slotWaitMs: 20 });

    const first = guarded.scan();
    const second = await guarded.scan();

    expect(second).toEqual({ status: 'error', message: GUARD_MESSAGES.busy });
    expect(first).toBeInstanceOf(Promise);
  });

  /**
   * The regression that a naive mutex would cause. Retry bumps an effect dep, so
   * React aborts the old request and starts the new one in the same commit —
   * while the adapter's own teardown is still in flight.
   */
  it('a retry immediately after abort waits for the slot instead of failing busy', async () => {
    let settleFirst!: (outcome: NfcScan) => void;
    let call = 0;
    const reader: NfcReader = {
      isAvailable: async () => true,
      write: async () => ({ status: 'cancelled' }),
      scan: () => {
        call += 1;
        if (call === 1) return new Promise<NfcScan>((resolve) => (settleFirst = resolve));
        return Promise.resolve<NfcScan>({ status: 'tag', tag });
      },
    };
    const guarded = guardReader(reader, { watchdogMs: 60_000, slotWaitMs: 1_000 });

    const controller = new AbortController();
    const first = guarded.scan({ signal: controller.signal });
    controller.abort();
    await expect(first).resolves.toEqual({ status: 'cancelled' });

    // Retry starts while the adapter's first call is STILL unsettled.
    const retry = guarded.scan();
    // Teardown completes a tick later, as a real cancelTechnologyRequest would.
    settleFirst({ status: 'cancelled' });

    await expect(retry).resolves.toEqual({ status: 'tag', tag });
  });

  it('frees the slot once the adapter settles, even if the watchdog released the caller first', async () => {
    let settleFirst!: (outcome: NfcScan) => void;
    let call = 0;
    const reader: NfcReader = {
      isAvailable: async () => true,
      write: async () => ({ status: 'cancelled' }),
      scan: () => {
        call += 1;
        if (call === 1) return new Promise<NfcScan>((resolve) => (settleFirst = resolve));
        return Promise.resolve<NfcScan>({ status: 'tag', tag });
      },
    };
    const guarded = guardReader(reader, { watchdogMs: 20, slotWaitMs: 1_000 });

    await expect(guarded.scan()).resolves.toMatchObject({ status: 'error' });

    settleFirst({ status: 'cancelled' });

    await expect(guarded.scan()).resolves.toEqual({ status: 'tag', tag });
  });
});
