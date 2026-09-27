// import { fetchCharacters } from '../swapi';

// describe('fetchCharacters', () => {
//   const mockFetch = jest.fn();

//   beforeEach(() => {
//     mockFetch.mockReset();
//     global.fetch = mockFetch as unknown as typeof fetch;
//   });

//   it('returns the parsed character list on a 200', async () => {
//     const characters = [{ name: 'Luke Skywalker', birth_year: '19BBY', gender: 'male' }];
//     mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => characters });

//     await expect(fetchCharacters(new AbortController().signal)).resolves.toEqual(characters);
//   });

//   /**
//    * The behaviour the source file's comment calls out: fetch() resolves on a
//    * 500, so without the ok-check the caller would receive `undefined` data
//    * instead of an error.
//    */
//   it('throws with the status code when the response is not ok', async () => {
//     mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

//     await expect(fetchCharacters(new AbortController().signal)).rejects.toThrow(
//       'Could not load characters (HTTP 500)'
//     );
//   });

//   it('forwards the abort signal to fetch so the caller can cancel', async () => {
//     const { signal } = new AbortController();
//     mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => [] });

//     await fetchCharacters(signal);

//     expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal });
//   });

//   it('propagates a network-level rejection', async () => {
//     mockFetch.mockRejectedValue(new Error('Network request failed'));

//     await expect(fetchCharacters(new AbortController().signal)).rejects.toThrow(
//       'Network request failed'
//     );
//   });
// });
