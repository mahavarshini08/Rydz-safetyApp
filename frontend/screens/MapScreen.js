// frontend/screens/MapScreen.js
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Text } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { auth } from "../firebase";
import io from "socket.io-client";
import { apiRequest } from "../utils/api";

export default function MapScreen({ route }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routePoints, setRoutePoints] = useState([]); // actual traveled path
  const [osrmRoute, setOsrmRoute] = useState([]); // fetched OSRM route
  const [destination, setDestination] = useState(null);
  const watchRef = useRef(null);
  const mapRef = useRef(null);
  const socketRef = useRef(null);

  const rideId = route?.params?.rideId;
  const routeDestination = route?.params?.destination; // ✅ Pass destination from HomeScreen

  // ✅ Setup socket with error handling
  useEffect(() => {
    try {
      socketRef.current = io("http://10.135.138.202:4000", {
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 3
      });
      
      socketRef.current.on("connect", () =>
        console.log("✅ Socket connected:", socketRef.current.id)
      );
      
      socketRef.current.on("connect_error", (error) => {
        console.log("⚠️ Socket connection failed:", error.message);
      });

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
      };
    } catch (error) {
      console.log("⚠️ Socket setup failed:", error.message);
    }
  }, []);

  // ✅ Enhanced OSRM route fetching with multiple fallbacks
  const fetchRouteFromOSRM = async (start, end) => {
    try {
      // Primary OSRM service
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      console.log("🔍 Fetching route from OSRM:", url);
      
      const res = await fetch(url, { timeout: 10000 });
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
        console.log("✅ OSRM route fetched successfully:", coords.length, "points");
        setOsrmRoute(coords);
        return true;
      }
    } catch (err) {
      console.error("❌ Primary OSRM fetch error:", err);
    }

    // Fallback 1: Try alternative OSRM endpoint
    try {
      const fallbackUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      console.log("🔄 Trying fallback OSRM service:", fallbackUrl);
      
      const res = await fetch(fallbackUrl, { timeout: 10000 });
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
        console.log("✅ Fallback OSRM route fetched:", coords.length, "points");
        setOsrmRoute(coords);
        return true;
      }
    } catch (err) {
      console.error("❌ Fallback OSRM fetch error:", err);
    }

    // Fallback 2: Create a simple straight-line route
    console.log("🔄 Creating fallback straight-line route");
    const fallbackRoute = [
      { latitude: start.lat, longitude: start.lng },
      { latitude: end.lat, longitude: end.lng }
    ];
    setOsrmRoute(fallbackRoute);
    return true;
  };

  // ✅ Start location tracking
  useEffect(() => {
    let subscription;
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Enable location access to track your ride.");
          setLoading(false);
          return;
        }

        const initialLoc = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: initialLoc.coords.latitude,
          longitude: initialLoc.coords.longitude,
        };

        setLocation(coords);
        setRoutePoints([coords]);
        setLoading(false);

        // ✅ Set destination from route params or use a default
        if (routeDestination) {
          setDestination(routeDestination);
        } else {
          // Create a default destination 1km away for demo purposes
          const defaultDest = {
            latitude: coords.latitude + 0.01, // ~1km north
            longitude: coords.longitude + 0.01, // ~1km east
          };
          setDestination(defaultDest);
        }

        // ✅ Fetch OSRM route once we have both start + destination
        const dest = routeDestination || {
          latitude: coords.latitude + 0.01,
          longitude: coords.longitude + 0.01,
        };
        
        await fetchRouteFromOSRM(
          { lat: coords.latitude, lng: coords.longitude },
          { lat: dest.latitude, lng: dest.longitude }
        );

        // ✅ Start watching location
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          async (locUpdate) => {
            const coords = {
              latitude: locUpdate.coords.latitude,
              longitude: locUpdate.coords.longitude,
            };
            setLocation(coords);
            setRoutePoints((prev) => [...prev, coords]);

            // ✅ Animate map
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                ...coords,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }

            // ✅ Try to send to backend (but don't fail if it's down)
            if (rideId && auth.currentUser) {
              try {
                await apiRequest(`/rides/${rideId}/update`, "PUT", {
                  lat: coords.latitude,
                  lng: coords.longitude,
                  timestamp: Date.now(),
                });
              } catch (err) {
                console.error("⚠️ Backend ride update error (continuing):", err);
              }
            }

            // ✅ Try to send via socket (but don't fail if it's down)
            if (socketRef.current?.connected && auth.currentUser) {
              try {
                socketRef.current.emit("location_update", {
                  rideId,
                  riderId: auth.currentUser.uid,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  timestamp: Date.now(),
                });
              } catch (err) {
                console.error("⚠️ Socket emit error (continuing):", err);
              }
            }

            // ✅ Check deviation (simple check: distance from any OSRM point >100m)
            if (osrmRoute.length > 0) {
              const offRoute = osrmRoute.every((pt) => {
                const dx = pt.latitude - coords.latitude;
                const dy = pt.longitude - coords.longitude;
                const dist = Math.sqrt(dx * dx + dy * dy) * 111000; // rough meters
                return dist > 100;
              });

              if (offRoute) {
                try {
                  await apiRequest(`/rides/${rideId}/alert`, "POST", {
                    lat: coords.latitude,
                    lng: coords.longitude,
                  });
                  Alert.alert("⚠️ Alert", "You deviated from the route! Emergency contact notified.");
                } catch (err) {
                  console.error("⚠️ Deviation alert error (continuing):", err);
                }
              }
            }
          }
        );
        watchRef.current = subscription;
      } catch (err) {
        console.error("❌ Location tracking error:", err);
        Alert.alert("Error", "Unable to track location.");
        setLoading(false);
      }
    };

    startTracking();

    return () => {
      try {
        if (watchRef.current) watchRef.current.remove();
      } catch (e) {
        console.log("Cleanup error:", e);
      }
    };
  }, []);

  if (loading || !location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Initializing ride tracking...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        followsUserLocation
      >
        {/* ✅ OSRM Route - Always show this */}
        {osrmRoute.length > 0 && (
          <Polyline 
            coordinates={osrmRoute} 
            strokeColor="green" 
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* ✅ Actual path traveled */}
        {routePoints.length > 0 && (
          <Polyline coordinates={routePoints} strokeColor="#007AFF" strokeWidth={3} />
        )}

        {/* ✅ Current location marker */}
        {location && (
          <Marker 
            coordinate={location} 
            title="You are here" 
            pinColor="blue"
            description="Current location"
          />
        )}
        
        {/* ✅ Destination marker */}
        {destination && (
          <Marker 
            coordinate={destination} 
            title="Destination" 
            pinColor="red"
            description="Your destination"
          />
        )}
      </MapView>
      
      {/* ✅ Route info overlay */}
      {osrmRoute.length > 0 && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeInfoText}>
            🗺️ Route: {osrmRoute.length} waypoints
          </Text>
          <Text style={styles.routeInfoText}>
            📍 Destination: {destination ? `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}` : 'Not set'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  routeInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
});
