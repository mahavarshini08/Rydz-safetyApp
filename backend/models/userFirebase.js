// Firebase-based User model
const { db } = require('../ride-tracking-server/firebase-config');

class User {
  constructor(data) {
    this.id = data.id;
    this.phone = data.phone;
    this.name = data.name;
    this.pushToken = data.pushToken;
    this.emergencyContacts = data.emergencyContacts || [];
    this.createdAt = data.createdAt || new Date();
  }

  // Create a new user
  static async create(userData) {
    try {
      const userRef = await db.collection('users').add({
        phone: userData.phone,
        name: userData.name,
        pushToken: userData.pushToken,
        emergencyContacts: userData.emergencyContacts || [],
        createdAt: new Date()
      });
      
      return { id: userRef.id, ...userData };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // Find user by phone
  static async findByPhone(phone) {
    try {
      const snapshot = await db.collection('users')
        .where('phone', '==', phone)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const doc = await db.collection('users').doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  // Update user
  static async update(id, updateData) {
    try {
      await db.collection('users').doc(id).update(updateData);
      return { id, ...updateData };
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Add emergency contact
  static async addEmergencyContact(id, contact) {
    try {
      const userRef = db.collection('users').doc(id);
      await userRef.update({
        emergencyContacts: admin.firestore.FieldValue.arrayUnion(contact)
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to add emergency contact: ${error.message}`);
    }
  }

  // Remove emergency contact
  static async removeEmergencyContact(id, contact) {
    try {
      const userRef = db.collection('users').doc(id);
      await userRef.update({
        emergencyContacts: admin.firestore.FieldValue.arrayRemove(contact)
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to remove emergency contact: ${error.message}`);
    }
  }
}

module.exports = User;
