import { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Coordinate } from '../interfaces/interfaces';
import { useLocationPermission } from '../hooks/useLocationPermission';
import { usePins } from '../context/PinsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'map'>;

export const MapScreen = ({ navigation }: Props) => {
  const permissionStatus = useLocationPermission();
  const { pins, addPin } = usePins();
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button mode="text" compact onPress={() => navigation.navigate('pinList')}>
          List
        </Button>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (permissionStatus !== 'granted') {
      return;
    }

    let isMounted = true;
    Location.getCurrentPositionAsync().then((position) => {
      if (isMounted) {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [permissionStatus]);

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Location permission is required to show the map.</Text>
      </SafeAreaView>
    );
  }

  if (!userLocation) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </SafeAreaView>
    );
  }

  const handleMapPress = (event: MapPressEvent) => {
    addPin(event.nativeEvent.coordinate);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          ...userLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={handleMapPress}
      >
        <Marker coordinate={userLocation} title="You" pinColor="blue" />
        {pins.map((pin) => (
          <Marker key={pin.id} coordinate={pin} title={pin.title} />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
  },
});
