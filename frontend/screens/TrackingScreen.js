// frontend/screens/TrackingScreen.js
import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function TrackingScreen() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [dest, setDest] = useState({ latitude: 0, longitude: 0 });
  const socketRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable location permission to use tracking");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      if (!mounted) return;
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // connect socket
    socketRef.current = io(API_URL, { transports: ["websocket"] });
    socketRef.current.on("connect", () => console.log("socket connected", socketRef.current.id));
    socketRef.current.on("disconnect", () => console.log("socket disconnected"));

    const watchIdPromise = (async () => {
      const token = await AsyncStorage.getItem("token"); // optionally send auth
      if (token && socketRef.current) {
        socketRef.current.emit("authenticate", { token });
      }

      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          const payload = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
          };
          setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("location_update", payload);
          }
        }
      );

      return watcher;
    })();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      watchIdPromise.then((watcher) => watcher && watcher.remove && watcher.remove());
    };
  }, []);

  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker coordinate={currentLocation} title="You" />
      <Marker coordinate={dest} title="Destination" pinColor="blue" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
