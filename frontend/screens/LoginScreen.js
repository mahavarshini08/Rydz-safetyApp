// frontend/screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    setLoading(true);
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Store user data locally
        await AsyncStorage.setItem('user', JSON.stringify({
          id: user.uid,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
          emergencyContacts: userData.emergencyContacts || []
        }));

        // Navigate to home
        navigation.replace('Home');
      } else {
        Alert.alert('Error', 'User profile not found');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to your Rydz Safety account</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Email Address" 
        onChangeText={setEmail} 
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        onChangeText={setPassword} 
        value={password}
        secureTextEntry
        autoCapitalize="none"
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
      
      <Text style={styles.link} onPress={() => navigation.navigate('Signup')}>
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
