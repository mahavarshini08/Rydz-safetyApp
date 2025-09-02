// Configuration file for the app
export const API_URL = 'http://10.135.138.202:4000'; // Your backend server IP
y
export const SOCKET_URL = 'http://10.135.138.202:4000'; // Socket server URL

// Firebase configuration
export const FIREBASE_CONFIG = {
  vapidKey: 'BK_2P-Fp9WKaFdb3YT5v7wgimtMMRiEZwrWWZ1EnVqYS-ncRX6ysyFm4gPOscraQLYVyjAzvp6V27yogA7DdnRk',
};

// App configuration
export const APP_CONFIG = {
  appName: 'Flare Safety',
  version: '1.0.0',
  emergencyTimeout: 30000, // 30 seconds
  locationUpdateInterval: 10000, // 10 seconds
};
