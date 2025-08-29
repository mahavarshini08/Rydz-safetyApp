// create-user.js
require('dotenv').config();
const User = require('./models/user');

async function createUser() {
  try {
    console.log('🧪 Creating user in new Firebase project...');
    
    const userData = {
      name: 'Test User',
      phone: '7448469129',
      emergencyContacts: ['+0987654321'],
      pushToken: 'demo-push-token'
    };
    
    const user = await User.create(userData);
    
    console.log('✅ User created successfully!');
    console.log('📱 User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Emergency Contacts: ${user.emergencyContacts.join(', ')}`);
    
    console.log('\n🔑 You can now login with:');
    console.log(`   Phone: ${user.phone}`);
    console.log('   (No password needed - just phone number)');
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  }
}

createUser();
