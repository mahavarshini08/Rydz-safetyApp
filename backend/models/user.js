// Firebase-based User model
const { db, admin } = require('../firebase-config');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.phone = data.phone || '';
    this.pushToken = data.pushToken || null;
    this.emergencyContacts = data.emergencyContacts || [];
    this.createdAt = data.createdAt || admin.firestore.Timestamp.now();
    this.updatedAt = data.updatedAt || null;
  }

  // Create a new user
  static async create(userData) {
    try {
      const now = admin.firestore.Timestamp.now();

      const userRef = await db.collection('users').add({
        name: userData.name || '',
        phone: userData.phone || '',
        pushToken: userData.pushToken || null,
        emergencyContacts: userData.emergencyContacts || [],
        createdAt: now,
        updatedAt: now
      });

      return { id: userRef.id, ...userData, createdAt: now, updatedAt: now };
    } catch (error) {
      console.error('Failed to create user:', error);
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

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Failed to find user by phone:', error);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const docRef = db.collection('users').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return null;
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('Failed to find user by ID:', error);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  // Update user
  static async update(id, updateData) {
    try {
      const now = admin.firestore.Timestamp.now();
      await db.collection('users').doc(id).update({
        ...updateData,
        updatedAt: now
      });
      return { id, ...updateData, updatedAt: now };
    } catch (error) {
      console.error('Failed to update user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Add emergency contact
  static async addEmergencyContact(id, contact) {
    try {
      const userRef = db.collection('users').doc(id);
      await userRef.update({
        emergencyContacts: admin.firestore.FieldValue.arrayUnion(contact),
        updatedAt: admin.firestore.Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Failed to add emergency contact:', error);
      throw new Error(`Failed to add emergency contact: ${error.message}`);
    }
  }

  // Remove emergency contact
  static async removeEmergencyContact(id, contact) {
    try {
      const userRef = db.collection('users').doc(id);
      await userRef.update({
        emergencyContacts: admin.firestore.FieldValue.arrayRemove(contact),
        updatedAt: admin.firestore.Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Failed to remove emergency contact:', error);
      throw new Error(`Failed to remove emergency contact: ${error.message}`);
    }
  }
}

module.exports = User;
