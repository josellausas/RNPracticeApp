import { Character } from '../interfaces/interfaces';

const CHARACTERS_URL = 'https://swapi.info/api/people';

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
