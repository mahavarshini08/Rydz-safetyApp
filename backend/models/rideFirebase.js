// Firebase-based Ride model
const { db, admin } = require('../ride-tracking-server/firebase-config');

class Ride {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime;
    this.geofenceOrigin = data.geofenceOrigin;
    this.route = data.route || [];
  }

  // Create a new ride
  static async create(rideData) {
    try {
      const rideRef = await db.collection('rides').add({
        userId: rideData.userId,
        startTime: new Date(),
        endTime: null,
        geofenceOrigin: rideData.geofenceOrigin || null,
        route: []
      });
      
      return { id: rideRef.id, ...rideData, startTime: new Date() };
    } catch (error) {
      throw new Error(`Failed to create ride: ${error.message}`);
    }
  }

  // Find ride by ID
  static async findById(id) {
    try {
      const doc = await db.collection('rides').doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Failed to find ride: ${error.message}`);
    }
  }

  // Find rides by user ID
  static async findByUserId(userId) {
    try {
      const snapshot = await db.collection('rides')
        .where('userId', '==', userId)
        .orderBy('startTime', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new Error(`Failed to find rides: ${error.message}`);
    }
  }

  // Update ride
  static async update(id, updateData) {
    try {
      await db.collection('rides').doc(id).update(updateData);
      return { id, ...updateData };
    } catch (error) {
      throw new Error(`Failed to update ride: ${error.message}`);
    }
  }

  // End a ride
  static async end(id) {
    try {
      await db.collection('rides').doc(id).update({
        endTime: new Date()
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to end ride: ${error.message}`);
    }
  }

  // Add route point
  static async addRoutePoint(id, point) {
    try {
      const rideRef = db.collection('rides').doc(id);
      await rideRef.update({
        route: admin.firestore.FieldValue.arrayUnion({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: new Date()
        })
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to add route point: ${error.message}`);
    }
  }

  // Get active rides for a user
  static async getActiveRides(userId) {
    try {
      const snapshot = await db.collection('rides')
        .where('userId', '==', userId)
        .where('endTime', '==', null)
        .orderBy('startTime', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new Error(`Failed to get active rides: ${error.message}`);
    }
  }

  // Get ride statistics
  static async getRideStats(userId) {
    try {
      const snapshot = await db.collection('rides')
        .where('userId', '==', userId)
        .get();
      
      const rides = snapshot.docs.map(doc => doc.data());
      const completedRides = rides.filter(ride => ride.endTime);
      
      return {
        totalRides: rides.length,
        completedRides: completedRides.length,
        activeRides: rides.length - completedRides.length
      };
    } catch (error) {
      throw new Error(`Failed to get ride stats: ${error.message}`);
    }
  }
}

module.exports = Ride;
