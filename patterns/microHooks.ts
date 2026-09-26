import { useCallback, useEffect, useRef } from 'react';

/**
 * Six-line hooks. Kept less because they save typing than because they get
 * asked as questions outright — "implement useInterval" is a real prompt.
 */

/**
 * The value from the previous render. Returns undefined on the first one.
 * Good answer to "how would you animate only when the count increases?"
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);

  // Effects run *after* render, so the read below sees the previous value.
  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

/**
 * setInterval that survives re-renders. Pass `null` to pause.
 *
 * The problem it solves: putting `callback` in the effect deps tears down and
 * recreates the timer on every render, so the interval never actually fires.
 * Leaving it out instead captures the first render's callback forever — the
 * classic stale closure, where a counter is always stuck at 1.
 * The ref gives you a stable timer reading a fresh callback.
 */
export const useInterval = (callback: () => void, delayMs: number | null) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
};

/**
 * Ask whether the component is still mounted before setting state from an
 * async callback you can't cancel. Prefer AbortController when you can —
 * this ignores the result, it doesn't stop the work.
 */
export const useIsMounted = () => {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => mounted.current, []);
};

/** Drop in a component to see what's re-rendering, and how often. */
export const useRenderCount = (label: string) => {
  const count = useRef(0);
  count.current += 1;
  console.log(`[render] ${label}: ${count.current}`);
  return count.current;
};
