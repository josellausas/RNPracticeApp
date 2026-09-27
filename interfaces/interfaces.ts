import { MenuRoute } from '../navigation/types';

export interface MenuItem {
  title: string;
  route: MenuRoute;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Pin extends Coordinate {
  id: string;
  title: string;
}

/* ------------------------------------------------------------------ *
 * SWAPI resource URLs
 * ------------------------------------------------------------------ */

declare const resourceBrand: unique symbol;

/**
 * A URL pointing at another SWAPI resource.
 *
 * Every relation SWAPI returns is just a string, so plain `string[]` would
 * happily let you hand a films array to something expecting starships. The
 * phantom `resourceBrand` tag makes them distinct types at compile time and
 * does not exist at runtime — zero bytes in the bundle.
 *
 * The cost: string literals no longer assign directly, you need
 * `'...' as FilmUrl`. That friction is paid once at the API boundary rather
 * than at every use site, which is the trade worth making.
 */
export type ResourceUrl<TResource extends string> = string & {
  readonly [resourceBrand]: TResource;
};

export type PersonUrl = ResourceUrl<'people'>;
export type FilmUrl = ResourceUrl<'films'>;
export type SpeciesUrl = ResourceUrl<'species'>;
export type VehicleUrl = ResourceUrl<'vehicles'>;
export type StarshipUrl = ResourceUrl<'starships'>;
export type PlanetUrl = ResourceUrl<'planets'>;

/**
 * The five values SWAPI returns today — verified across all 82 records on both
 * hosts. The `(string & {})` arm keeps those as autocomplete suggestions while
 * still accepting an unknown sixth value.
 *
 * Why not a hard union: the response is cast, not validated, so a closed union
 * would be a claim the code cannot back up. This shape is honest about that.
 */
export type Gender = 'male' | 'female' | 'hermaphrodite' | 'n/a' | 'none' | (string & {});

/**
 * A person from /api/people.
 *
 * Every field is a string or an array of strings — SWAPI sends no numbers and
 * no nulls. The comments record what is actually in the data, because the
 * types alone cannot warn you about "unknown" hiding in a numeric field.
 */
export interface Character {
  /**
   * Stable identity. Beware: swapi.dev writes ".../people/1/" with a trailing
   * slash and swapi.info writes ".../people/1" without, so ids from the two
   * hosts are NOT interchangeable.
   */
  url: PersonUrl
  name: string
  /** Centimetres, as a string. Can be the literal "unknown". */
  height: string
  /** Kilograms, as a string. Can be "unknown", and uses comma thousands ("1,358"). */
  mass: string
  hair_color: string
  /** Sometimes a comma-separated list, e.g. "green-tan, brown". */
  skin_color: string
  eye_color: string
  /** In-universe encoding such as "19BBY", or "unknown". Not a date. */
  birth_year: string
  gender: Gender
  homeworld: PlanetUrl
  /** Never empty in the current data. */
  films: FilmUrl[]
  /** Empty for 32 of 82 records — empty means human, not missing data. */
  species: SpeciesUrl[]
  /** Empty for 71 of 82 records. */
  vehicles: VehicleUrl[]
  /** Empty for 63 of 82 records. */
  starships: StarshipUrl[]
  /** ISO 8601. */
  created: string
  /** ISO 8601. */
  edited: string
}
