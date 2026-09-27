import { fireEvent, renderWithProviders, screen } from '../../test-utils/render';
import { CharacterCard } from '../CharCard';
import {
  Character,
  FilmUrl,
  PersonUrl,
  PlanetUrl,
  StarshipUrl,
  VehicleUrl,
} from '../../interfaces/interfaces';

// Luke's real record, so the fixture cannot drift from the API's actual shape.
const luke: Character = {
  url: 'https://swapi.info/api/people/1' as PersonUrl,
  name: 'Luke Skywalker',
  height: '172',
  mass: '77',
  hair_color: 'blond',
  skin_color: 'fair',
  eye_color: 'blue',
  birth_year: '19BBY',
  gender: 'male',
  homeworld: 'https://swapi.info/api/planets/1' as PlanetUrl,
  films: ['https://swapi.info/api/films/1'] as FilmUrl[],
  species: [],
  vehicles: ['https://swapi.info/api/vehicles/14'] as VehicleUrl[],
  starships: ['https://swapi.info/api/starships/12'] as StarshipUrl[],
  created: '2014-12-09T13:50:51.644000Z',
  edited: '2014-12-20T21:17:56.891000Z',
};

const renderCard = (props: Partial<React.ComponentProps<typeof CharacterCard>> = {}) => {
  const onProfile = jest.fn();
  const onNFC = jest.fn();

  renderWithProviders(
    <CharacterCard character={luke} onProfile={onProfile} onNFC={onNFC} {...props} />
  );

  return { onProfile, onNFC };
};

describe('CharacterCard', () => {
  it('shows the character name and birth year', () => {
    renderCard();

    expect(screen.getByText('Luke Skywalker')).toBeOnTheScreen();
    expect(screen.getByText('Birth year: 19BBY')).toBeOnTheScreen();
  });

  it('calls onProfile when the Profile action is pressed', () => {
    const { onProfile, onNFC } = renderCard();

    fireEvent.press(screen.getByText('Profile'));

    expect(onProfile).toHaveBeenCalledTimes(1);
    expect(onNFC).not.toHaveBeenCalled();
  });

  it('calls onNFC when the Register NFC action is pressed', () => {
    const { onProfile, onNFC } = renderCard();

    fireEvent.press(screen.getByText('Register NFC'));

    expect(onNFC).toHaveBeenCalledTimes(1);
    expect(onProfile).not.toHaveBeenCalled();
  });
});
