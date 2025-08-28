import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TrackingScreen({ route }) {
  const { destination } = route.params;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission denied');
        return;
      }

      // Convert destination string to coordinates
      const geo = await Location.geocodeAsync(destination);
      if (geo.length === 0) {
        alert('Invalid destination');
        return;
      }
      const dest = geo[0];
      setDestinationCoords(dest);

      // Start location tracking
      Location.watchPositionAsync({ accuracy: 5, distanceInterval: 10 }, (loc) => {
        const { latitude, longitude } = loc.coords;
        setCurrentLocation(loc.coords);

        // Check distance to destination
        const dist = getDistanceMeters(latitude, longitude, dest.latitude, dest.longitude);
        if (dist > 100) {
          Alert.alert('⚠️ Route Deviation Detected!');
        }
      });
    })();
  }, []);

  if (!currentLocation || !destinationCoords) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      region={{
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker coordinate={currentLocation} title="You" />
      <Marker coordinate={destinationCoords} pinColor="blue" title="Destination" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
