// frontend/screens/LoginScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    // Basic phone validation
    if (phone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      
      const data = await res.json();
      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        navigation.replace("Home");
      } else {
        Alert.alert("Login Failed", data.error || "Please check your credentials");
      }
    } catch (err) {
      Alert.alert("Network Error", "Please check your connection and try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Login to your Rydz Safety account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        onChangeText={setPhone}
        value={phone}
        maxLength={15}
      />
      
      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Button 
            title="Login" 
            onPress={handleLogin}
            color="#007AFF"
          />
        )}
      </View>
      
      <Text style={styles.link} onPress={() => navigation.navigate("Signup")}>
        Don't have an account? Sign up
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    flex: 1, 
    justifyContent: "center",
    backgroundColor: '#f5f5f5'
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    marginBottom: 10,
    textAlign: 'center',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd',
    padding: 15, 
    marginBottom: 20, 
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: 'white'
  },
  buttonContainer: {
    marginVertical: 20,
    height: 50,
    justifyContent: 'center'
  },
  link: { 
    marginTop: 20, 
    color: "#007AFF", 
    textAlign: "center",
    fontSize: 16
  },
});
