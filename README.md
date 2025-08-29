# 🚗 Rydz Safety App

A ride safety application with real-time location tracking, emergency contacts, and JWT authentication, powered by Firebase.

## 📁 Project Structure

```
Rydz-safetyApp/
├── backend/
│   ├── models/          # Firebase models (User, Ride)
│   ├── routes/          # API routes (auth, rides)
│   ├── utils/           # JWT utilities
│   ├── server.js        # Main server with Socket.IO
│   ├── firebase-config.js # Firebase configuration
│   └── test-firebase.js # Firebase connection test
├── frontend/            # React Native app
│   ├── screens/         # App screens
│   ├── components/      # Reusable components
│   └── utils/           # Frontend utilities
├── package.json         # Single package file
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Firebase project (created at [Firebase Console](https://console.firebase.google.com/))
- Expo CLI (for frontend)

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Firebase Setup

1. **Download Firebase Service Account Key:**
   - Go to your Firebase project console
   - Navigate to **Project Settings** → **Service Accounts**
   - Click **"Generate New Private Key"**
   - Save as `backend/serviceAccountKey.json`

2. **Create Environment File:**
   Create `backend/.env` with:
   ```env
   FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=4000
   ```

### 3. Test Firebase Connection

```bash
npm test
```

### 4. Start Backend Server

```bash
npm start
# or for development with auto-restart:
npm run dev
```

### 5. Start Frontend (in new terminal)

```bash
npm run frontend
```

## 🔧 Configuration

### Backend Configuration (.env)
```env
# Firebase Configuration
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
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
- **Firebase Integration**: Scalable cloud database

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Failed**
   - Ensure `serviceAccountKey.json` exists in `backend/` folder
   - Verify Firebase project ID in `.env` file
   - Check service account permissions

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill processes using port 4000

3. **Frontend Can't Connect to Backend**
   - Verify IP address in `frontend/config.js`
   - Check if backend server is running
   - Ensure firewall allows connections

4. **JWT Token Issues**
   - Check JWT_SECRET in `.env` file
   - Verify token format in Authorization header

### Testing

Run the Firebase test script to verify setup:
```bash
npm test
```

## 📝 Development Notes

- Backend runs on port 4000
- Socket.IO is integrated with the main server
- JWT tokens expire in 7 days
- Location updates are stored in memory (not persistent)
- Emergency contacts are stored in Firebase User collection
- All data is stored in Firebase Firestore
- Single package.json for easy dependency management

## 🔒 Security Notes

- Change JWT_SECRET in production
- Implement rate limiting for production
- Add HTTPS in production
- Validate all input data
- Implement proper error handling
- Review Firebase security rules

## 📞 Support

If you encounter issues:
1. Check the console logs
2. Verify all dependencies are installed
3. Ensure Firebase is properly configured
4. Check network connectivity
5. Verify IP addresses in configuration

## 🚀 Available Scripts

- `npm start` - Start backend server
- `npm run dev` - Start backend with auto-restart
- `npm test` - Test Firebase connection
- `npm run frontend` - Start frontend app
- `npm run install:all` - Install all dependencies
