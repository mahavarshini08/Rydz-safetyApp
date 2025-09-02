// frontend/screens/HomeScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
} from "react-native";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import MapView, { Marker, Polyline } from "react-native-maps";
import SosButton from "../components/SosButton";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeScreen({ navigation }) {
  const [destination, setDestination] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [emergencyContact, setEmergencyContact] = useState("+0987654321");
  const [user, setUser] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState(null);

  // Debug navigation prop
  useEffect(() => {
    console.log("🔍 Navigation prop received:", !!navigation);
    console.log("🔍 Navigation methods:", navigation ? Object.keys(navigation) : "No navigation");
  }, [navigation]);

  // Global error handler for debugging
  useEffect(() => {
    const handleError = (error) => {
      console.error("🚨 Global error caught:", error);
      console.error("🚨 Error type:", typeof error);
      console.error("🚨 Error message:", error.message);
    };

    // Add global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', (event) => {
        console.error("🚨 Unhandled promise rejection:", event.reason);
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError);
      }
    };
  }, []);

  // listen for logged in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser.displayName || currentUser.email);
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  // track live location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is needed for SOS.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (locUpdate) => {
          setLocation({
            latitude: locUpdate.coords.latitude,
            longitude: locUpdate.coords.longitude,
          });
        }
      );

      return () => sub.remove();
    })();
  }, []);

  // fetch suggestions from Nominatim
  const fetchSuggestions = async (text) => {
    setDestination(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    
    const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      text
    )}&format=json&limit=5`;
    
    console.log("🔍 Fetching suggestions from:", apiUrl);
    
    try {
      const res = await fetch(apiUrl);
      
      console.log("📡 Response status:", res.status);
      console.log("📡 Response headers:", Object.fromEntries(res.headers.entries()));
      
      // Check if response is ok
      if (!res.ok) {
        console.error("❌ Nominatim API error:", res.status, res.statusText);
        setSuggestions([]);
        return;
      }
      
      // Get the raw text first to debug
      const rawText = await res.text();
      console.log("📄 Raw response (first 200 chars):", rawText.substring(0, 200));
      
      // Check if it looks like HTML
      if (rawText.trim().startsWith('<')) {
        console.error("❌ Response is HTML, not JSON:", rawText.substring(0, 500));
        setSuggestions([]);
        return;
      }
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        console.error("❌ Raw response:", rawText);
        setSuggestions([]);
        return;
      }
      
      if (Array.isArray(data)) {
        console.log("✅ Got suggestions:", data.length, "items");
        setSuggestions(data);
      } else {
        console.error("❌ Unexpected data format:", data);
        // Try fallback service
        await tryFallbackGeocoding(text);
      }
    } catch (err) {
      console.error("❌ Network/other error:", err);
      console.error("❌ Error type:", typeof err);
      console.error("❌ Error message:", err.message);
      console.error("❌ Error stack:", err.stack);
      // Try fallback service
      await tryFallbackGeocoding(text);
    }
  };

  // Fallback geocoding service
  const tryFallbackGeocoding = async (text) => {
    console.log("🔄 Trying fallback geocoding service...");
    try {
      // Use a different geocoding service as fallback
      const fallbackUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(text)}&format=json`;
      const res = await fetch(fallbackUrl);
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log("✅ Fallback service worked:", data.length, "items");
          // Convert fallback format to match Nominatim format
          const convertedData = data.map(item => ({
            place_id: item.place_id || Math.random().toString(),
            display_name: item.display_name || item.name || text,
            lat: item.lat || item.latitude,
            lon: item.lon || item.longitude
          }));
          setSuggestions(convertedData);
          return;
        }
      }
      
      console.log("❌ Fallback service also failed");
      setSuggestions([]);
    } catch (fallbackErr) {
      console.error("❌ Fallback service error:", fallbackErr);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (item) => {
    setDestination(item.display_name);
    setSuggestions([]);
    const coords = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };
    setSelectedCoords(coords);

    // fetch route from current location (dummy start for now)
    try {
      const start = "77.5946,12.9716"; // Bangalore coords as example
      const end = `${coords.longitude},${coords.latitude}`;
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start};${end}?geometries=geojson`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
          latitude: lat,
          longitude: lon,
        }));
        setRouteCoords(points);
      }
    } catch (err) {
      console.error("Route fetch error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      console.log("🔄 Logging out...");
      await signOut(auth);
      console.log("✅ Firebase signOut successful");
      
      // Clear any stored user data
      try {
        await AsyncStorage.removeItem("user");
        console.log("✅ AsyncStorage cleared");
      } catch (storageErr) {
        console.log("⚠️ AsyncStorage clear failed:", storageErr);
      }
      
      // Use navigate instead of replace for more reliability
      if (navigation && navigation.navigate) {
        console.log("🚀 Navigating to Login screen");
        navigation.navigate("Login");
      } else {
        console.error("❌ Navigation not available");
        // Fallback: try to reset the navigation stack
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (err) {
      console.error("❌ Logout error:", err);
      Alert.alert("Logout failed", err.message);
    }
  };

  const handleStartRide = () => {
    if (!destination || !selectedCoords)
      return Alert.alert("Enter a destination first");
    
    // Navigate to map picker for final confirmation
    navigation.navigate('MapPicker', {
      destination: destination,
      coordinates: selectedCoords,
      routeCoords: routeCoords
    });
  };

  const handleUpdateContact = () => {
    if (!emergencyContact) return Alert.alert("Enter a contact number first");
    Alert.alert("Emergency Contact Updated", emergencyContact);
  };

  const handleTrackToHome = () => {
    Alert.alert("Tracking to Home...");
  };

  const handleSOS = async () => {
    if (!location) {
      Alert.alert("Error", "Location not available yet.");
      return;
    }

    try {
      // Send SOS to backend
      const response = await fetch("http://10.135.138.202:4000/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user || "unknown",
          latitude: location.latitude,
          longitude: location.longitude,
          emergencyContact,
        }),
      });

      const data = await response.json();
      console.log("✅ Backend SOS response:", data);

      if (data.success) {
        Alert.alert(
          "🚨 SOS Alert Sent!",
          `Emergency alert sent to ${emergencyContact}\nLocation: ${location.latitude}, ${location.longitude}`
        );
      } else {
        Alert.alert("❌ Error", "Failed to send SOS alert");
      }
    } catch (err) {
      console.error("❌ SOS error:", err);
      Alert.alert("❌ Error", "Failed to send SOS alert. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Flare Safety</Text>
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>
            {user ? `Welcome, ${user}!` : "Welcome!"}
          </Text>
          <TouchableOpacity 
            style={styles.settingsBtn} 
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SOS Button */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <SosButton
          userId="12345"
          emergencyContact={emergencyContact}
          location={location}
        />
      </View>

      {/* Start Ride Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚗 Start a New Ride</Text>
        <Text style={styles.cardSubtitle}>
          Enter your destination to begin tracking
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Where are you going?"
          value={destination}
          onChangeText={fetchSuggestions}
        />
        {/* Suggestions list */}
        {suggestions.length > 0 && (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text>{item.display_name}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Map Preview */}
        {selectedCoords && (
          <View style={styles.mapPreview}>
            <MapView
              style={styles.mapPreviewMap}
              initialRegion={{
                latitude: selectedCoords.latitude,
                longitude: selectedCoords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker coordinate={selectedCoords} title="Destination" pinColor="red" />
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#007AFF"
                  strokeWidth={3}
                />
              )}
            </MapView>
            <View style={styles.mapPreviewOverlay}>
              <Text style={styles.mapPreviewText}>📍 {destination}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleStartRide}>
          <Text style={styles.primaryBtnText}>START RIDE</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Contact Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚨 Emergency Contact</Text>
        <Text style={styles.cardSubtitle}>
          Update your emergency contact number
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          keyboardType="phone-pad"
        />
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: "green" }]}
          onPress={handleUpdateContact}
        >
          <Text style={styles.primaryBtnText}>UPDATE CONTACT</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📱 Quick Actions</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={handleTrackToHome}>
            <Text style={styles.quickBtnText}>Track to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: "red" }]}
            onPress={handleSOS}
          >
            <Text style={styles.quickBtnText}>SOS Alert</Text>
          </TouchableOpacity>
        </View>
      </View>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 15 },
  header: { marginBottom: 20 },
  appTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  welcomeText: { fontSize: 18, flex: 1 },
  settingsBtn: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 6,
  },
  settingsText: { color: "white", fontSize: 16 },
  logoutBtn: {
    backgroundColor: "red",
    padding: 8,
    borderRadius: 6,
  },
  logoutText: { color: "white", fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  cardSubtitle: { color: "#666", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  primaryBtn: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "bold" },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  quickBtnText: { color: "white", fontWeight: "bold" },
  mapPreview: {
    height: 150,
    marginBottom: 15,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  mapPreviewMap: {
    flex: 1,
  },
  mapPreviewOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  mapPreviewText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
