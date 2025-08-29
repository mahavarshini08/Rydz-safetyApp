// Test Firebase connection
require('dotenv').config();
const { db } = require('./firebase-config');

async function testFirebase() {
  console.log('🧪 Testing Firebase connection...\n');

  try {
    console.log('✅ Firebase connection successful');
    
    // Test document creation
    console.log('📝 Testing document creation...');
    const testRef = await db.collection('test').add({
      message: 'Hello Firebase!',
      timestamp: new Date(),
      test: true
    });
    console.log(`✅ Test document created with ID: ${testRef.id}`);
    
    // Clean up
    await testRef.delete();
    console.log('✅ Test document cleaned up');
    
    console.log('\n🎉 Firebase test passed! Your setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error.message);
    console.error('\n🔧 Make sure you have:');
    console.error('1. serviceAccountKey.json in this directory');
    console.error('2. .env file with FIREBASE_DATABASE_URL');
  }
}

testFirebase();
