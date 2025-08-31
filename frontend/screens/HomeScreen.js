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

export default function HomeScreen({ navigation }) {
  const [destination, setDestination] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [emergencyContact, setEmergencyContact] = useState("+0987654321");
  const [user, setUser] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState(null);

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
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          text
        )}&format=json&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Suggestion fetch error:", err);
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
      await signOut(auth);
      navigation.replace("Login");
    } catch (err) {
      Alert.alert("Logout failed", err.message);
    }
  };

  const handleStartRide = () => {
    if (!destination || !selectedCoords)
      return Alert.alert("Enter a destination first");
    setShowMap(true);
    Alert.alert("Ride Started", `Going to: ${destination}`);
  };

  const handleUpdateContact = () => {
    if (!emergencyContact) return Alert.alert("Enter a contact number first");
    Alert.alert("Emergency Contact Updated", emergencyContact);
  };

  const handleTrackToHome = () => {
    Alert.alert("Tracking to Home...");
  };

  const handleSOS = () => {
    if (location) {
      Alert.alert(
        "🚨 SOS Alert Sent!",
        `Location shared with ${emergencyContact}\nLat: ${location.latitude}, Lng: ${location.longitude}`
      );
    } else {
      Alert.alert("🚨 SOS Alert Sent!", `Location shared with ${emergencyContact}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Rydz Safety</Text>
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>
            {user ? `Welcome, ${user}!` : "Welcome!"}
          </Text>
          <TouchableOpacity style={styles.settingsBtn}>
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

      {/* Map Section */}
      {showMap && selectedCoords && (
        <View style={{ height: 300, marginBottom: 20 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: selectedCoords.latitude,
              longitude: selectedCoords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={selectedCoords} title="Destination" />
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#007AFF"
                strokeWidth={4}
              />
            )}
          </MapView>
        </View>
      )}
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
});
