import { useEffect, useRef, useState } from 'react';

/**
 * Debounce a changing value. Pair with useAsyncData for search-as-you-type:
 *
 *   const [query, setQuery] = useState('');
 *   const debounced = useDebouncedValue(query, 300);
 *   const { state } = useAsyncData(
 *     (signal) => fetchJson<Result[]>(`/search?q=${debounced}`, signal),
 *     [debounced]
 *   );
 *
 * The user types at render speed; the network fires at debounce speed.
 * Every keystroke clears the pending timer — that's the whole trick.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

/**
 * Debounce a *function* instead of a value — for "save as you type" or any
 * handler you don't control the inputs of.
 *
 * The ref keeps the latest callback without resetting the timer, so the
 * debounced function stays referentially stable across renders.
 */
export const useDebouncedCallback = <A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number = 300
) => {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return useRef((...args: A) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
  }).current;
};
