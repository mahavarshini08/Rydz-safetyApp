const User = require("../models/User");
const Ride = require("../models/Ride");
const { sendPushNotification } = require("../utils/push");

module.exports = (socket, io) => {

  // Register push token
  socket.on("register_push_token", async ({ userId, token }) => {
    await User.findByIdAndUpdate(userId, { pushToken: token });
  });

  // Live location updates
  socket.on("location_update", async ({ userId, latitude, longitude, timestamp }) => {
    // Save to current ride if needed
    const ride = await Ride.findOne({ userId, endTime: null });
    if (ride) {
      ride.route.push({ latitude, longitude, timestamp });
      await ride.save();
    }

    // Broadcast to emergency contacts
    const user = await User.findById(userId);
    user?.emergencyContacts?.forEach(contact => {
      if (contact.pushToken) sendPushNotification(contact.pushToken, "Ride Update", `User moved to [${latitude},${longitude}]`);
    });
  });

  // Panic alert
  socket.on("panic_alert", async ({ userId, location }) => {
    const user = await User.findById(userId);
    const message = "Panic alert triggered!";
    user?.emergencyContacts?.forEach(contact => {
      if (contact.pushToken) sendPushNotification(contact.pushToken, "Ride Safety Alert", message);
    });
  });

  // Geofence breach
  socket.on("geofence_breach", async ({ userId, location }) => {
    const user = await User.findById(userId);
    const message = "User exited safe zone!";
    user?.emergencyContacts?.forEach(contact => {
      if (contact.pushToken) sendPushNotification(contact.pushToken, "Ride Safety Alert", message);
    });
  });
};
