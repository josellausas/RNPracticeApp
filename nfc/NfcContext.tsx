import { createContext, useContext, useMemo, ReactNode } from 'react';
import { NfcReader } from './types';
import { FakeNfcControl } from './adapters/fakeNfcReader';

/**
 * Dependency injection for the NFC port.
 *
 * The provider takes the reader as a PROP rather than constructing one. That
 * is the whole injection: App.tsx decides which adapter is real, tests hand in
 * a fake, and nothing in between has an opinion. Contrast PinsContext and
 * CharactersContext, which own their data — this one owns nothing.
 */
interface NfcContextValue {
  reader: NfcReader;
  /**
   * Present only when the injected reader is a fake. Real adapters pass
   * nothing, so the dev panel disappears on its own the moment you swap in
   * nfc-manager — no __DEV__ checks and no simulator sniffing.
   */
  control?: FakeNfcControl;
}

const NfcContext = createContext<NfcContextValue | undefined>(undefined);

export const NfcProvider = ({
  reader,
  control,
  children,
}: {
  reader: NfcReader;
  control?: FakeNfcControl;
  children: ReactNode;
}) => {
  const value = useMemo(() => ({ reader, control }), [reader, control]);
  return <NfcContext.Provider value={value}>{children}</NfcContext.Provider>;
};

/** The capability. This is all a screen should ever need. */
export const useNfc = (): NfcReader => {
  const context = useContext(NfcContext);
  if (!context) {
    throw new Error('useNfc must be used within an NfcProvider');
  }
  return context.reader;
};

/**
 * The fake's control surface, or null when a real adapter is injected.
 *
 * Only the dev panel should call this. A screen reaching for it would be
 * reaching around the port, which is the one thing this design forbids.
 */
export const useNfcControl = (): FakeNfcControl | null => {
  const context = useContext(NfcContext);
  return context?.control ?? null;
};
