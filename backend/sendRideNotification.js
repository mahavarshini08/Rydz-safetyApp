// backend/sendRideNotification.js
const { admin } = require('./firebaseAdmin'); // import your Firebase admin config

async function sendRideNotification(fcmToken, rideData) {
  if (!fcmToken) {
    console.warn('⚠️ No FCM token provided');
    return;
  }

  const message = {
    token: fcmToken,
    notification: {
      title: 'Ride Started 🚗',
      body: `Your friend started a ride to ${rideData.destination}`,
    },
    data: {
      rideId: rideData.rideId,
      destination: rideData.destination,
      latitude: rideData.destinationCoords.latitude.toString(),
      longitude: rideData.destinationCoords.longitude.toString(),
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
  } catch (err) {
    console.error('❌ Error sending notification:', err);
  }
}

module.exports = sendRideNotification;
