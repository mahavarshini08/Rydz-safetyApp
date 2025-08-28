# 🚗 Rydz Safety App

A ride safety application with real-time location tracking, emergency contacts, and JWT authentication.

## 📁 Project Structure

```
Rydz-safetyApp/
├── backend/
│   ├── models/
│   │   ├── user.js          # User model with phone, name, emergency contacts
│   │   └── Ride.js          # Ride tracking model
│   ├── routes/
│   │   ├── auth.js          # Authentication routes (login/register)
│   │   └── rides.js         # Ride management routes
│   ├── ride-tracking-server/
│   │   ├── server.js        # Main server with Socket.IO
│   │   ├── .env             # Environment variables
│   │   └── package.json     # Server dependencies
│   └── package.json         # Backend dependencies
├── frontend/
│   ├── screens/
│   │   ├── LoginScreen.js   # User login
│   │   ├── SignUpScreen.js  # User registration
│   │   ├── HomeScreen.js    # Main dashboard
│   │   └── TrackingScreen.js # Real-time tracking
│   ├── config.js            # API configuration
│   └── package.json         # Frontend dependencies
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running on localhost:27017)
- Expo CLI (for frontend)

### 1. Backend Setup

```bash
cd backend/ride-tracking-server

# Install dependencies
npm install

# Create .env file (already created)
# MONGO_URI=mongodb://127.0.0.1:27017/rydz
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# PORT=4000

# Test the setup
node test-server.js

# Start the server
npm start
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Expo development server
npm start
```

### 3. MongoDB Setup

Make sure MongoDB is running:
```bash
# Start MongoDB (Windows)
mongod

# Or if using MongoDB as a service
net start MongoDB
```

## 🔧 Configuration

### Backend Configuration (.env)
```env
MONGO_URI=mongodb://127.0.0.1:27017/rydz
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=4000
```

### Frontend Configuration (config.js)
```javascript
export const API_URL = 'http://192.168.1.7:4000';     // Your local IP
export const SOCKET_URL = 'http://192.168.1.7:4000';  // Same as API for now
```

**Important:** Change `192.168.1.7` to your actual local IP address.

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT token)

### Rides
- `POST /api/rides/start` - Start a new ride
- `POST /api/rides/:id/update` - Update ride location
- `POST /api/rides/:id/end` - End a ride
- `GET /api/rides/:id` - Get ride details

### Real-time
- `GET /locations` - Get all current locations
- `POST /locations` - Update location via HTTP
- Socket.IO events for real-time updates

## 🔐 Authentication

The app uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🗺️ Features

- **User Authentication**: Phone-based login/registration
- **Real-time Tracking**: Socket.IO for live location updates
- **Emergency Contacts**: Store emergency contact numbers
- **Ride History**: Track and store ride data
- **Geofencing**: Define safe zones for rides
- **Push Notifications**: Alert system for safety

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running on port 27017
   - Check if the database "rydz" exists

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill processes using port 4000

3. **Frontend Can't Connect to Backend**
   - Verify IP address in frontend/config.js
   - Check if backend server is running
   - Ensure firewall allows connections

4. **JWT Token Issues**
   - Check JWT_SECRET in .env file
   - Verify token format in Authorization header

### Testing

Run the test script to verify setup:
```bash
cd backend/ride-tracking-server
node test-server.js
```

## 📝 Development Notes

- Backend runs on port 4000
- Socket.IO is integrated with the main server
- JWT tokens expire in 7 days
- Location updates are stored in memory (not persistent)
- Emergency contacts are stored in User model

## 🔒 Security Notes

- Change JWT_SECRET in production
- Implement rate limiting for production
- Add HTTPS in production
- Validate all input data
- Implement proper error handling

## 📞 Support

If you encounter issues:
1. Check the console logs
2. Verify all dependencies are installed
3. Ensure MongoDB is running
4. Check network connectivity
5. Verify IP addresses in configuration
