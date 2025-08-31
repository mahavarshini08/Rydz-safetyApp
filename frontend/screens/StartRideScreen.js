import React, { useEffect, useState } from 'react';
import { View, Button, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { startRide } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';

export default function StartRideScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [rideId, setRideId] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable location permission.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
    })();
  }, []);

  const handleStartRide = async () => {
    setLoading(true);
    try {
      const res = await startRide({ latitude: location.latitude, longitude: location.longitude });
      if (res.ride) {
        setRideId(res.ride.id);
        await AsyncStorage.setItem('currentRide', res.ride.id);
        Alert.alert('Ride Started', 'You can now share your location.');
        navigation.navigate('RideTracking', { rideId: res.ride.id });
      } else {
        Alert.alert('Error', res.error || 'Failed to start ride');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!location) {
    return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={location} title="You are here" />
      </MapView>
      <Button title={loading ? "Starting..." : "Start Ride"} onPress={handleStartRide} />
    </View>
  );
}
