import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, TextInput, ScrollView, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function MapPicker({ route, navigation }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [routePath, setRoutePath] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);
      
      // Center map on current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use Expo Location's geocoding to search for locations
      const results = await Location.geocodeAsync(query);
      
      if (results.length > 0) {
        const formattedResults = results.map((result, index) => ({
          id: index,
          latitude: result.latitude,
          longitude: result.longitude,
          address: query,
        }));
        setSearchResults(formattedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = async (result) => {
    setSelectedLocation({ latitude: result.latitude, longitude: result.longitude });
    setSelectedAddress(result.address);
    setSearchQuery(result.address);
    setSearchResults([]);

    // Animate map to selected location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: result.latitude,
        longitude: result.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }

    // Generate route
    generateRoute(result);
  };

  const generateRoute = (destination) => {
    if (!currentLocation || !destination) return;
    
    // Simple straight line route (in production, use Google Directions API)
    const path = [
      currentLocation,
      destination
    ];
    setRoutePath(path);
  };

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    
    try {
      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let addressString = 'Selected Location';
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        addressString = [
          address.street,
          address.city,
          address.region,
          address.country,
        ]
          .filter(Boolean)
          .join(', ') || 'Selected Location';
      }
      
      setSelectedAddress(addressString);
      setSearchQuery(addressString);
      generateRoute({ latitude, longitude });
    } catch (error) {
      setSelectedAddress('Selected Location');
      setSearchQuery('Selected Location');
    }
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a destination first');
      return;
    }

    route.params?.onLocationSelect(selectedLocation, selectedAddress);
    navigation.goBack();
  };

  const clearSelection = () => {
    setSelectedLocation(null);
    setSelectedAddress('');
    setSearchQuery('');
    setRoutePath([]);
    setSearchResults([]);
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for destination..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 2) {
                searchLocation(text);
              } else {
                setSearchResults([]);
              }
            }}
            autoFocus={false}
          />
          
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearSelection}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <ScrollView style={styles.resultsScroll}>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.resultItem}
                onPress={() => selectSearchResult(result)}
              >
                <Text style={styles.resultText}>📍 {result.address}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          currentLocation
            ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }
        }
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={handleMapPress}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="You are here"
            pinColor="blue"
          />
        )}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Destination"
            description={selectedAddress}
            pinColor="red"
          />
        )}
        {routePath.length > 1 && (
          <Polyline
            coordinates={routePath}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Location Info Panel */}
      {selectedLocation && (
        <View style={styles.locationPanel}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>📍 Destination Selected</Text>
            <Text style={styles.locationAddress}>{selectedAddress}</Text>
            <Text style={styles.coordsText}>
              Lat: {selectedLocation.latitude.toFixed(6)}
              {'\n'}Lng: {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmLocation}
          >
            <Text style={styles.confirmButtonText}>Confirm Destination</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Location Button */}
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={getCurrentLocation}
      >
        <Text style={styles.currentLocationButtonText}>📍</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 20,
    color: '#333',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
  },
  searchResults: {
    position: 'absolute',
    top: 120,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
  },
  resultsScroll: {
    maxHeight: 200,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
  map: {
    flex: 1,
  },
  locationPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationInfo: {
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  locationAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentLocationButtonText: {
    fontSize: 24,
  },
});
