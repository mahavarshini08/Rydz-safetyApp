import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  const [destination, setDestination] = useState('');
  const [contact, setContact] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Destination:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter destination"
        value={destination}
        onChangeText={setDestination}
      />

      <Text style={styles.label}>Emergency Contact:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter contact number"
        value={contact}
        onChangeText={setContact}
      />

      <Button
        title="Start Ride"
        onPress={() => {
          navigation.navigate('Tracking', {
            destination,
            contact
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  label: { fontWeight: 'bold', marginTop: 20, fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 5,
    borderRadius: 5,
  },
});
