// frontend/screens/LoginScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone) return Alert.alert("Enter phone");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
        navigation.replace("Home");
      } else {
        Alert.alert("Login failed", data.error || "Check credentials");
      }
    } catch (err) {
      Alert.alert("Network error", String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone"
        keyboardType="phone-pad"
        onChangeText={setPhone}
        value={phone}
      />
      <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} />
      <Text style={styles.link} onPress={() => navigation.navigate("Signup")}>
        Don't have an account? Sign up
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  link: { marginTop: 15, color: "blue", textAlign: "center" },
});
