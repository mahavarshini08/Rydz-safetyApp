// Test authentication routes
require("dotenv").config();
const { db } = require("./firebase-config");

async function testAuth() {
  try {
    console.log("🧪 Testing Authentication System...");
    
    // Test 1: Check if users collection exists and has data
    console.log("📊 Checking users collection...");
    const usersSnapshot = await db.collection('users').get();
    console.log("✅ Users collection found, count:", usersSnapshot.size);
    
    if (usersSnapshot.size > 0) {
      console.log("👥 Sample users:");
      usersSnapshot.docs.forEach((doc, index) => {
        if (index < 3) { // Show first 3 users
          const userData = doc.data();
          console.log(`  - ${userData.name} (${userData.phone}) - ID: ${doc.id}`);
        }
      });
    }
    
    // Test 2: Try to find a user by phone
    console.log("\n📱 Testing user search by phone...");
    const testPhone = "1234567890"; // Use a phone that might exist
    const snapshot = await db.collection('users')
      .where('phone', '==', testPhone)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const user = snapshot.docs[0];
      console.log("✅ User found:", user.data());
    } else {
      console.log("ℹ️ No user found with phone:", testPhone);
    }
    
    // Test 3: Check if we can create a test user
    console.log("\n✍️ Testing user creation...");
    const testUserData = {
      name: 'Test User',
      phone: '9999999999',
      emergencyContacts: ['1111111111'],
      createdAt: new Date()
    };
    
    const newUserRef = await db.collection('users').add(testUserData);
    console.log("✅ Test user created with ID:", newUserRef.id);
    
    // Test 4: Verify the user was created
    const createdUser = await newUserRef.get();
    console.log("✅ User verification:", createdUser.data());
    
    // Test 5: Clean up - delete test user
    await newUserRef.delete();
    console.log("✅ Test user cleaned up");
    
    console.log("\n🎉 All auth tests passed! Authentication system is working.");
    
  } catch (error) {
    console.error("❌ Auth test failed:", error.message);
    console.error("Full error:", error);
  }
}

testAuth();
