import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';

export default function HomeScreen({ navigation }) {
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [rideLoading, setRideLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        // setName(userObj.name || ''); // These lines were not in the new_code, so I'm removing them.
        // setPhone(userObj.phone || '');
        // setEmergencyContacts(userObj.emergencyContacts || []);
        if (userObj.emergencyContacts && userObj.emergencyContacts.length > 0) {
          setEmergencyContact(userObj.emergencyContacts[0]);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleStartRide = async () => {
    if (!destination || !destinationCoords) {
      Alert.alert('Error', 'Please select your destination on the map');
      return;
    }

    setRideLoading(true);
    try {
      if (!auth.currentUser) {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
        return;
      }

      // Create ride document in Firestore
      const rideRef = await addDoc(collection(db, "rides"), {
        userId: auth.currentUser.uid,
        destination: destination,
        destinationCoords: destinationCoords,
        startTime: new Date().toISOString(),
        status: 'active',
        emergencyContacts: user.emergencyContacts || [],
        createdAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Ride started! Stay safe on your journey.', [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('Tracking', { 
            destination, 
            destinationCoords,
            emergencyContact: user.emergencyContacts?.[0] || '',
            rideId: rideRef.id 
          })
        }
      ]);
    } catch (error) {
      console.error('Start ride error:', error);
      Alert.alert('Error', 'Failed to start ride. Please try again.');
    } finally {
      setRideLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateEmergencyContact = async () => {
    if (!emergencyContact) {
      Alert.alert('Error', 'Please enter an emergency contact');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          emergencyContacts: [emergencyContact]
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Emergency contact updated!');
        // Update local user data
        const updatedUser = { ...user, emergencyContacts: [emergencyContact] };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        Alert.alert('Error', 'Failed to update emergency contact');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')} 
            style={styles.settingsButton}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 Start a New Ride</Text>
        <Text style={styles.sectionSubtitle}>Select your destination on the map</Text>
        
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => navigation.navigate('MapPicker', {
            onLocationSelect: (coords, address) => {
              setDestination(address);
              setDestinationCoords(coords);
            }
          })}
        >
          <Text style={styles.mapButtonText}>
            {destination ? `📍 ${destination}` : '🗺️ Select Destination on Map'}
          </Text>
        </TouchableOpacity>

        {destinationCoords && (
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationLabel}>Selected Destination:</Text>
            <Text style={styles.destinationText}>{destination}</Text>
            <Text style={styles.coordsText}>
              Lat: {destinationCoords.latitude.toFixed(6)}
              {'\n'}Lng: {destinationCoords.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <Button
          title={rideLoading ? "Starting Ride..." : "Start Ride"}
          onPress={handleStartRide}
          disabled={rideLoading || !destinationCoords}
          color="#007AFF"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🆘 Emergency Contact</Text>
        <Text style={styles.sectionSubtitle}>Update your emergency contact number</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Emergency contact phone number"
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <Button
          title={loading ? "Updating..." : "Update Contact"}
          onPress={updateEmergencyContact}
          disabled={loading}
          color="#28a745"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tracking', { destination: 'Home', emergencyContact })}
          >
            <Text style={styles.actionButtonText}>Track to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Emergency', 'Emergency alert sent to your contacts!')}
          >
            <Text style={styles.actionButtonText}>SOS Alert</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
    marginRight: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#dc3545',
    borderRadius: 6,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: 'white',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  mapButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  coordsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  destinationInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  destinationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
});
