// testRides.js
const fetch = require("node-fetch");

// ⚠️ Replace with your backend URL and Firebase ID token
const API_URL = "http://10.135.138.202:4000/api/rides";
const FIREBASE_ID_TOKEN = "<YOUR_FIREBASE_ID_TOKEN>";

async function runTests() {
  try {
    console.log("🚀 Starting ride flow test...");

    // 1) Create a new ride
    let res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIREBASE_ID_TOKEN}`,
      },
      body: JSON.stringify({
        pickup: "Test Pickup",
        dropoff: "Test Dropoff",
      }),
    });
    let data = await res.json();
    console.log("✅ Created ride:", data);
    const rideId = data.ride.id;

    // 2) Get rides for this user
    res = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${FIREBASE_ID_TOKEN}`,
      },
    });
    data = await res.json();
    console.log("📋 User rides:", data);

    // 3) Update ride status → "ongoing"
    res = await fetch(`${API_URL}/${rideId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIREBASE_ID_TOKEN}`,
      },
      body: JSON.stringify({ status: "ongoing" }),
    });
    data = await res.json();
    console.log("🔄 Updated status:", data);

    // 4) Add live location
    res = await fetch(`${API_URL}/${rideId}/location`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIREBASE_ID_TOKEN}`,
      },
      body: JSON.stringify({ lat: 37.7749, lng: -122.4194 }),
    });
    data = await res.json();
    console.log("📍 Added location:", data);

    // 5) Trigger emergency alert
    res = await fetch(`${API_URL}/${rideId}/emergency`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIREBASE_ID_TOKEN}`,
      },
      body: JSON.stringify({
        lat: 37.7749,
        lng: -122.4194,
        distance: 150,
      }),
    });
    data = await res.json();
    console.log("🚨 Emergency logged:", data);

    console.log("✅ Flow complete!");
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

runTests();
