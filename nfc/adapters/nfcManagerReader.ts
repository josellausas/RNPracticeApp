import { Platform } from 'react-native';
import NfcManager, { Ndef, NfcError, NfcTech } from 'react-native-nfc-manager';
import {
  NfcReader,
  NfcRequestOptions,
  NfcScan,
  NfcTag,
  NfcUnavailableReason,
  NfcWrite,
} from '../types';

/**
 * The real adapter, over react-native-nfc-manager.
 *
 * Its whole job is translation: nfc-manager's sessions, techs and error strings
 * in, the port's four/six-member unions out. Nothing from this file's imports
 * may escape through the returned NfcReader.
 *
 * It is NOT responsible for never-hanging or for session serialization — wrap
 * it in `guardReader` for that. Keeping those concerns out of here is what lets
 * the guard protect a future Swift adapter too.
 */

/** App-authored copy. Library strings are logged, never rendered. */
const MESSAGES = {
  connectionLost: 'Lost contact with the tag. Hold it steady and try again.',
  writeFailed: 'The tag could not be written.',
  readFailed: 'The tag could not be read.',
  sessionEnded: 'The NFC session ended before it finished.',
  unknown: 'Something went wrong talking to the tag.',
} as const;

/**
 * `NfcManager.start()` once per app, not per request — repeat calls risk
 * duplicate native event listeners. Memoized as a promise so concurrent first
 * callers share it, and reset on failure so a later attempt can retry.
 */
let started: Promise<boolean> | null = null;
const ensureStarted = (): Promise<boolean> => {
  if (started === null) {
    started = NfcManager.start()
      .then(() => true)
      .catch(() => {
        started = null;
        return false;
      });
  }
  return started;
};

/** iOS reports NDEF payloads as byte arrays; this is the only decode path used. */
const decodeUriPayload = (ndefMessage: unknown): string | null => {
  if (!Array.isArray(ndefMessage) || ndefMessage.length === 0) return null;

  // Pick the URI record rather than records[0]: other writers prepend Android
  // Application Records, and Ndef.text.decodePayload on URI bytes returns
  // garbage (it reads the 0x04 prefix byte as a language-code length).
  const record =
    ndefMessage.find((candidate) =>
      Ndef.isType(candidate, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)
    ) ?? null;
  if (!record) return null;

  try {
    const decoded = Ndef.uri.decodePayload(record.payload);
    // Empty must be null, not '': NfcReadScreen checks `=== null` to tell a
    // blank tag apart from one holding an id we cannot resolve.
    //
    // No trimming, no new URL().href, no case folding. CharactersContext
    // matches with `c.url === id`, and swapi.info URLs have no trailing slash
    // while swapi.dev's do — any normalization turns "Found" into "Unknown tag".
    return decoded ? decoded : null;
  } catch {
    return null;
  }
};

const toTag = (raw: unknown, payload: string | null): NfcTag => {
  const id = (raw as { id?: string } | null)?.id;
  return { id: typeof id === 'string' ? id.toLowerCase() : '', payload };
};

/**
 * Map a thrown value onto the port's vocabulary.
 *
 * Three layers, because nfc-manager only classifies errors on iOS:
 * `buildNfcExceptionIOS` produces the typed classes below, while
 * `buildNfcExceptionAndroid` maps only the literal string 'cancelled' and lets
 * everything else through as a bare NfcErrorBase carrying a free-form message.
 */
type Classified =
  | { kind: 'cancelled' }
  | { kind: 'unavailable'; reason: NfcUnavailableReason }
  | { kind: 'read-only' }
  | { kind: 'too-large' }
  | { kind: 'error'; message: string };

const classify = (error: unknown): Classified => {
  // Layer 1 — iOS typed classes.
  if (error instanceof NfcError.UserCancel) return { kind: 'cancelled' };
  // A session that times out or is invalidated by backgrounding is the user
  // walking away, not a fault worth an error screen.
  if (error instanceof NfcError.Timeout) return { kind: 'cancelled' };
  if (error instanceof NfcError.SessionInvalidated) return { kind: 'cancelled' };
  if (error instanceof NfcError.RadioDisabled) {
    return { kind: 'unavailable', reason: 'disabled' };
  }
  if (error instanceof NfcError.SecurityViolation) {
    // Also what a free-account provisioning profile produces at runtime.
    return { kind: 'unavailable', reason: 'no-permission' };
  }
  if (error instanceof NfcError.UnsupportedFeature) {
    return { kind: 'unavailable', reason: 'no-hardware' };
  }
  if (error instanceof NfcError.TagNotWritable) return { kind: 'read-only' };
  if (error instanceof NfcError.TagSizeTooSmall) return { kind: 'too-large' };
  if (error instanceof NfcError.TagConnectionLost) {
    return { kind: 'error', message: MESSAGES.connectionLost };
  }

  // Layer 2 — Android, where the above never match. PROVISIONAL: these patterns
  // are inferred, not captured from a device. Verify against real errors before
  // trusting them.
  const raw = typeof error === 'string' ? error : ((error as Error)?.message ?? '');
  const lowered = raw.toLowerCase();
  if (Platform.OS === 'android') {
    if (lowered.includes('cancel')) return { kind: 'cancelled' };
    if (lowered.includes('read-only') || lowered.includes('read only')) {
      return { kind: 'read-only' };
    }
    if (lowered.includes('not enough space') || lowered.includes('too small')) {
      return { kind: 'too-large' };
    }
    if (lowered.includes('tag was lost') || lowered.includes('connection lost')) {
      return { kind: 'error', message: MESSAGES.connectionLost };
    }
  }

  // Layer 3 — default. The raw text is logged, never shown.
  if (raw) console.warn('[nfc] unmapped error:', raw);
  return { kind: 'error', message: MESSAGES.unknown };
};

const asScan = (error: unknown): NfcScan => {
  const classified = classify(error);
  switch (classified.kind) {
    case 'cancelled':
      return { status: 'cancelled' };
    case 'unavailable':
      return { status: 'unavailable', reason: classified.reason };
    case 'error':
      return { status: 'error', message: classified.message };
    // A tag that cannot be written or is too small is still perfectly readable;
    // neither is a read failure.
    default:
      return { status: 'error', message: MESSAGES.readFailed };
  }
};

const asWrite = (error: unknown, capacityBytes: number): NfcWrite => {
  const classified = classify(error);
  switch (classified.kind) {
    case 'cancelled':
      return { status: 'cancelled' };
    case 'unavailable':
      return { status: 'unavailable', reason: classified.reason };
    case 'read-only':
      return { status: 'read-only' };
    case 'too-large':
      return { status: 'too-large', capacityBytes };
    case 'error':
      return { status: 'error', message: classified.message };
  }
};

/** Best-effort teardown. `throwOnError: false` makes this safe in a finally. */
const closeSession = async () => {
  try {
    await NfcManager.cancelTechnologyRequest({ throwOnError: false });
  } catch {
    // Already closed. Nothing useful to do.
  }
};

export const createNfcManagerReader = (): NfcReader => {
  const isAvailable = async (): Promise<boolean> => {
    try {
      if (!(await ensureStarted())) return false;
      if (!(await NfcManager.isSupported())) return false;
      // isEnabled() is an Android concept — iOS has no radio-off state and
      // simply mirrors isSupported(), so treating it as a signal there would
      // mislabel every iPhone.
      if (Platform.OS === 'android') return await NfcManager.isEnabled();
      return true;
    } catch {
      return false;
    }
  };

  const open = async (options?: NfcRequestOptions) => {
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: options?.prompt,
    });
  };

  return {
    isAvailable,

    async scan(options) {
      if (options?.signal?.aborted) return { status: 'cancelled' };
      if (!(await isAvailable())) {
        return { status: 'unavailable', reason: 'no-hardware' };
      }
      if (options?.signal?.aborted) return { status: 'cancelled' };

      try {
        await open(options);
        if (options?.signal?.aborted) return { status: 'cancelled' };

        const raw = await NfcManager.getTag();
        // A tag with no NDEF data is a BLANK tag, not a failure — the read
        // screen has a dedicated state for it.
        const payload = decodeUriPayload((raw as { ndefMessage?: unknown } | null)?.ndefMessage);
        return { status: 'tag', tag: toTag(raw, payload) };
      } catch (error) {
        return asScan(error);
      } finally {
        void closeSession();
      }
    },

    async write(payload, options) {
      if (options?.signal?.aborted) return { status: 'cancelled' };
      if (!(await isAvailable())) {
        return { status: 'unavailable', reason: 'no-hardware' };
      }
      if (options?.signal?.aborted) return { status: 'cancelled' };

      const bytes = Ndef.encodeMessage([Ndef.uriRecord(payload)]);
      // Only meaningful if getNdefStatus reports one; otherwise the post-write
      // failure is what tells us the real number.
      let capacityBytes = bytes.length;

      try {
        await open(options);
        if (options?.signal?.aborted) return { status: 'cancelled' };

        // Advisory only. It rejects on unformatted tags and can go stale if the
        // tag is swapped, so failure means "unknown, proceed" — the write's own
        // error remains the source of truth for read-only and too-large.
        try {
          const status = await NfcManager.ndefHandler.getNdefStatus();
          if (status?.capacity) capacityBytes = status.capacity;
          if (status?.status === 3 /* NdefStatus.ReadOnly */) {
            return { status: 'read-only' };
          }
          if (status?.capacity && bytes.length > status.capacity) {
            return { status: 'too-large', capacityBytes: status.capacity };
          }
        } catch {
          // Unformatted or non-NDEF tag. Let the write decide.
        }

        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        if (options?.signal?.aborted) return { status: 'cancelled' };

        const raw = await NfcManager.getTag();
        return { status: 'written', tag: toTag(raw, payload) };
      } catch (error) {
        return asWrite(error, capacityBytes);
      } finally {
        void closeSession();
      }
    },
  };
};
