import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Character } from '../interfaces/interfaces';
import { AsyncState, useAsyncData } from '../hooks/useAsyncData';
import { fetchCharacters } from '../api/swapi';

/**
 * The characters data layer.
 *
 * Two responsibilities, deliberately split:
 *   - This provider OWNS the data (the list plus its loading/error status).
 *   - Screens own only triggers. No screen owns the data, so no screen depends
 *     on another screen having run.
 *
 * Screens never import `CharactersContext` itself — note it is not exported.
 * They go through `useCharacters` / `useCharacter`. That indirection is the seam:
 * swapping context for Zustand or react-query later changes this file only.
 */
interface CharactersContextValue {
  /** Reuses AsyncState so every consumer handles the same cases. */
  state: AsyncState<Character[]>;
  /** Begin the first load. Idempotent — safe to call from every consumer. */
  load: () => void;
  /** Force a refetch. Driven by the list screen; the profile screen cannot reach it. */
  refresh: () => void;
}

const CharactersContext = createContext<CharactersContextValue | undefined>(undefined);

export const CharactersProvider = ({ children }: { children: ReactNode }) => {
  // Nothing fetches until something asks. Without this the request would fire
  // when the provider mounts — app launch — making every user pay for Star Wars
  // characters even if they only ever open the map.
  const [enabled, setEnabled] = useState(false);
  const { state, retry } = useAsyncData(fetchCharacters, [], { enabled });

  // Idempotent by construction: setting `enabled` to true when it already is
  // produces no state change, so extra callers cost nothing.
  const load = useCallback(() => setEnabled(true), []);

  const refresh = useCallback(() => {
    setEnabled(true);
    retry();
  }, [retry]);

  // Every value the object captures is in the deps array. `load` and `refresh`
  // are useCallback-stable and `retry` is stable inside useAsyncData, so in
  // practice this only rebuilds when `state` actually changes.
  //
  // Compare PinsContext, whose useMemo lists [pins] while also capturing three
  // functions rebuilt every render — `npm run lint` still flags it.
  const value = useMemo(() => ({ state, load, refresh }), [state, load, refresh]);

  return <CharactersContext.Provider value={value}>{children}</CharactersContext.Provider>;
};

/**
 * The list screen's view of the data: everything, plus the refresh trigger.
 *
 * Also where demand-driven loading lives — the first consumer to mount starts
 * the fetch. That is what lets the profile screen survive a cold start instead
 * of depending on the list screen having been visited first.
 */
export const useCharacters = (): CharactersContextValue => {
  const context = useContext(CharactersContext);

  // Read through optional chaining so both hooks run unconditionally. The
  // missing-provider guard has to come after them, or we would be calling
  // hooks conditionally.
  const status = context?.state.status;
  const load = context?.load;

  useEffect(() => {
    if (status === 'idle') load?.();
  }, [status, load]);

  // Turning "forgot the provider" into a named error beats debugging
  // `undefined is not an object` three components deep.
  if (!context) {
    throw new Error('useCharacters must be used within a CharactersProvider');
  }

  return context;
};

/**
 * The profile screen's view: one character, by id.
 *
 * Four cases, not two. Modelling them as a union means the screen cannot
 * forget one — the same "make impossible states unrepresentable" move
 * AsyncState makes in hooks/useAsyncData.ts.
 *
 * Note what is missing on purpose: no refresh, no fetch. A consumer of this
 * hook is structurally incapable of triggering a reload.
 */
export type CharacterLookup =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'found'; character: Character }
  | { status: 'missing' };

export const useCharacter = (id: string): CharacterLookup => {
  const { state } = useCharacters();

  // 'idle' collapses into 'loading' for callers: useCharacters has just kicked
  // the fetch off, so it is a frame-long state, not something worth rendering.
  if (state.status === 'idle' || state.status === 'loading') {
    return { status: 'loading' };
  }

  if (state.status === 'error') {
    return { status: 'error', message: state.message };
  }

  // A bad id is a different problem from a failed network call, so 'missing'
  // is its own case rather than being folded into 'error'.
  const character = state.data.find((candidate) => candidate.url === id);
  return character ? { status: 'found', character } : { status: 'missing' };
};
