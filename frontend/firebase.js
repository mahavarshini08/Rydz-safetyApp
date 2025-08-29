// Frontend Firebase configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (you need to get this from Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyA03HJ4rEMNiODMIV53YEdrTAgV7AE9J-g",
    authDomain: "rydz-bded9.firebaseapp.com",
    projectId: "rydz-bded9",
    storageBucket: "rydz-bded9.firebasestorage.app",
    messagingSenderId: "730186593200",
    appId: "1:730186593200:web:c7b45436dfb4cc05f19c75",
    measurementId: "G-SFS2ST3EB9"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
