import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from '../firebase';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Name, email and password are required');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: name });

      // Save user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        phone: '', // You can add phone field later
        emergencyContacts: emergencyContact ? [emergencyContact] : [],
        createdAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Registration failed';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already exists. Please use a different email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
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
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join Rydz Safety for secure rides</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Full Name" 
        onChangeText={setName} 
        value={name}
        autoCapitalize="words"
      />
      
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
        placeholder="Password (min 6 characters)" 
        onChangeText={setPassword} 
        value={password}
        secureTextEntry
        autoCapitalize="none"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Emergency Contact (optional)" 
        onChangeText={setEmergencyContact} 
        value={emergencyContact}
        keyboardType="phone-pad"
        maxLength={15}
      />
      
      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Button 
            title="Create Account" 
            onPress={handleSignup}
            color="#007AFF"
          />
        )}
      </View>
      
      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Already have an account? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    flex: 1, 
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
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
    marginBottom: 15, 
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
    color: '#007AFF', 
    textAlign: 'center',
    fontSize: 16
  }
});
