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
import io, { Socket } from "socket.io-client";
import { getDistance } from "geolib";
import { registerForPushNotificationsAsync } from "./utils/notifications";
import * as Notifications from "expo-notifications";

const BG_TASK = "RIDE_LOCATION_UPDATES";
const SOCKET_URL = "http://192.168.1.7:4000"; // Your backend
const GEOFENCE_RADIUS = 200; // meters
const MAX_ROUTE_POINTS = 100; // throttle polyline length

type Point = { latitude: number; longitude: number; timestamp?: number };

export default function LiveTrackingScreen() {
  const [tracking, setTracking] = useState(false);
  const [route, setRoute] = useState<Point[]>([]);
  const [current, setCurrent] = useState<Point | null>(null);
  const [geofenceOrigin, setGeofenceOrigin] = useState<Point | null>(null);
  const [outsideGeofence, setOutsideGeofence] = useState(false);
  const [distanceFromOrigin, setDistanceFromOrigin] = useState<number | null>(null);

  const mapRef = useRef<MapView>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket
  useEffect(() => {
  socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });

  socketRef.current.on("connect", () => console.log("Socket connected:", socketRef.current?.id));
  socketRef.current.on("disconnect", () => console.log("Socket disconnected"));

  // Cleanup function
  return () => {
    socketRef.current?.disconnect();
  };
}, []);


  // Request permissions & initial location
  useEffect(() => {
    (async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      const bg = await Location.requestBackgroundPermissionsAsync();

      if (fg.status !== "granted" || bg.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Foreground and background location are required."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const p: Point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrent(p);
      setRoute([p]);
    })();
  }, []);

  // Register push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token && socketRef.current?.connected) {
        socketRef.current.emit("register_push_token", { token });
      }
    });
  }, []);

  // Foreground location updates
  useEffect(() => {
    let sub: Location.LocationSubscription;

    (async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        async (loc) => {
          const p: Point = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
          };
          setCurrent(p);
          setRoute((r) => [...r.slice(-MAX_ROUTE_POINTS + 1), p]);

          // Send live location via socket
          socketRef.current?.connected && socketRef.current.emit("location_update", p);

          // Geofence detection
          if (geofenceOrigin) {
            const distance = getDistance(p, geofenceOrigin);
            setDistanceFromOrigin(distance);

            if (distance > GEOFENCE_RADIUS && !outsideGeofence) {
              setOutsideGeofence(true);
              console.log("Outside Safe Zone", distance);

              socketRef.current?.connected && socketRef.current.emit("geofence_breach", { location: p });

              await Notifications.scheduleNotificationAsync({
                content: { title: "🚨 Geofence Alert", body: "You exited the safe zone!", sound: true },
                trigger: null,
              });

              Alert.alert("⚠️ Alert", "You have exited the safe zone!");
            } else if (distance <= GEOFENCE_RADIUS && outsideGeofence) {
              setOutsideGeofence(false);
              console.log("Re-entered Safe Zone", distance);
            }
          }
        }
      );
    })();

    return () => sub?.remove();
  }, [geofenceOrigin, outsideGeofence]);

  // Start tracking
  const startTracking = async () => {
    if (tracking || !current) return;

    setGeofenceOrigin(current);

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

  // Stop tracking
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

  // Panic alert
  const triggerPanic = async () => {
    if (!current) return;
    socketRef.current?.connected && socketRef.current.emit("panic_alert", { location: current });
    await Notifications.scheduleNotificationAsync({
      content: { title: "⚠️ Panic Alert", body: "User triggered a panic alert!", sound: true },
      trigger: null,
    });
    Alert.alert("Panic alert sent!");
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

      {geofenceOrigin && (
        <View style={styles.statusBanner}>
          <Text style={{ fontWeight: "bold", color: outsideGeofence ? "red" : "green" }}>
            {outsideGeofence ? "🚨 Outside Safe Zone" : "✅ Inside Safe Zone"}
          </Text>
          <Text>Distance from origin: {distanceFromOrigin !== null ? `${distanceFromOrigin} m` : "…"}</Text>
        </View>
      )}

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

        <TouchableOpacity style={styles.btn} onPress={triggerPanic}>
          <Text style={styles.btnText}>Panic</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Background task
TaskManager.defineTask(BG_TASK, async ({ data, error }) => {
  try {
    if (error) return console.error("Task error:", error);

    const locationData = data as { locations?: Location.LocationObject[] };
    if (locationData?.locations?.length) {
      const loc = locationData.locations[0];
      const point: Point = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp,
      };

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
});

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
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", marginHorizontal: 5, backgroundColor: "#555" },
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