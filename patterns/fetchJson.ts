/**
 * The typed network boundary.
 *
 * Two things every hand-rolled fetch gets wrong:
 *   1. fetch() only rejects on *network* failure. An HTTP 500 resolves happily,
 *      so without the `ok` check your error arrives as `undefined` data later.
 *   2. response.json() returns `any`, which poisons every type downstream.
 *
 * Both are fixed here, once, so the rest of the app is honestly typed.
 */

export const fetchJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Request failed (HTTP ${response.status}) — ${url}`);
  }

  // The single cast in the whole app. Everything past this line is typed.
  // In production this is where Zod goes: `return Schema.parse(await response.json())`.
  return (await response.json()) as T;
};

/**
 * Fetch many URLs at once.
 *
 * Note the explicit arrow: `urls.map(fetchJson)` would pass map's second
 * argument (the index) as `signal`. Same family of bug as
 * `['1','2','3'].map(parseInt)` → `[1, NaN, NaN]`.
 */
export const fetchAllJson = <T>(urls: string[], signal?: AbortSignal): Promise<T[]> =>
  Promise.all(urls.map((url) => fetchJson<T>(url, signal)));

/**
 * Same as above but one failure doesn't discard the successes.
 * Say this out loud when asked about Promise.all's all-or-nothing semantics.
 */
export const fetchAllJsonSettled = async <T>(
  urls: string[],
  signal?: AbortSignal
): Promise<Awaited<T>[]> => {
  const results = await Promise.allSettled(urls.map((url) => fetchJson<T>(url, signal)));

  // `(r): r is X =>` is a type predicate — it narrows inside .filter(), which a
  // plain boolean return does not. Without it, `.map((r) => r.value)` fails to
  // compile because PromiseRejectedResult has no `value`.
  return results
    .filter((r): r is PromiseFulfilledResult<Awaited<T>> => r.status === 'fulfilled')
    .map((r) => r.value);
};

/** Aborting makes fetch reject. Filter it out or every unmount flashes an error. */
export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
