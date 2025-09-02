// frontend/screens/MapPicker.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

const { width, height } = Dimensions.get("window");

export default function MapPicker({ route, navigation }) {
  const { destination, coordinates, routeCoords } = route.params || {};
  const [searchQuery, setSearchQuery] = useState(destination || "");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(coordinates);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeToDestination, setRouteToDestination] = useState(routeCoords || []);
  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
    if (destination) {
      setSearchQuery(destination);
    }
  }, []);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is needed.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const currentLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(currentLoc);
      
      // If no destination selected, center on current location
      if (!selectedLocation) {
        setSelectedLocation(currentLoc);
      }
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const searchLocations = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    searchLocations(text);
  };

  const selectLocation = async (item) => {
    const coords = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };
    
    setSelectedLocation(coords);
    setSearchQuery(item.display_name);
    setSearchResults([]);

    // Get route from current location to selected destination
    if (currentLocation) {
      try {
        const start = `${currentLocation.longitude},${currentLocation.latitude}`;
        const end = `${coords.longitude},${coords.latitude}`;
        
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start};${end}?geometries=geojson`
        );
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const points = data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
            latitude: lat,
            longitude: lon,
          }));
          setRouteToDestination(points);
        }
      } catch (error) {
        console.error("Route error:", error);
      }
    }

    // Center map on selected location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const confirmLocation = () => {
    if (!selectedLocation) {
      Alert.alert("Error", "Please select a destination first.");
      return;
    }

    // Navigate to ride tracking with selected location
    navigation.navigate("Tracking", {
      destination: searchQuery,
      coordinates: selectedLocation,
      routeCoords: routeToDestination,
      currentLocation: currentLocation,
    });
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    
    // Reverse geocode to get address
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    )
      .then((response) => response.json())
      .then((data) => {
        setSearchQuery(data.display_name || "Selected Location");
      })
      .catch((error) => {
        console.error("Reverse geocode error:", error);
        setSearchQuery("Selected Location");
      });
  };

  const startRideOnNativeMap = () => {
    if (selectedLocation) {
      navigation.navigate("Map", {
        rideId: `ride_${Date.now()}`,
        destination: selectedLocation,
        routeCoords: routeToDestination,
        currentLocation: currentLocation,
      });
    } else {
      Alert.alert("Error", "Please select a destination first.");
    }
  };

  const startRideOnWebView = () => {
    if (selectedLocation) {
      navigation.navigate("MapWebView", {
        rideId: `ride_${Date.now()}`,
        destinationCoords: selectedLocation,
        routePolyline: routeToDestination,
        currentLocation: currentLocation,
      });
    } else {
      Alert.alert("Error", "Please select a destination first.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location..."
          value={searchQuery}
          onChangeText={handleSearch}
          onSubmitEditing={() => searchLocations(searchQuery)}
        />
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchResultItem}
                onPress={() => selectLocation(item)}
              >
                <Text style={styles.searchResultText}>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {/* Debug Fallback - Remove this after testing */}
        <View style={styles.debugFallback}>
          <Text style={styles.debugFallbackText}>🗺️ MAP CONTAINER</Text>
          <Text style={styles.debugFallbackText}>If you see this, the container is working!</Text>
          <Text style={styles.debugFallbackText}>Current Location: {currentLocation ? 'Available' : 'Not Available'}</Text>
        </View>
        
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: selectedLocation?.latitude || 37.78825,
            longitude: selectedLocation?.longitude || -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
          onMapReady={() => console.log("Map is ready!")}
          onError={(error) => console.error("Map error:", error)}
        >
          {/* Current Location Marker */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              description="You are here"
              pinColor="blue"
            />
          )}

          {/* Selected Destination Marker */}
          {selectedLocation && (
            <Marker
              coordinate={selectedLocation}
              title="Destination"
              description={searchQuery}
              pinColor="red"
            />
          )}

          {/* Route to Destination */}
          {routeToDestination.length > 0 && (
            <Polyline
              coordinates={routeToDestination}
              strokeColor="#007AFF"
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          )}
        </MapView>
        
        {/* Map Loading Indicator */}
        {!currentLocation && (
          <View style={styles.mapLoading}>
            <Text style={styles.mapLoadingText}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation}>
          <Text style={styles.confirmButtonText}>Start Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Location Info */}
      {selectedLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationInfoTitle}>Selected Location:</Text>
          <Text style={styles.locationInfoText}>{searchQuery}</Text>
          <Text style={styles.locationInfoCoords}>
            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'white',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  searchResults: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultText: {
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e0e0e0', // Light gray background to see the container
    borderWidth: 3, // Red border to make it obvious
    borderColor: 'red',
    borderStyle: 'solid',
    minHeight: 400, // Ensure minimum height
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  debugFallback: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(255,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
    alignItems: 'center',
  },
  debugFallbackText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  mapLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
  },
  mapLoadingText: {
    fontSize: 18,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  locationInfoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  locationInfoCoords: {
    fontSize: 14,
    color: '#666',
  },
});
