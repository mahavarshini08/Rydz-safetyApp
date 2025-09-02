import React from "react";
import { Button, Alert } from "react-native";
import * as SMS from "expo-sms";

export default function SosButton({ userId, emergencyContact, location }) {
  const sendSOS = async () => {
    if (!location) {
      Alert.alert("Error", "Location not available yet.");
      return;
    }

    try {
      // 1️⃣ Send SOS to backend (for logging + FCM push notifications)
      const response = await fetch("http://10.135.138.202:4000/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          latitude: location.latitude,
          longitude: location.longitude,
          emergencyContact,
        }),
      });

      const data = await response.json();
      console.log("✅ Backend SOS response:", data);

      // 2️⃣ Send SMS directly from device
      const message = `🚨 SOS ALERT!\nUser ${userId} triggered an SOS.\nLocation: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      const isAvailable = await SMS.isAvailableAsync();

      if (isAvailable) {
        await SMS.sendSMSAsync([emergencyContact], message);
        Alert.alert("✅ SOS Sent", "Your emergency contact has been alerted via SMS!");
      } else {
        Alert.alert("⚠️ SMS Not Available", "This device cannot send SMS.");
      }
    } catch (err) {
      console.error("❌ SOS error:", err);
      Alert.alert("❌ Error", "Failed to send SOS.");
    }
  };

  return <Button title="🚨 Send SOS" onPress={sendSOS} color="red" />;
}
