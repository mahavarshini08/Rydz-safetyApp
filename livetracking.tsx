import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, Circle } from "react-native-maps";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import io from "socket.io-client";
import { getDistance } from "geolib";

const BG_TASK = "RIDE_LOCATION_UPDATES";
const SOCKET_URL = "http://192.168.1.7:4000"; // ⚡ your backend
const GEOFENCE_RADIUS = 200; // in meters

type Point = { latitude: number; longitude: number; timestamp?: number };

export default function LiveTrackingScreen() {
  console.log("LiveTrackingScreen loaded");

  const [tracking, setTracking] = useState(false);
  const [route, setRoute] = useState<Point[]>([]);
  const [current, setCurrent] = useState<Point | null>(null);
  const [geofenceOrigin, setGeofenceOrigin] = useState<Point | null>(null);
  const [outsideGeofence, setOutsideGeofence] = useState(false);
  const [distanceFromOrigin, setDistanceFromOrigin] = useState<number | null>(null);

  const mapRef = useRef<MapView>(null);
  const socketRef = useRef<any>(null);

  // 🔹 Setup socket connection (once)
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      console.log("🔗 Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // 🔹 Ask for permissions & set initial location
  useEffect(() => {
    (async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== "granted") {
        Alert.alert("Permission needed", "Foreground location is required.");
        return;
      }
      await Location.requestBackgroundPermissionsAsync();

      const loc = await Location.getCurrentPositionAsync({});
      const p = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrent(p);
      setRoute([p]);
    })();
  }, []);

  // 🔹 Foreground updates for map + geofence logic
  useEffect(() => {
    let sub: Location.LocationSubscription;
    (async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          const p = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
          };
          setCurrent(p);
          setRoute((r) => [...r, p]);

          // ✅ Send to backend via socket
          if (socketRef.current?.connected) {
            socketRef.current.emit("location_update", p);
          }

          // ✅ Geofence detection logic
          if (geofenceOrigin) {
            const distance = getDistance(
              { latitude: p.latitude, longitude: p.longitude },
              {
                latitude: geofenceOrigin.latitude,
                longitude: geofenceOrigin.longitude,
              }
            );

            setDistanceFromOrigin(distance);

            if (distance > GEOFENCE_RADIUS && !outsideGeofence) {
              console.log("🚨 Outside Safe Zone detected!", distance);
              Alert.alert("⚠️ Alert", "You have exited the safe zone!");
              setOutsideGeofence(true);
              // TODO: Trigger push/SMS alert here
            } else if (distance <= GEOFENCE_RADIUS && outsideGeofence) {
              console.log("✅ Re-entered Safe Zone", distance);
              setOutsideGeofence(false);
            }
          }
        }
      );
    })();

    return () => sub?.remove();
  }, [geofenceOrigin]);

  const startTracking = async () => {
    if (tracking) return;

    if (!current) {
      Alert.alert("Waiting for GPS fix", "Current location not yet available.");
      return;
    }

    setGeofenceOrigin(current); // 📍 Set geofence starting point
    console.log("Geofence origin set:", current);

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
    setGeofenceOrigin(null);
    setOutsideGeofence(false);
    setDistanceFromOrigin(null);
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
          showsUserLocation
        >
          <Polyline coordinates={route} strokeWidth={5} strokeColor="blue" />
          <Marker coordinate={current} title="You" />

          {/* 🔴 Geofence Circle */}
          {geofenceOrigin && (
            <Circle
              center={geofenceOrigin}
              radius={GEOFENCE_RADIUS}
              strokeColor="rgba(255,0,0,0.6)"
              fillColor="rgba(255,0,0,0.2)"
            />
          )}
        </MapView>
      ) : (
        <View style={styles.center}>
          <Text>Getting location…</Text>
        </View>
      )}

      {/* Geofence Status Display */}
      {geofenceOrigin && (
        <View style={styles.statusBanner}>
          <Text style={{ fontWeight: "bold", color: outsideGeofence ? "red" : "green" }}>
            {outsideGeofence ? "🚨 Outside Safe Zone" : "✅ Inside Safe Zone"}
          </Text>
          <Text>Distance from origin: {distanceFromOrigin !== null ? `${distanceFromOrigin} m` : "…"}</Text>
        </View>
      )}

      {/* Start / Stop Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.btn, tracking || !current ? styles.btnDisabled : styles.btnStart]}
          onPress={startTracking}
          disabled={tracking || !current}
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

// 🔧 Background task to send location via HTTP
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

        // ✅ Send to backend over HTTP
        await fetch(`${SOCKET_URL}/locations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(point),
        });

        console.log("📡 Background Location sent:", point);
      }
    } catch (err) {
      console.error("Background task failed:", err);
    }
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
  statusBanner: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    elevation: 3,
    alignItems: "center",
  },
});
