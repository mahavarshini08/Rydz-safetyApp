import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleLogin = async () => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (data.token) {
    await AsyncStorage.setItem('token', data.token);
    navigation.replace('Home');
  } else alert("Login failed");
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email && password) {
      navigation.replace('Home'); // Simulated login success
    } else {
      alert("Please enter both fields");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput style={styles.input} placeholder="Email" onChangeText={setEmail} value={email} />
      <TextInput style={styles.input} placeholder="Password" onChangeText={setPassword} value={password} secureTextEntry />
      <Button title="Login" onPress={handleLogin} />
      <Text style={styles.link} onPress={() => navigation.navigate('Signup')}>Don't have an account? Sign up</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  link: { marginTop: 15, color: 'blue', textAlign: 'center' }
});
