import { useCallback, useEffect, useState } from 'react';

/**
 * useState that survives app restarts.
 *
 * The store is *injected* rather than imported, so this file has zero
 * dependencies and works with AsyncStorage, MMKV, expo-secure-store, or an
 * in-memory fake in tests. That's the dependency-inversion point, and it's
 * why this pastes into a repo that hasn't installed AsyncStorage yet.
 *
 *   // app wiring, one line, at the edge:
 *   import AsyncStorage from '@react-native-async-storage/async-storage';
 *   const [favourites, setFavourites, isHydrated] =
 *     useStoredState<string[]>(AsyncStorage, 'favourites', []);
 */

/** AsyncStorage already satisfies this — no adapter needed. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** For tests and for demoing the seam without installing anything. */
export const createMemoryStore = (seed: Record<string, string> = {}): KeyValueStore => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => void map.set(key, value),
    removeItem: async (key) => void map.delete(key),
  };
};

export const useStoredState = <T>(store: KeyValueStore, key: string, initial: T) => {
  const [value, setValue] = useState<T>(initial);

  // Storage is async, so the first render always shows `initial`. Gate your UI
  // on this or you get a visible flash of defaults before the real value lands.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    store
      .getItem(key)
      .then((raw) => {
        if (cancelled || raw === null) return;
        setValue(JSON.parse(raw) as T);
      })
      // Corrupt JSON shouldn't crash the screen — fall back to `initial`.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [store, key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        // Fire-and-forget: the UI shouldn't wait on disk. Note that React
        // StrictMode double-invokes updaters, so this write can happen twice
        // in dev — harmless, because writing the same value is idempotent.
        void store.setItem(key, JSON.stringify(resolved)).catch(() => undefined);
        return resolved;
      });
    },
    [store, key]
  );

  const clear = useCallback(() => {
    setValue(initial);
    void store.removeItem(key).catch(() => undefined);
  }, [store, key, initial]);

  return [value, update, isHydrated, clear] as const;
};
