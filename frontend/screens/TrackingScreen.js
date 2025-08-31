// frontend/screens/TrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import io from 'socket.io-client';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/** ---------- helpers ---------- */
const toLatLng = (p) => {
  if (!p) return null;
  // object { latitude, longitude }
  if (typeof p.latitude !== 'undefined' && typeof p.longitude !== 'undefined') {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
  }
  // object { lat, lng }
  if (typeof p.lat !== 'undefined' && typeof p.lng !== 'undefined') {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
  }
  // tuple [lat, lng]
  if (Array.isArray(p) && p.length >= 2) {
    const lat = Number(p[0]);
    const lng = Number(p[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
  }
  return null;
};

const isValidCoord = (c) =>
  c &&
  typeof c.latitude === 'number' &&
  typeof c.longitude === 'number' &&
  Number.isFinite(c.latitude) &&
  Number.isFinite(c.longitude);

/** -------------------------------- */

export default function TrackingScreen({ route }) {
  const { rideId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const socketRef = useRef(null);
  const mapRef = useRef(null);

  /** 1) Preload any existing route + last known position from Firestore */
  useEffect(() => {
    let mounted = true;

    const fetchRideHistory = async () => {
      try {
        if (!rideId) {
          console.warn('⚠️ No rideId provided to TrackingScreen');
          return;
        }
        const rideRef = doc(db, 'rides', rideId);
        const snap = await getDoc(rideRef);

        if (snap.exists()) {
          const d = snap.data();

          // route can be: array of {latitude, longitude} or {lat, lng} or [lat, lng]
          const rawRoute =
            d.route ||
            d.routePoints ||
            d.routePolyline ||
            d.path ||
            [];

          const normalizedRoute = (Array.isArray(rawRoute) ? rawRoute : [])
            .map(toLatLng)
            .filter(isValidCoord);

          // current position may be stored under different keys
          const current =
            toLatLng(d.currentLocation) ||
            toLatLng(d.currentCoords) ||
            toLatLng(d.current) ||
            null;

          if (mounted) {
            if (normalizedRoute.length > 0) setRoutePoints(normalizedRoute);
            if (isValidCoord(current)) setRiderLocation(current);
          }
        } else {
          console.warn('⚠️ ride not found:', rideId);
        }
      } catch (err) {
        console.error('Error fetching ride:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRideHistory();
    return () => { mounted = false; };
  }, [rideId]);

  /** 2) Socket live updates */
  useEffect(() => {
    if (!rideId) return;

    socketRef.current = io('http://192.168.1.7:4000', {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => console.log('✅ Socket connected'));
    socketRef.current.on('connect_error', (e) => console.warn('⚠️ Socket connect error:', e.message));

    socketRef.current.on('location_broadcast', (data) => {
      console.log('📡 Incoming socket data:', data);
      // Expecting: { id, latitude, longitude } (strings or numbers)
      if (data?.id !== rideId) return;

      const lat = Number(data.latitude);
      const lng = Number(data.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn('⚠️ Invalid coords received:', data);
        return;
      }

      const coords = { latitude: lat, longitude: lng };
      setRiderLocation(coords);
      setRoutePoints((prev) => [...prev, coords]);

      if (mapRef.current) {
        mapRef.current.animateCamera({ center: coords, zoom: 16 }, { duration: 600 });
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [rideId]);

  /** 3) Loading & guard: don't render MapView until we have a valid point */
  if (loading || !isValidCoord(riderLocation)) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>
          {loading ? 'Loading ride data…' : 'Waiting for valid location…'}
        </Text>
      </View>
    );
  }

  /** 4) Filter route points before giving them to Polyline */
  const safeRoute = routePoints.filter(isValidCoord);
  const initialRegion = {
    latitude: riderLocation.latitude,
    longitude: riderLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        followsUserLocation={false}
      >
        <Marker coordinate={riderLocation} title="Rider" />
        {safeRoute.length >= 2 && (
          <Polyline coordinates={safeRoute} strokeColor="#007AFF" strokeWidth={4} />
        )}
      </MapView>

      {/* Tiny debug HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudText}>
          lat: {riderLocation.latitude.toFixed(5)} | lng: {riderLocation.longitude.toFixed(5)} | points: {safeRoute.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hud: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 8,
  },
  hudText: { color: 'white', textAlign: 'center' },
});

