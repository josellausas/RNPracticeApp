import { fireEvent, renderWithProviders, screen } from '../../test-utils/render';
import { CharacterCard } from '../CharCard';
import { Character } from '../../interfaces/interfaces';

const luke: Character = { name: 'Luke Skywalker', birth_year: '19BBY', gender: 'male' };

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
