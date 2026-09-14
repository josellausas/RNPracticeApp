import { useCallback, useEffect, useState } from 'react';

/** One status at a time, so `loading && error` cannot be represented. */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error', message: string }
  | { status: 'ready', data: T };

/** Takes a signal so the hook can cancel on unmount, retry, or timeout. */
export type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

const DEFAULT_TIMEOUT_MS = 10_000;

const toMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

/**
 * `fetcher` is an effect dependency, so it must be referentially stable:
 * declare it at module scope, or wrap it in useCallback. An inline arrow
 * would be a new function every render and refetch forever.
 */
export const useAsyncData = <T>(
  fetcher: Fetcher<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
) => {
  // Starts as 'loading' so the very first render already paints the spinner.
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;

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

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetcher, timeoutMs, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
