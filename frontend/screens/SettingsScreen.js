import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db } from '../firebase';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        setName(userObj.name || '');
        setPhone(userObj.phone || '');
        setEmergencyContacts(userObj.emergencyContacts || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateProfile = async () => {
    if (!name || !auth.currentUser) {
      Alert.alert('Error', 'Name is required and you must be logged in');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      
      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (emergencyContacts) updateData.emergencyContacts = emergencyContacts;

      await updateDoc(userRef, updateData);

      // Update local storage
      const updatedUser = { ...user, ...updateData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const addEmergencyContact = async () => {
    if (!newEmergencyContact || !auth.currentUser) {
      Alert.alert('Error', 'Please enter a phone number and ensure you are logged in');
      return;
    }

    if (emergencyContacts.includes(newEmergencyContact)) {
      Alert.alert('Error', 'This contact already exists');
      return;
    }

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        emergencyContacts: arrayUnion(newEmergencyContact)
      });

      const updatedContacts = [...emergencyContacts, newEmergencyContact];
      setEmergencyContacts(updatedContacts);
      setNewEmergencyContact('');

      // Update local storage
      const updatedUser = { ...user, emergencyContacts: updatedContacts };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      Alert.alert('Success', 'Emergency contact added!');
    } catch (error) {
      console.error('Add contact error:', error);
      Alert.alert('Error', 'Failed to add emergency contact');
    }
  };

  const removeEmergencyContact = async (contact) => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        emergencyContacts: arrayRemove(contact)
      });

      const updatedContacts = emergencyContacts.filter(c => c !== contact);
      setEmergencyContacts(updatedContacts);

      // Update local storage
      const updatedUser = { ...user, emergencyContacts: updatedContacts };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      Alert.alert('Success', 'Emergency contact removed!');
    } catch (error) {
      console.error('Remove contact error:', error);
      Alert.alert('Error', 'Failed to remove emergency contact');
    }
  };

  const saveAppPreferences = async () => {
    try {
      await AsyncStorage.setItem('appPreferences', JSON.stringify({
        pushNotifications,
        locationSharing,
      }));
    } catch (error) {
      console.error('Failed to save app preferences:', error);
    }
  };

  // Load app preferences on mount
  useEffect(() => {
    loadAppPreferences();
  }, []);

  const loadAppPreferences = async () => {
    try {
      const preferences = await AsyncStorage.getItem('appPreferences');
      if (preferences) {
        const prefs = JSON.parse(preferences);
        setPushNotifications(prefs.pushNotifications ?? true);
        setLocationSharing(prefs.locationSharing ?? true);
      }
    } catch (error) {
      console.error('Failed to load app preferences:', error);
    }
  };

  // Save preferences when they change
  useEffect(() => {
    saveAppPreferences();
  }, [pushNotifications, locationSharing]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user');
              navigation.replace('Login');
            } catch (error) {
              console.error('Error logging out:', error);
            }
          }
        }
      ]
    );
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
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Profile Information</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <Button
          title={loading ? "Updating..." : "Update Profile"}
          onPress={updateProfile}
          disabled={loading}
          color="#007AFF"
        />
      </View>

      {/* Emergency Contacts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🆘 Emergency Contacts</Text>
        <Text style={styles.sectionSubtitle}>Add emergency contact numbers</Text>
        
        <View style={styles.addContactContainer}>
          <TextInput
            style={[styles.input, styles.addContactInput]}
            placeholder="Phone number"
            value={newEmergencyContact}
            onChangeText={setNewEmergencyContact}
            keyboardType="phone-pad"
            maxLength={15}
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={addEmergencyContact}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {emergencyContacts.map((contact, index) => (
          <View key={index} style={styles.contactItem}>
            <Text style={styles.contactText}>{contact}</Text>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeEmergencyContact(contact)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* App Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ App Preferences</Text>
        
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceText}>Push Notifications</Text>
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={pushNotifications ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceText}>Location Sharing</Text>
          <Switch
            value={locationSharing}
            onValueChange={setLocationSharing}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={locationSharing ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Account Actions</Text>
        
        <TouchableOpacity 
          style={styles.dangerButton}
          onPress={handleLogout}
        >
          <Text style={styles.dangerButtonText}>Logout</Text>
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
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
  addContactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addContactInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#28a745',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  contactText: {
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  preferenceText: {
    fontSize: 16,
    color: '#333',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
