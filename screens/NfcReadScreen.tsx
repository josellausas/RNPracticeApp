import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCharacter } from '../context/CharactersContext';
import { CharacterLookupFallback } from '../components/CharacterLookupFallback';
import { useNfc } from '../nfc/NfcContext';
import { DevNfcPanel } from '../nfc/DevNfcPanel';
import { NfcScan } from '../nfc/types';

type Props = NativeStackScreenProps<RootStackParamList, 'nfcRead'>;

type Read = { status: 'scanning' } | { status: 'settled'; outcome: NfcScan };

const UNAVAILABLE_COPY: Record<string, string> = {
  'no-hardware': 'This device has no NFC reader.',
  disabled: 'Turn NFC on in system settings to read a tag.',
  'no-permission': 'This app is not allowed to use NFC.',
};

export const NfcReadScreen = ({ navigation }: Props) => {
  const nfc = useNfc();
  const [read, setRead] = useState<Read>({ status: 'scanning' });
  const [attempt, setAttempt] = useState(0);

  // What the tag carried, which is whatever RegisterNfcScreen wrote — a
  // character url. Null until a tag with a payload is actually scanned.
  const scannedId = read.status === 'settled' && read.outcome.status === 'tag'
    ? read.outcome.tag.payload
    : null;

  // Called unconditionally with a placeholder before a scan lands. Hooks cannot
  // be conditional, and this is harmless: it also warms the character list, so
  // the lookup is usually ready the moment a tag is read.
  const lookup = useCharacter(scannedId ?? '');

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setRead({ status: 'scanning' });

    nfc
      .scan({ prompt: 'Hold a registered tag near your phone', signal: controller.signal })
      .then((outcome) => {
        if (!cancelled) setRead({ status: 'settled', outcome });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nfc, attempt]);

  const scanAgain = useCallback(() => setAttempt((current) => current + 1), []);

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        {renderBody({ read, scannedId, lookup, scanAgain, navigation })}
      </View>
      <DevNfcPanel />
    </View>
  );
}

type BodyProps = {
  read: Read;
  scannedId: string | null;
  lookup: ReturnType<typeof useCharacter>;
  scanAgain: () => void;
  navigation: Props['navigation'];
};

const renderBody = ({ read, scannedId, lookup, scanAgain, navigation }: BodyProps) => {
  if (read.status === 'scanning') {
    return (
      <>
        <ActivityIndicator animating size="large" />
        <Text variant="headlineSmall" style={styles.heading}>Waiting for NFC…</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Hold a registered tag near the top of your phone.
        </Text>
      </>
    );
  }

  const { outcome } = read;

  // First layer: did we get a tag at all? Exhaustive over NfcScan.
  switch (outcome.status) {
    case 'cancelled':
      return (
        <>
          <Text variant="headlineSmall" style={styles.heading}>Cancelled</Text>
          <Button mode="contained" onPress={scanAgain} style={styles.action}>Scan again</Button>
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
          <Button mode="contained" onPress={scanAgain} style={styles.action}>Scan again</Button>
        </>
      );
    case 'tag':
      break;
  }

  // A tag with nothing on it is a different problem from a tag we cannot match,
  // so it gets its own message rather than being folded into 'missing'.
  if (scannedId === null) {
    return (
      <>
        <Text variant="headlineSmall" style={styles.heading}>Blank tag</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Nothing is written on this tag yet. Register it from a character first.
        </Text>
        <Button mode="contained" onPress={scanAgain} style={styles.action}>Scan again</Button>
      </>
    );
  }

  // Second layer: the tag pointed somewhere — can we resolve it? 'missing' means
  // the tag holds an id this build does not know, which is worth saying plainly.
  if (lookup.status === 'missing') {
    return (
      <>
        <Text variant="headlineSmall" style={styles.heading}>Unknown tag</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          This tag is not linked to a character we know.
        </Text>
        <Button mode="contained" onPress={scanAgain} style={styles.action}>Scan again</Button>
      </>
    );
  }

  if (lookup.status !== 'found') {
    return <CharacterLookupFallback lookup={lookup} />;
  }

  return (
    <>
      <Text variant="headlineSmall" style={styles.heading}>Found: {lookup.character.name}</Text>
      <Button
        mode="contained"
        style={styles.action}
        onPress={() => navigation.navigate('characterProfile', { characterId: scannedId })}
      >
        See Profile
      </Button>
      <Button mode="text" onPress={scanAgain}>Scan another</Button>
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F2F7' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { marginTop: 24, textAlign: 'center' },
  hint: { marginTop: 12, textAlign: 'center', opacity: 0.7 },
  action: { marginTop: 24 },
});
