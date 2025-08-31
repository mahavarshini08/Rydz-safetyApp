import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

export default function MapPicker({ navigation, route }) {
  const { onLocationSelect } = route.params;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Enable location permission.');
          navigation.goBack();
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (err) {
        Alert.alert('Error', 'Could not get your location.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchLocation();
  }, []);

  const fetchAddress = async (coords) => {
    try {
      const [place] = await Location.reverseGeocodeAsync(coords);
      const formatted = [
        place.name,
        place.street,
        place.city,
        place.region,
        place.postalCode
      ].filter(Boolean).join(', ');
      setAddress(formatted || 'Unknown Location');
    } catch {
      setAddress('Unknown Location');
    }
  };

  const handleMapPress = (event) => {
    const coords = event.nativeEvent.coordinate;
    setSelectedLocation(coords);
    fetchAddress(coords);
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert('Select Location', 'Tap on the map to select a location.');
      return;
    }
    onLocationSelect(selectedLocation, address);
    navigation.goBack();
  };

  if (loading || !currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Fetching your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={currentLocation}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton
        provider={PROVIDER_GOOGLE}
      >
        {selectedLocation && <Marker coordinate={selectedLocation} title="Selected Location" />}
      </MapView>

      {selectedLocation && (
        <View style={styles.infoCard}>
          <Text style={styles.addressLabel}>Selected Address:</Text>
          <Text style={styles.addressText}>{address}</Text>
          <Button title="Confirm Location" onPress={handleConfirm} color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addressLabel: { fontWeight: 'bold', marginBottom: 5 },
  addressText: { marginBottom: 10, color: '#333' },
});
