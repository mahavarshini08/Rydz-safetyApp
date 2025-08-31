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
  const watchRef = useRef(null);
  const mapRef = useRef(null);
  const socketRef = useRef(null);

  const rideId = route?.params?.rideId;
  const destination = route?.params?.destination; // ✅ Pass destination from HomeScreen

  // ✅ Setup socket
  useEffect(() => {
    socketRef.current = io("http://192.168.1.7:4000");
    socketRef.current.on("connect", () =>
      console.log("✅ Socket connected:", socketRef.current.id)
    );

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // ✅ Fetch OSRM route from current location → destination
  const fetchRouteFromOSRM = async (start, end) => {
    try {
      const url = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setOsrmRoute(coords);
      }
    } catch (err) {
      console.error("OSRM fetch error:", err);
    }
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

        // ✅ Fetch OSRM route once we have both start + destination
        if (destination) {
          await fetchRouteFromOSRM(
            { lat: coords.latitude, lng: coords.longitude },
            { lat: destination.latitude, lng: destination.longitude }
          );
        }

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

            // ✅ Send to backend
            if (rideId && auth.currentUser) {
              try {
                await apiRequest(`/rides/${rideId}/update`, "PUT", {
                  lat: coords.latitude,
                  lng: coords.longitude,
                  timestamp: Date.now(),
                });
              } catch (err) {
                console.error("Backend ride update error:", err);
              }
            }

            // ✅ Send via socket
            if (socketRef.current?.connected && auth.currentUser) {
              socketRef.current.emit("location_update", {
                rideId,
                riderId: auth.currentUser.uid,
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: Date.now(),
              });
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
                  console.error("Deviation alert error:", err);
                }
              }
            }
          }
        );
        watchRef.current = subscription;
      } catch (err) {
        console.error("Location tracking error:", err);
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
        {/* ✅ OSRM Route */}
        {osrmRoute.length > 0 && (
          <Polyline coordinates={osrmRoute} strokeColor="green" strokeWidth={4} />
        )}

        {/* ✅ Actual path traveled */}
        {routePoints.length > 0 && (
          <Polyline coordinates={routePoints} strokeColor="#007AFF" strokeWidth={3} />
        )}

        {location && <Marker coordinate={location} title="You are here" />}
        {destination && (
          <Marker coordinate={destination} title="Destination" pinColor="red" />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
