import { createContext, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import { Coordinate, Pin } from '../interfaces/interfaces';

interface PinsContextValue {
  pins: Pin[]
  addPin: (coordinate: Coordinate) => void
  updatePinTitle: (id: string, title: string) => void
  getPin: (id: string) => Pin | undefined
}

const PinsContext = createContext<PinsContextValue | undefined>(undefined);

export const PinsProvider = (props: { children: ReactNode }) => {
  const [pins, setPins] = useState<Pin[]>([]);
  const nextId = useRef(0);

  const addPin = (coordinate: Coordinate) => {
    nextId.current += 1;
    const id = String(nextId.current);
    setPins((current) => [...current, { id, title: `Pin ${id}`, ...coordinate }]);
  };

  const updatePinTitle = (id: string, title: string) => {
    setPins((current) => current.map((pin) => (pin.id === id ? { ...pin, title } : pin)));
  };

  const getPin = (id: string) => pins.find((pin) => pin.id === id);

  const value = useMemo(
    () => ({ pins, addPin, updatePinTitle, getPin }),
    [pins]
  );

  return <PinsContext.Provider value={value}>{props.children}</PinsContext.Provider>;
}

export const usePins = () => {
  const context = useContext(PinsContext);
  if (!context) {
    throw new Error('usePins must be used within a PinsProvider');
  }
  return context;
}
