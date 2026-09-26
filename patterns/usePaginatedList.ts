import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Infinite scroll — the usual second act after "render this list".
 *
 *   <FlatList
 *     data={items}
 *     onEndReached={loadMore}
 *     onEndReachedThreshold={0.5}
 *     refreshing={isRefreshing}
 *     onRefresh={refresh}
 *     ListFooterComponent={isLoading ? <ActivityIndicator /> : null}
 *   />
 *
 * The two bugs this exists to prevent:
 *   - onEndReached fires repeatedly while scrolling. Without a re-entry guard
 *     you fire the same page three or four times.
 *   - The guard must be a ref, not state: several onEndReached calls can land
 *     before React re-renders, and state updates aren't visible until then.
 */

export type Page<T> = { items: T[]; nextCursor: string | null };
export type PageFetcher<T> = (cursor: string | null, signal: AbortSignal) => Promise<Page<T>>;

/** Offset-based APIs: wrap them so the cursor is just the next page number. */
export const offsetPager =
  <T>(fetchAt: (page: number, signal: AbortSignal) => Promise<{ items: T[]; hasMore: boolean }>) =>
  async (cursor: string | null, signal: AbortSignal): Promise<Page<T>> => {
    const page = cursor === null ? 1 : Number(cursor);
    const { items, hasMore } = await fetchAt(page, signal);
    return { items, nextCursor: hasMore ? String(page + 1) : null };
  };

export const usePaginatedList = <T>(fetchPage: PageFetcher<T>, deps: DependencyList = []) => {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Refs because these are read and written between renders.
  const inFlight = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (inFlight.current) return;
      if (!reset && !hasMoreRef.current) return;

      inFlight.current = true;
      if (reset) setIsRefreshing(true);
      else setIsLoading(true);

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const page = await fetchPage(reset ? null : cursorRef.current, controller.signal);
        if (controller.signal.aborted) return;

        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.nextCursor !== null;
        setHasMore(hasMoreRef.current);
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Failed to load');
        }
      } finally {
        // Generation check: only the newest request is allowed to clear the
        // flags, or a superseded one turns the spinner off underneath it.
        if (controllerRef.current === controller) {
          inFlight.current = false;
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [fetchPage]
  );

  const loadMore = useCallback(() => void load(false), [load]);
  const refresh = useCallback(() => void load(true), [load]);

  // Mount, and whenever deps change: wipe and start over.
  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlight.current = false;
    cursorRef.current = null;
    hasMoreRef.current = true;

    setItems([]);
    setHasMore(true);
    setError(null);

    void load(false);

    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return { items, isLoading, isRefreshing, error, hasMore, loadMore, refresh };
};
