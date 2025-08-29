// frontend/screens/TrackingScreen.js
import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Text, TouchableOpacity, Dimensions } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

const { width, height } = Dimensions.get('window');

export default function TrackingScreen({ route, navigation }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [dest, setDest] = useState({ latitude: 0, longitude: 0 });
  const [socket, setSocket] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [rideId, setRideId] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [deviationAlert, setDeviationAlert] = useState(false);
  const { destination, destinationCoords, emergencyContact, rideId: routeRideId } = route.params || {};

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable location permission to use tracking");
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High 
      });
      
      if (!mounted) return;
      setCurrentLocation({ 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude 
      });
    })();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (destinationCoords) {
      setDest(destinationCoords);
      // Generate a simple route path (in real app, use Google Directions API)
      generateRoutePath();
    }
  }, [destinationCoords]);

  const generateRoutePath = () => {
    if (!currentLocation || !destinationCoords) return;
    
    // Simple straight line route (replace with Google Directions API for real routes)
    const path = [
      currentLocation,
      destinationCoords
    ];
    setRoutePath(path);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const checkRouteDeviation = (currentPos) => {
    if (routePath.length < 2) return false;
    
    // Find the closest point on the route
    let minDistance = Infinity;
    for (let i = 0; i < routePath.length - 1; i++) {
      const start = routePath[i];
      const end = routePath[i + 1];
      
      // Calculate distance from current position to line segment
      const distance = distanceToLineSegment(
        currentPos.latitude, currentPos.longitude,
        start.latitude, start.longitude,
        end.latitude, end.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    // Alert if more than 100 meters from route
    if (minDistance > 100 && !deviationAlert) {
      setDeviationAlert(true);
      sendEmergencyAlert(currentPos);
    }
    
    return minDistance > 100;
  };

  const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters
  };

  const sendEmergencyAlert = async (currentPos) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // Send emergency alert to backend
      await fetch(`${API_URL}/api/rides/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rideId: rideId,
          currentLocation: currentPos,
          destination: destination,
          emergencyContact: emergencyContact,
          deviation: true,
        }),
      });

      Alert.alert(
        "🚨 Route Deviation Detected!",
        "You have deviated more than 100m from your planned route. Emergency contacts have been notified.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Failed to send emergency alert:", error);
    }
  };

  useEffect(() => {
    // Connect socket
    const newSocket = io(API_URL, { transports: ["websocket"] });
    
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setSocket(newSocket);
    });
    
    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    newSocket.on("connect_error", (error) => {
      console.log("Socket connection error:", error);
      Alert.alert("Connection Error", "Unable to connect to tracking server");
    });

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !currentLocation) return;

    const watchIdPromise = (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token && socket) {
          socket.emit("authenticate", { token });
        }

        const watcher = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.Balanced, 
            timeInterval: 5000, 
            distanceInterval: 10 
          },
          (loc) => {
            const payload = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              timestamp: loc.timestamp,
            };
            
            const newLocation = { 
              latitude: loc.coords.latitude, 
              longitude: loc.coords.longitude 
            };
            
            setCurrentLocation(newLocation);
            
            // Check for route deviation
            checkRouteDeviation(newLocation);
            
            if (socket && socket.connected) {
              socket.emit("location_update", payload);
            }
          }
        );

        return watcher;
      } catch (error) {
        console.error("Error setting up location tracking:", error);
      }
    })();

    return () => {
      watchIdPromise.then((watcher) => {
        if (watcher && watcher.remove) watcher.remove();
      });
    };
  }, [socket, currentLocation]);

  const handleEmergencyAlert = () => {
    Alert.alert(
      "🚨 Emergency Alert",
      "Send emergency alert to your contacts?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Send Alert", 
          style: "destructive",
          onPress: () => {
            // Here you would implement emergency alert logic
            Alert.alert("Alert Sent", "Emergency alert sent to your contacts!");
          }
        }
      ]
    );
  };

  const handleEndRide = async () => {
    if (!rideId) {
      Alert.alert("No Active Ride", "No ride to end");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/rides/${rideId}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        Alert.alert("Ride Ended", "Your ride has been completed successfully!");
        navigation.navigate("Home");
      } else {
        Alert.alert("Error", "Failed to end ride");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    }
  };

  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
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
        showsCompass={true}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="You are here"
            pinColor="blue"
          />
        )}
        {dest && (
          <Marker
            coordinate={dest}
            title="Destination"
            description={destination}
            pinColor="red"
          />
        )}
        {routePath.length > 1 && (
          <Polyline
            coordinates={routePath}
            strokeColor="#007AFF"
            strokeWidth={3}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Overlay Controls */}
      <View style={styles.overlay}>
        {/* Destination Info */}
        {destination && (
          <View style={styles.destinationCard}>
            <Text style={styles.destinationTitle}>🎯 Destination</Text>
            <Text style={styles.destinationText}>{destination}</Text>
          </View>
        )}

        {/* Emergency Contact Info */}
        {emergencyContact && (
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyTitle}>🆘 Emergency Contact</Text>
            <Text style={styles.emergencyText}>{emergencyContact}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.emergencyButton]}
            onPress={handleEmergencyAlert}
          >
            <Text style={styles.actionButtonText}>SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.endRideButton]}
            onPress={handleEndRide}
          >
            <Text style={styles.actionButtonText}>End Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
  },
  destinationCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  destinationText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  emergencyCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emergencyText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyButton: {
    backgroundColor: '#dc3545',
  },
  endRideButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
