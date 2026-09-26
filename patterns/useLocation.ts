import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

/**
 * Foreground location with the permission lifecycle handled.
 * Verified against expo-location ~57.0.13 (SDK 57).
 *
 * The RN-specific knowledge this encodes:
 *   - Permission is a *state machine*, not a boolean. "Denied" and "not asked
 *     yet" need different UI — one offers a button, the other an explanation.
 *   - watchPositionAsync returns a Promise<LocationSubscription>. If you write
 *     the cleanup naively you unsubscribe from a promise, which does nothing,
 *     and the GPS keeps draining the battery after the screen is gone.
 *   - The subscription can resolve *after* unmount, so cleanup has to cope
 *     with a subscription that doesn't exist yet.
 */

export type LocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'error'; message: string }
  | { status: 'ready'; coords: Location.LocationObjectCoords };

type Options = {
  /** Live updates vs a single fix. Watching costs battery — default off. */
  watch?: boolean;
  accuracy?: Location.Accuracy;
  /** Only used when watching. */
  distanceIntervalMeters?: number;
};

export const useLocation = ({
  watch = false,
  accuracy = Location.Accuracy.Balanced,
  distanceIntervalMeters = 10,
}: Options = {}) => {
  const [state, setState] = useState<LocationState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'requesting' });

    const start = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (!permission.granted) {
          setState({ status: 'denied', canAskAgain: permission.canAskAgain });
          return;
        }

        if (!watch) {
          const position = await Location.getCurrentPositionAsync({ accuracy });
          if (!cancelled) setState({ status: 'ready', coords: position.coords });
          return;
        }

        const subscription = await Location.watchPositionAsync(
          { accuracy, distanceInterval: distanceIntervalMeters },
          (position) => {
            if (!cancelled) setState({ status: 'ready', coords: position.coords });
          }
        );

        // Unmounted while the subscription was still being set up.
        if (cancelled) {
          subscription.remove();
          return;
        }
        subscriptionRef.current = subscription;
      } catch (e) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not get location',
          });
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [watch, accuracy, distanceIntervalMeters, attempt]);

  /** Use after sending the user to Settings, or on a "try again" button. */
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
};
