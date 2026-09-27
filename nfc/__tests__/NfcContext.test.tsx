import { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { NfcProvider, useNfc, useNfcControl } from '../NfcContext';
import { createFakeNfcReader } from '../adapters/fakeNfcReader';
import { NfcReader } from '../types';

describe('NfcProvider dependency injection', () => {
  it('hands back exactly the reader that was injected', () => {
    const injected: NfcReader = {
      isAvailable: jest.fn(),
      scan: jest.fn(),
      write: jest.fn(),
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NfcProvider reader={injected}>{children}</NfcProvider>
    );

    const { result } = renderHook(() => useNfc(), { wrapper });

    expect(result.current).toBe(injected);
  });

  it('throws a named error outside a provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useNfc())).toThrow('useNfc must be used within an NfcProvider');
    consoleError.mockRestore();
  });

  /** The mechanism that makes DevNfcPanel vanish for real adapters. */
  it('exposes no control surface when none is injected', () => {
    const reader: NfcReader = { isAvailable: jest.fn(), scan: jest.fn(), write: jest.fn() };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NfcProvider reader={reader}>{children}</NfcProvider>
    );

    const { result } = renderHook(() => useNfcControl(), { wrapper });

    expect(result.current).toBeNull();
  });

  it('exposes the control surface when a fake is injected', () => {
    const nfc = createFakeNfcReader();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NfcProvider reader={nfc.reader} control={nfc.control}>{children}</NfcProvider>
    );

    const { result } = renderHook(() => useNfcControl(), { wrapper });

    expect(result.current).toBe(nfc.control);
  });

  it('returns null rather than throwing outside a provider', () => {
    const { result } = renderHook(() => useNfcControl());
    expect(result.current).toBeNull();
  });
});
