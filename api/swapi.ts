import { Character } from '../interfaces/interfaces';

/*
 * Two hosts, two pagination models, kept side by side on purpose.
 *
 *   swapi.info  ->  one bare array with all 82 records
 *   swapi.dev   ->  a { count, next, previous, results } envelope, 10 at a time
 *
 * They are NOT drop-in replacements. swapi.dev's `url` carries a trailing
 * slash and swapi.info's does not, so a record fetched from one will never
 * match an id from the other. Pick a host per feature and stay on it.
 */

const CHARACTERS_URL = 'https://swapi.info/api/people';

/** Entry point for the paginated host. Every later page comes from `next`/`previous`. */
export const FIRST_CHARACTERS_PAGE = 'https://swapi.dev/api/people/';

/**
 * fetch() only rejects on network failure — an HTTP 500 still resolves,
 * so a status check is required or errors arrive as undefined data.
 */
export const fetchCharacters = async (signal: AbortSignal): Promise<Character[]> => {
  const response = await fetch(CHARACTERS_URL, { signal });

  if (!response.ok) {
    throw new Error(`Could not load characters (HTTP ${response.status})`);
  }

  return (await response.json()) as Character[];
}

/**
 * One page of a paginated SWAPI collection.
 *
 * Generic over the row type because the envelope is identical for films,
 * planets and starships — only `results` changes.
 */
export interface Page<T> {
  /** Total across ALL pages, not this one. 82 for people. */
  count: number;
  /** Absolute URL of the next page, or null when this is the last page. */
  next: string | null;
  /** Absolute URL of the previous page, or null when this is the first page. */
  previous: string | null;
  results: T[];
}

/**
 * Fetch one page of characters from swapi.dev.
 *
 * Note the parameter: a URL, not a page number. That is deliberate and it is
 * the main idea behind this style of pagination — the server hands you the
 * address of the next page in `next`, and you give it straight back. The
 * caller never builds a query string, never tracks a page size, and never has
 * to know that swapi.dev happens to use `?page=N` under the hood. Swap the
 * server for one that uses opaque cursors (`?after=eyJpZCI6MTB9`) and this
 * signature does not change.
 *
 * Contrast with offset pagination (`?page=3`, `?limit=20&offset=40`), where
 * the client owns the arithmetic. That is easier to deep-link and to jump
 * around in, but it double-counts or skips rows when the underlying list
 * changes between requests — a cursor cannot drift like that.
 */
export const fetchCharactersPaged = async (
  signal: AbortSignal,
  pageUrl: string = FIRST_CHARACTERS_PAGE
): Promise<Page<Character>> => {
  const response = await fetch(pageUrl, { signal });

  // Asking for a page past the end is a real 404 here, not an empty page,
  // so this check is what turns an out-of-range `next` into a usable error.
  if (!response.ok) {
    throw new Error(`Could not load characters (HTTP ${response.status})`);
  }

  return (await response.json()) as Page<Character>;
}
