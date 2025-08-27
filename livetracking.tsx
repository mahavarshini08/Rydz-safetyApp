import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import io from "socket.io-client";

const BG_TASK = "RIDE_LOCATION_UPDATES";
const SOCKET_URL = "http://192.168.x.x:4000";  // replace with your IP


const socket = io(SOCKET_URL, { transports: ["websocket"] });

type Point = { latitude: number; longitude: number; timestamp?: number };

export default function LiveTrackingScreen() {
  const [tracking, setTracking] = useState(false);
  const [route, setRoute] = useState<Point[]>([]);
  const [current, setCurrent] = useState<Point | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    socket.on("connect", () => console.log("Socket connected", socket.id));
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== "granted") {
        Alert.alert("Permission needed", "Foreground location is required.");
        return;
      }
      await Location.requestBackgroundPermissionsAsync();

      const loc = await Location.getCurrentPositionAsync({});
      const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrent(p);
      setRoute([p]);
    })();
  }, []);

  const startTracking = async () => {
    if (tracking) return;
    await Location.startLocationUpdatesAsync(BG_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 5,
      foregroundService: {
        notificationTitle: "Ride in progress",
        notificationBody: "Live tracking is active for your safety.",
      },
      pausesUpdatesAutomatically: false,
    });
    setTracking(true);
    Alert.alert("Ride started");
  };

  const stopTracking = async () => {
    if (!tracking) return;
    const tasks = await TaskManager.getRegisteredTasksAsync();
    if (tasks.find((t) => t.taskName === BG_TASK)) {
      await Location.stopLocationUpdatesAsync(BG_TASK);
    }
    setTracking(false);
    Alert.alert("Ride ended");
  };

  return (
    <View style={styles.container}>
      {current ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: current.latitude,
            longitude: current.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline coordinates={route} strokeWidth={5} />
          <Marker coordinate={current} title="You" />
        </MapView>
      ) : (
        <View style={styles.center}><Text>Getting location…</Text></View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.btn, tracking ? styles.btnDisabled : styles.btnStart]}
          onPress={startTracking}
          disabled={tracking}
        >
          <Text style={styles.btnText}>Start Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, !tracking ? styles.btnDisabled : styles.btnStop]}
          onPress={stopTracking}
          disabled={!tracking}
        >
          <Text style={styles.btnText}>End Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

TaskManager.defineTask(
  BG_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<any>) => {
    try {
      if (error) {
        console.error("Task error:", error);
        return;
      }

      if (data?.locations?.length) {
        const loc = data.locations[0];
        const point: Point = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
        };

        // Emit location update to backend
        socket.emit("location_update", point);
        console.log("📍 Location sent:", point);
      }
    } catch (err) {
      console.error("Background task failed:", err);
    }

    // Always return a Promise
    return Promise.resolve();
  }
);


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  controls: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  btnStart: { backgroundColor: "green" },
  btnStop: { backgroundColor: "red" },
  btnDisabled: { backgroundColor: "gray" },
  btnText: { color: "#fff", fontWeight: "bold" },
});
