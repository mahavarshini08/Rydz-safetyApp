// Test Firebase connection and basic operations
require("dotenv").config();
const { db } = require("./firebase-config");

async function testDatabase() {
  try {
    console.log("🧪 Testing Firebase connection...");
    
    // Test 1: Check if we can access Firestore
    console.log("📊 Testing Firestore access...");
    const testCollection = db.collection('test');
    
    // Test 2: Try to write a document
    console.log("✍️ Testing write operation...");
    const testDoc = await testCollection.add({
      message: 'Test connection',
      timestamp: new Date().toISOString(),
      test: true
    });
    console.log("✅ Write successful, document ID:", testDoc.id);
    
    // Test 3: Try to read the document
    console.log("📖 Testing read operation...");
    const readDoc = await testDoc.get();
    console.log("✅ Read successful:", readDoc.data());
    
    // Test 4: Try to delete the test document
    console.log("🗑️ Testing delete operation...");
    await testDoc.delete();
    console.log("✅ Delete successful");
    
    // Test 5: Check if users collection exists
    console.log("👥 Testing users collection...");
    const usersSnapshot = await db.collection('users').get();
    console.log("✅ Users collection accessible, count:", usersSnapshot.size);
    
    console.log("\n🎉 All database tests passed! Firebase is working correctly.");
    
  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    console.error("Full error:", error);
  }
}

testDatabase();
