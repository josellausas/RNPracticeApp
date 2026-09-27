import { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { PinsProvider, usePins } from '../PinsContext';

const wrapper = ({ children }: { children: ReactNode }) => <PinsProvider>{children}</PinsProvider>;

const renderPins = () => renderHook(() => usePins(), { wrapper });

describe('usePins', () => {
  it('throws a named error when used outside a PinsProvider', () => {
    // React logs the thrown render error; silence it so the run stays readable.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => usePins())).toThrow('usePins must be used within a PinsProvider');

    consoleError.mockRestore();
  });

  it('starts with no pins', () => {
    const { result } = renderPins();

    expect(result.current.pins).toEqual([]);
  });

  it('addPin appends a pin carrying the coordinate and a default title', () => {
    const { result } = renderPins();

    act(() => result.current.addPin({ latitude: 19.43, longitude: -99.13 }));

    expect(result.current.pins).toEqual([
      { id: '1', title: 'Pin 1', latitude: 19.43, longitude: -99.13 },
    ]);
  });

  it('gives each pin a distinct id', () => {
    const { result } = renderPins();

    act(() => result.current.addPin({ latitude: 1, longitude: 1 }));
    act(() => result.current.addPin({ latitude: 2, longitude: 2 }));

    expect(result.current.pins.map((pin) => pin.id)).toEqual(['1', '2']);
  });

  it('updatePinTitle renames only the targeted pin', () => {
    const { result } = renderPins();

    act(() => result.current.addPin({ latitude: 1, longitude: 1 }));
    act(() => result.current.addPin({ latitude: 2, longitude: 2 }));
    act(() => result.current.updatePinTitle('2', 'Taqueria'));

    expect(result.current.pins.map((pin) => pin.title)).toEqual(['Pin 1', 'Taqueria']);
  });

  it('updatePinTitle is a no-op for an unknown id', () => {
    const { result } = renderPins();

    act(() => result.current.addPin({ latitude: 1, longitude: 1 }));
    act(() => result.current.updatePinTitle('nope', 'Taqueria'));

    expect(result.current.pins.map((pin) => pin.title)).toEqual(['Pin 1']);
  });

  it('getPin looks a pin up by id and returns undefined when missing', () => {
    const { result } = renderPins();

    act(() => result.current.addPin({ latitude: 1, longitude: 1 }));

    expect(result.current.getPin('1')?.title).toBe('Pin 1');
    expect(result.current.getPin('nope')).toBeUndefined();
  });

  /** Pins are replaced, never mutated — the map/spread updates must not edit in place. */
  it('does not mutate the previous pins array', () => {
    const { result } = renderPins();

    act(() => result.current.addPin({ latitude: 1, longitude: 1 }));
    const before = result.current.pins;

    act(() => result.current.updatePinTitle('1', 'Renamed'));

    expect(before[0].title).toBe('Pin 1');
    expect(result.current.pins).not.toBe(before);
  });
});
