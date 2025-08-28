import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { API_URL } from '../config';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !phone) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }

    // Basic phone validation
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          phone, 
          emergencyContacts: emergencyContact ? [emergencyContact] : [] 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Account created successfully! Please login.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
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
        placeholder="Phone Number" 
        onChangeText={setPhone} 
        value={phone}
        keyboardType="phone-pad"
        maxLength={15}
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
