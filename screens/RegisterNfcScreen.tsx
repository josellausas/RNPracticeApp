import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCharacter } from '../context/CharactersContext';
import { CharacterLookupFallback } from '../components/CharacterLookupFallback';
import { useNfc } from '../nfc/NfcContext';
import { DevNfcPanel } from '../nfc/DevNfcPanel';
import { NfcWrite } from '../nfc/types';

type Props = NativeStackScreenProps<RootStackParamList, 'registerNfc'>;

/** Local flow state. 'waiting' has no NfcWrite yet, so it cannot live in that union. */
type Registration = { status: 'waiting' } | { status: 'settled'; outcome: NfcWrite };

const UNAVAILABLE_COPY: Record<string, string> = {
  'no-hardware': 'This device has no NFC reader.',
  disabled: 'Turn NFC on in system settings to register a tag.',
  'no-permission': 'This app is not allowed to use NFC.',
};

export const RegisterNfcScreen = ({ route, navigation }: Props) => {
  const { characterId } = route.params;
  const lookup = useCharacter(characterId);
  const nfc = useNfc();
  const [registration, setRegistration] = useState<Registration>({ status: 'waiting' });
  const [attempt, setAttempt] = useState(0);

  const title = lookup.status === 'found' ? lookup.character.name : 'Register NFC';
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const ready = lookup.status === 'found';

  useEffect(() => {
    if (!ready) return;

    // Abort on unmount so navigating away closes the session instead of
    // leaving one open — the stuck-session failure mode this port exists to
    // avoid. Same cancellation idiom as useAsyncData.
    const controller = new AbortController();
    let cancelled = false;

    setRegistration({ status: 'waiting' });

    nfc
      .write(characterId, { prompt: 'Hold a tag near your phone', signal: controller.signal })
      .then((outcome) => {
        if (!cancelled) setRegistration({ status: 'settled', outcome });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nfc, characterId, ready, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  // popTo rather than goBack: it names where we are going, so it still lands on
  // the list if this screen ever gains a second entry point. The list instance
  // is reused, so its scroll position survives.
  const done = useCallback(() => navigation.popTo('charactersList'), [navigation]);

  if (lookup.status !== 'found') {
    return <CharacterLookupFallback lookup={lookup} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.body}>{renderBody(registration, lookup.character.name, retry, done)}</View>
      {/* Null in production — only a fake reader supplies a control surface. */}
      <DevNfcPanel />
    </View>
  );
}

const renderBody = (
  registration: Registration,
  name: string,
  retry: () => void,
  done: () => void
) => {
  if (registration.status === 'waiting') {
    return (
      <>
        <ActivityIndicator animating size="large" />
        <Text variant="headlineSmall" style={styles.heading}>Waiting for NFC…</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Hold a tag near the top of your phone to link it to {name}.
        </Text>
      </>
    );
  }

  // Exhaustive over NfcWrite: add a case to the port and this stops compiling.
  const { outcome } = registration;
  switch (outcome.status) {
    case 'written':
      return (
        <>
          <Text variant="headlineSmall" style={styles.heading}>Tag registered</Text>
          <Text variant="bodyMedium" style={styles.hint}>{name} is now linked to tag {outcome.tag.id}.</Text>
          <Button mode="contained" onPress={done} style={styles.action}>Done</Button>
        </>
      );
    case 'cancelled':
      return (
        <>
          <Text variant="headlineSmall" style={styles.heading}>Cancelled</Text>
          <Button mode="contained" onPress={retry} style={styles.action}>Try again</Button>
        </>
      );
    case 'read-only':
      return (
        <>
          <Text variant="headlineSmall" style={styles.heading}>Tag is locked</Text>
          <Text variant="bodyMedium" style={styles.hint}>This tag cannot be written to. Try a blank one.</Text>
          <Button mode="contained" onPress={retry} style={styles.action}>Try again</Button>
        </>
      );
    case 'too-large':
      return (
        <>
          <Text variant="headlineSmall" style={styles.heading}>Does not fit</Text>
          <Text variant="bodyMedium" style={styles.hint}>
            This tag holds {outcome.capacityBytes} bytes, which is not enough.
          </Text>
        </>
      );
    case 'unavailable':
      return (
        <>
          <Text variant="headlineSmall" style={styles.heading}>NFC unavailable</Text>
          <Text variant="bodyMedium" style={styles.hint}>{UNAVAILABLE_COPY[outcome.reason]}</Text>
        </>
      );
    case 'error':
      return (
        <>
          <Text variant="headlineSmall" style={styles.heading}>Something went wrong</Text>
          <Text variant="bodyMedium" style={styles.hint}>{outcome.message}</Text>
          <Button mode="contained" onPress={retry} style={styles.action}>Try again</Button>
        </>
      );
  }
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F2F7' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { marginTop: 24, textAlign: 'center' },
  hint: { marginTop: 12, textAlign: 'center', opacity: 0.7 },
  action: { marginTop: 24 },
});
