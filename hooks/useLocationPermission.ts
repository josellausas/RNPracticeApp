import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type LocationPermissionStatus = 'checking' | 'granted' | 'denied';

export const useLocationPermission = (): LocationPermissionStatus => {
  const [status, setStatus] = useState<LocationPermissionStatus>('checking');

  useEffect(() => {
    let isMounted = true;

    const ensurePermission = async () => {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) {
        if (isMounted) setStatus('granted');
        return;
      }

      const requested = await Location.requestForegroundPermissionsAsync();
      if (isMounted) setStatus(requested.granted ? 'granted' : 'denied');
    };

    ensurePermission();

    return () => {
      isMounted = false;
    };
  }, []);

  return status;
}
