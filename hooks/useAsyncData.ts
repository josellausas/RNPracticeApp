import { DependencyList, useCallback, useEffect, useState } from 'react';

/**
 * Fetch-with-lifecycle. The workhorse — reach for this first.
 *
 * Covers, in one place: idle / loading / error / success, cancel on unmount,
 * cancel on retry, timeout, and the stale-response race (tap A, tap B,
 * A's slower response lands last and overwrites B).
 */

/** One status at a time, so `loading && error` cannot be represented. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/** Takes a signal so the hook can cancel on unmount, retry, or timeout. */
export type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

export type AsyncDataOptions = {
  /**
   * Gate the request. While false the hook sits in 'idle' and never calls the
   * fetcher; flipping it to true starts exactly one fetch. That lets a caller
   * defer work it may never need — react-query spells this the same way.
   *
   * 'idle' exists because "nobody asked yet" and "in flight" are genuinely
   * different states, and collapsing them would show a spinner for a request
   * that will never happen.
   */
  enabled?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

const toMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

/**
 * `deps` — not `fetcher` — decides when to refetch, so callers can pass a
 * plain inline arrow without useCallback and without an infinite loop.
 * Same idea as react-query's `queryKey` or useSWR's key.
 *
 *   const { state, retry } = useAsyncData(
 *     (signal) => fetchJson<Film[]>(url, signal),
 *     [url]
 *   );
 *
 * List in `deps` everything the fetcher closes over — the same contract
 * useCallback has. (react-hooks/exhaustive-deps can't verify a spread deps
 * array, so that one is on you.)
 */
export const useAsyncData = <T>(
  fetcher: Fetcher<T>,
  deps: DependencyList = [],
  { enabled = true, timeoutMs = DEFAULT_TIMEOUT_MS }: AsyncDataOptions = {},
) => {
  // Start in 'loading' when a fetch is imminent, so the very first render
  // already paints the spinner; start 'idle' when gated off.
  const [state, setState] = useState<AsyncState<T>>(
    enabled ? { status: 'loading' } : { status: 'idle' },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      // Functional form returns the same reference when already idle, so React
      // bails out instead of re-rendering every consumer for nothing.
      setState((current) => (current.status === 'idle' ? current : { status: 'idle' }));
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;

    // Back to loading whenever deps change, or the previous result stays on
    // screen during the refetch — character A's films under character B's name.
    setState({ status: 'loading' });

    // AbortSignal.timeout() typechecks under Expo's DOM lib but is absent from
    // React Native's abort-controller polyfill, so the timer is manual.
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    fetcher(controller.signal)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: timedOut ? `Timed out after ${timeoutMs / 1000}s` : toMessage(error),
        });
      })
      .finally(() => clearTimeout(timer));

    // Runs before the next effect, so a superseded response can never land.
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, timeoutMs, attempt, enabled]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
};
