// frontend/screens/MapWebView.js
import React, { useEffect, useRef, useState } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Live Map</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height:100%; width:100%; margin:0; padding:0; }
    .deviation { color:#b91c1c; background:#fee2e2; padding:6px 10px; border-radius:8px; position:absolute; top:10px; left:10px; z-index:1000; font-family:sans-serif; display:none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="warn" class="deviation">⚠️ Route deviation detected</div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/@turf/turf@6.5.0/turf.min.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19 }).addTo(map);

    let routeCoords = [];
    let routeLine = null;
    let userMarker = null;
    let destMarker = null;
    let threshold = 75; // meters
    let lastAlertTs = 0;

    function setRoute(coords, destination) {
      routeCoords = coords || [];
      if (routeLine) routeLine.remove();
      if (routeCoords.length >= 2) {
        routeLine = L.polyline(routeCoords, { color: 'blue', weight: 5 }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
      }
      if (destination) {
        if (destMarker) destMarker.remove();
        destMarker = L.marker([destination.lat, destination.lng], { title: "Destination" }).addTo(map);
      }
    }

    function updateLocation(lat, lng) {
      if (!userMarker) {
        userMarker = L.marker([lat, lng], { title: "You" }).addTo(map);
      } else {
        userMarker.setLatLng([lat, lng]);
      }

      if (routeCoords.length >= 2) {
        const point = turf.point([lng, lat]);
        const line = turf.lineString(routeCoords.map(([la, lo]) => [lo, la]));
        const snapped = turf.nearestPointOnLine(line, point);
        const dist = turf.distance(point, snapped, { units: 'meters' });

        const warn = document.getElementById('warn');
        if (dist > threshold) {
          warn.style.display = 'block';
          const now = Date.now();
          if (now - lastAlertTs > 15000) { // throttle every 15s
            lastAlertTs = now;
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'DEVIATION_ALERT',
              distance: dist,
              lat, lng
            }));
          }
        } else {
          warn.style.display = 'none';
        }
      }
    }

    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INIT_ROUTE') {
          setRoute(data.routeCoords, data.destination);
          threshold = data.threshold || threshold;
          if (data.initialLocation) {
            updateLocation(data.initialLocation.lat, data.initialLocation.lng);
          }
        } else if (data.type === 'LOCATION_UPDATE') {
          updateLocation(data.lat, data.lng);
        }
      } catch (e) {
        console.error("Message parse error", e, event.data);
      }
    }

    document.addEventListener("message", handleMessage);
    window.addEventListener("message", handleMessage);
  </script>
</body>
</html>
`;

const DEVIATION_THRESHOLD_METERS = 75;
const UPDATE_MS = 5000;
const UPDATE_METERS = 10;

export default function MapWebView({ route, navigation }) {
  const { destinationCoords, routePolyline, rideId } = route.params || {};
  const webref = useRef(null);
  const [current, setCurrent] = useState(null);
  const [ready, setReady] = useState(false);
  const watcherRef = useRef(null);

  // 1) Ask permission + get current once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed for live tracking.');
        navigation.goBack();
        return;
      }
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!mounted) return;
      setCurrent({ lat: cur.coords.latitude, lng: cur.coords.longitude });
      setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  // 2) Start watching and pipe updates to WebView + backend
  useEffect(() => {
    if (!ready || !current || !webref.current) return;
    (async () => {
      const token = await AsyncStorage.getItem("authToken");
      watcherRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: UPDATE_MS, distanceInterval: UPDATE_METERS },
        async (loc) => {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;

          // send update to WebView
          webref.current?.postMessage(JSON.stringify({
            type: 'LOCATION_UPDATE',
            lat, lng,
            ts: loc.timestamp
          }));

          // send update to backend
          if (rideId && token) {
            try {
              await fetch(`${API_URL}/api/rides/${rideId}/update`, {
                method: "PUT",
                headers: { 
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  lat, lng, timestamp: new Date(loc.timestamp).toISOString()
                }),
              });
            } catch (err) {
              console.error("Ride update error:", err);
            }
          }
        }
      );
    })();
    return () => {
      if (watcherRef.current) {
        watcherRef.current.remove();
        watcherRef.current = null;
      }
    };
  }, [ready, current]);

  // 🔹 3) Send initial route to WebView after load
  const onLoadEnd = async () => {
    let routeCoords = [];

    if (Array.isArray(routePolyline) && routePolyline.length) {
      // Already passed polyline
      if (routePolyline[0].latitude !== undefined) {
        routeCoords = routePolyline.map(p => [p.latitude, p.longitude]);
      } else if (Array.isArray(routePolyline[0])) {
        routeCoords = routePolyline;
      }
    } else if (destinationCoords && current) {
      // 🔹 Fetch from OSRM
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${current.lng},${current.lat};${destinationCoords.longitude},${destinationCoords.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.routes && json.routes.length > 0) {
          routeCoords = json.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        } else {
          // fallback to straight line
          routeCoords = [
            [current.lat, current.lng],
            [destinationCoords.latitude, destinationCoords.longitude]
          ];
        }
      } catch (err) {
        console.error("OSRM fetch failed:", err);
        // fallback
        routeCoords = [
          [current.lat, current.lng],
          [destinationCoords.latitude, destinationCoords.longitude]
        ];
      }
    }

    setTimeout(() => {
      if (webref.current) {
        webref.current.postMessage(JSON.stringify({
          type: 'INIT_ROUTE',
          routeCoords,
          threshold: DEVIATION_THRESHOLD_METERS,
          destination: destinationCoords ? { lat: destinationCoords.latitude, lng: destinationCoords.longitude } : null,
          ...(current ? { initialLocation: current } : {})
        }));
      }
    }, 300);
  };

  // 4) Handle alerts from WebView
  const onMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'DEVIATION_ALERT') {
        Alert.alert(
          '⚠️ Route Deviation',
          `You are ~${data.distance.toFixed(0)}m off the planned route.`
        );

        try {
          const token = await AsyncStorage.getItem("authToken");
          if (!token) {
            console.warn("⚠️ No auth token found, cannot send emergency alert");
            return;
          }

          const res = await fetch(`${API_URL}/api/rides/emergency`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              rideId,
              lat: data.lat,
              lng: data.lng,
              distance: data.distance,
              timestamp: new Date().toISOString(),
            }),
          });

          const resp = await res.json();
          console.log("Emergency alert sent:", resp);
        } catch (err) {
          console.error("Error sending emergency alert:", err);
        }
      }
    } catch {}
  };

  if (!ready) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <WebView
      ref={webref}
      originWhitelist={['*']}
      source={{ html: HTML }}
      onLoadEnd={onLoadEnd}
      onMessage={onMessage}
      javaScriptEnabled
      style={{ flex: 1 }}
      allowFileAccess
      allowUniversalAccessFromFileURLs
    />
  );
}
