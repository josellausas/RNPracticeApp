import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';
import { useNfcControl } from './NfcContext';
import { FAKE_TAG } from './adapters/fakeNfcReader';

/**
 * Simulator-only controls for driving the fake reader by hand.
 *
 * Renders nothing unless a fake is injected, so it costs one null check in
 * production rather than needing to be stripped out. Every button maps to one
 * member of the NfcScan / NfcWrite unions — if a new case is added to the port
 * and no button exists for it, that case is unreachable in manual testing,
 * which is a useful thing to notice.
 */
export const DevNfcPanel = () => {
  const control = useNfcControl();

  // useSyncExternalStore is the right primitive for "subscribe to a mutable
  // thing outside React": it re-renders on notify() without an effect+state
  // dance, and cannot tear during concurrent rendering.
  const pending = useSyncExternalStore(
    (onChange) => control?.subscribe(onChange) ?? (() => {}),
    () => control?.pending ?? null,
    () => null
  );

  if (!control) return null;

  return (
    <View style={styles.panel}>
      <Text variant="labelSmall" style={styles.label}>
        SIMULATED NFC · {pending ? `waiting for ${pending.kind}` : 'idle'}
      </Text>
      <Divider style={styles.divider} />

      {pending?.kind === 'write' && (
        <>
          <Text variant="bodySmall" style={styles.payload} numberOfLines={1}>
            payload: {pending.payload}
          </Text>
          <View style={styles.row}>
            <Button compact mode="contained" onPress={() =>
              control.resolveWrite({ status: 'written', tag: { ...FAKE_TAG, payload: pending.payload } })}>
              Tag written
            </Button>
            <Button compact mode="outlined" onPress={() => control.resolveWrite({ status: 'read-only' })}>
              Read-only
            </Button>
          </View>
          <View style={styles.row}>
            <Button compact mode="outlined" onPress={() =>
              control.resolveWrite({ status: 'too-large', capacityBytes: 504 })}>
              Too large
            </Button>
            <Button compact mode="outlined" onPress={() => control.resolveWrite({ status: 'cancelled' })}>
              Cancel
            </Button>
            <Button compact mode="outlined" onPress={() =>
              control.resolveWrite({ status: 'error', message: 'Tag connection lost' })}>
              Error
            </Button>
          </View>
        </>
      )}

      {pending?.kind === 'scan' && (
        <View style={styles.row}>
          {/* One button per payload worth scanning. `written` grows as you
              register tags, so register-then-read works in a single session. */}
          {control.sampleTagPayload && (
            <Button compact mode="contained" onPress={() =>
              control.resolveScan({
                status: 'tag',
                tag: { ...FAKE_TAG, payload: control.sampleTagPayload ?? null },
              })}>
              Tag: sample
            </Button>
          )}
          {control.written.length > 0 && (
            <Button compact mode="contained" onPress={() =>
              control.resolveScan({
                status: 'tag',
                tag: { ...FAKE_TAG, payload: control.written[control.written.length - 1] },
              })}>
              Tag: last written
            </Button>
          )}
          <Button compact mode="outlined" onPress={() =>
            control.resolveScan({ status: 'tag', tag: FAKE_TAG })}>
            Tag: blank
          </Button>
          <Button compact mode="outlined" onPress={() => control.resolveScan({ status: 'cancelled' })}>
            Cancel
          </Button>
          <Button compact mode="outlined" onPress={() =>
            control.resolveScan({ status: 'error', message: 'Tag connection lost' })}>
            Error
          </Button>
        </View>
      )}

      {!pending && (
        <View style={styles.row}>
          <Button compact mode="outlined" onPress={() => control.setAvailable(false)}>
            Radio off
          </Button>
          <Button compact mode="outlined" onPress={() => control.setAvailable(true)}>
            Radio on
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
    backgroundColor: '#FFF9E6',
    padding: 12,
    gap: 8,
  },
  label: {
    letterSpacing: 1,
    opacity: 0.6,
  },
  divider: {
    marginBottom: 4,
  },
  payload: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
