import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

export async function sendEmergencySMS(contacts, message) {
  try {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      console.log("📱 Mock SMS:", { to: contacts, body: message });
      Alert.alert("Mock SMS sent ✅ (emulator)");
      return { result: "mocked" };
    }

    return await SMS.sendSMSAsync(contacts, message);
  } catch (err) {
    console.error("SMS error:", err);
    Alert.alert("Failed to send SMS");
  }
}
