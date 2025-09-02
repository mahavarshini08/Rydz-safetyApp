// frontend/App.js
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";

import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import HomeScreen from "./screens/HomeScreen";
import TrackingScreen from "./screens/TrackingScreen";
import SettingsScreen from "./screens/SettingsScreen";
import MapPicker from "./screens/MapPicker";
import MapScreen from "./screens/MapScreen";
import MapWebView from "./screens/MapWebView";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("user");
        if (savedUser) {
          setInitialRoute("Home"); // ✅ Auto-login
        } else {
          setInitialRoute("Login");
        }
      } catch (err) {
        console.error("AsyncStorage error:", err);
        setInitialRoute("Login");
      }
    };
    checkLogin();
  }, []);

  if (!initialRoute) {
    // Show spinner while checking AsyncStorage
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: "#007AFF" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignUpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: "Flare Safety",
            headerRight: () => null,
          }}
        />
        <Stack.Screen
          name="Tracking"
          component={TrackingScreen}
          options={{ title: "Live Tracking", headerRight: () => null }}
        />
        <Stack.Screen
          name="MapWebView"
          component={MapWebView}
          options={{ title: "Live Map", headerRight: () => null }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings", headerShown: false }}
        />
        <Stack.Screen
          name="MapPicker"
          component={MapPicker}
          options={{ title: "Select Destination", headerShown: true }}
        />
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ title: "Map", headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
