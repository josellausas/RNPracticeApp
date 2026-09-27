import { createFakeNfcReader, FAKE_TAG } from '../adapters/fakeNfcReader';

describe('fakeNfcReader — scripted mode', () => {
  it('reports availability and can be switched off', async () => {
    const { reader, control } = createFakeNfcReader();
    await expect(reader.isAvailable()).resolves.toBe(true);
    control.setAvailable(false);
    await expect(reader.isAvailable()).resolves.toBe(false);
  });

  it('returns unavailable rather than throwing when the radio is off', async () => {
    const { reader, control } = createFakeNfcReader({ available: false });
    control.setUnavailableReason('disabled');
    await expect(reader.scan()).resolves.toEqual({ status: 'unavailable', reason: 'disabled' });
    await expect(reader.write('x')).resolves.toEqual({ status: 'unavailable', reason: 'disabled' });
  });

  it('consumes queued outcomes FIFO', async () => {
    const { reader, control } = createFakeNfcReader();
    control.enqueueScan({ status: 'cancelled' });
    control.enqueueScan({ status: 'tag', tag: FAKE_TAG });

    await expect(reader.scan()).resolves.toEqual({ status: 'cancelled' });
    await expect(reader.scan()).resolves.toEqual({ status: 'tag', tag: FAKE_TAG });
  });

  it('records payloads only for writes that actually succeeded', async () => {
    const { reader, control } = createFakeNfcReader();
    control.enqueueWrite({ status: 'written', tag: FAKE_TAG });
    control.enqueueWrite({ status: 'read-only' });

    await reader.write('kept');
    await reader.write('rejected');

    expect(control.written).toEqual(['kept']);
  });
});

describe('fakeNfcReader — interactive mode', () => {
  it('stays pending until resolved, and exposes what it is waiting on', async () => {
    const { reader, control } = createFakeNfcReader();
    expect(control.pending).toBeNull();

    const promise = reader.write('swapi://1', { prompt: 'Hold a tag' });
    expect(control.pending).toEqual({ kind: 'write', payload: 'swapi://1', prompt: 'Hold a tag' });

    control.resolveWrite({ status: 'written', tag: FAKE_TAG });

    await expect(promise).resolves.toEqual({ status: 'written', tag: FAKE_TAG });
    expect(control.pending).toBeNull();
  });

  it('notifies subscribers when a request starts and settles', async () => {
    const { reader, control } = createFakeNfcReader();
    const listener = jest.fn();
    const unsubscribe = control.subscribe(listener);

    const promise = reader.scan();
    expect(listener).toHaveBeenCalledTimes(1);

    control.resolveScan({ status: 'tag', tag: FAKE_TAG });
    await promise;
    expect(listener).toHaveBeenCalledTimes(2);

    // Not awaited on purpose: with nothing queued this request stays pending,
    // which is exactly the behaviour under test — starting it must no longer
    // reach the unsubscribed listener.
    unsubscribe();
    reader.scan();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores a resolve of the wrong kind', async () => {
    const { reader, control } = createFakeNfcReader();
    const promise = reader.scan();

    control.resolveWrite({ status: 'written', tag: FAKE_TAG });
    expect(control.pending).toEqual({ kind: 'scan', prompt: undefined });

    control.resolveScan({ status: 'cancelled' });
    await expect(promise).resolves.toEqual({ status: 'cancelled' });
  });

  it('settles exactly once even if resolved twice', async () => {
    const { reader, control } = createFakeNfcReader();
    const promise = reader.scan();

    control.resolveScan({ status: 'tag', tag: FAKE_TAG });
    control.resolveScan({ status: 'error', message: 'late' });

    await expect(promise).resolves.toEqual({ status: 'tag', tag: FAKE_TAG });
  });
});

describe('fakeNfcReader — real-hardware constraints', () => {
  /** Mirrors CoreNFC: one session at a time, system-wide. */
  it('refuses a second session while one is in flight', async () => {
    const { reader } = createFakeNfcReader();
    const first = reader.scan();

    await expect(reader.scan()).resolves.toEqual({
      status: 'error',
      message: 'An NFC session is already in progress',
    });
    await expect(reader.write('x')).resolves.toMatchObject({ status: 'error' });

    expect(first).toBeInstanceOf(Promise);
  });

  it('cancels an in-flight request when the signal aborts', async () => {
    const { reader, control } = createFakeNfcReader();
    const controller = new AbortController();

    const promise = reader.write('x', { signal: controller.signal });
    expect(control.pending).not.toBeNull();

    controller.abort();

    await expect(promise).resolves.toEqual({ status: 'cancelled' });
    expect(control.pending).toBeNull();
    expect(control.written).toEqual([]);
  });

  it('cancels immediately when handed an already-aborted signal', async () => {
    const { reader } = createFakeNfcReader();
    const controller = new AbortController();
    controller.abort();

    await expect(reader.scan({ signal: controller.signal })).resolves.toEqual({ status: 'cancelled' });
  });

  it('reset cancels anything in flight and clears state', async () => {
    const { reader, control } = createFakeNfcReader();
    control.enqueueScan({ status: 'cancelled' });
    const promise = reader.write('x');

    control.reset();

    await expect(promise).resolves.toEqual({ status: 'cancelled' });
    expect(control.pending).toBeNull();
    expect(control.written).toEqual([]);
    // The queued scan is gone too, so this one is left pending.
    reader.scan();
    expect(control.pending).toEqual({ kind: 'scan', prompt: undefined });
  });
});
