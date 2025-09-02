import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.135.138.202:4000/api'; // Your backend server IP

export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

// Auth
export const signup = async (name, phone, pushToken) => {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, pushToken }),
  });
  return res.json();
};

export const login = async (phone) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  return res.json();
};

// Rides
export const startRide = async (geofenceOrigin) => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/rides/start`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ geofenceOrigin }),
  });
  return res.json();
};

export const addRideLocation = async (rideId, latitude, longitude) => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/rides/${rideId}/location`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ latitude, longitude }),
  });
  return res.json();
};

export const endRide = async (rideId) => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/rides/${rideId}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export const getActiveRides = async () => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/rides/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export const getRideStats = async () => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/rides/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};
