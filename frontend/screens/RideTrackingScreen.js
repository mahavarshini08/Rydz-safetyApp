import React, { useEffect, useState } from 'react';
import { View, Button, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { addRideLocation, endRide } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

export default function RideTrackingScreen({ route, navigation }) {
  const { rideId } = route.params;
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let watcher;
    const socket = io('http://192.168.1.7:4000'); // replace with your server

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000 },
        async (loc) => {
          setLocation(loc.coords);
          socket.emit('location_update', { latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          await addRideLocation(rideId, loc.coords.latitude, loc.coords.longitude);
        }
      );
    };

    startTracking();

    return () => {
      if (watcher) watcher.remove();
      socket.disconnect();
    };
  }, []);

  const handleEndRide = async () => {
    await endRide(rideId);
    await AsyncStorage.removeItem('currentRide');
    Alert.alert('Ride Ended', 'Your ride has ended.');
    navigation.navigate('Home');
  };

  if (!location) return null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
      >
        <Marker coordinate={location} title="You are here" />
      </MapView>
      <Button title="End Ride" onPress={handleEndRide} />
    </View>
  );
}
