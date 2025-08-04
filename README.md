# BrewTracker Android

A React Native mobile app for the BrewTracker homebrewing platform, built with Expo.

## Features

- **Authentication**: Secure login/register with email verification
- **Recipe Management**: Create, view, and manage brewing recipes
- **Brew Session Tracking**: Monitor fermentation progress
- **Offline Support**: Cache data for offline access
- **Native Experience**: Touch-optimized UI designed for mobile

## Getting Started

### Prerequisites

- Expo CLI - for React Native development (`npm install -g @expo/cli`)
- Android Studio or Android device - for mobile app testing
- Java JDK 17+ - for Android development
- Node.js 18+ 
- BrewTracker backend running (see main project README)

### Installation

1. Clone the project and navigate to the Android directory:
   ```bash
   cd BrewTrackerAndroid
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your backend URL:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_IP:5000/api
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Use the Expo Go app on your Android device to scan the QR code, or use an Android emulator.

## Architecture

## 🏗️ Project Structure

```
BrewTrackerAndroid/                                   # React Native Android application
├── app/                                              # Expo Router file-based routing structure
│   ├── (auth)/                                       # Authentication flow screens
│   │   ├── login.tsx                                 # Login screen with JWT authentication and navigation
│   │   ├── register.tsx                              # User registration with real-time validation
│   │   ├── verify-email.tsx                          # Email verification with token input and resend functionality
│   │   └── _layout.tsx                               # Authentication layout configuration
│   ├── (tabs)/                                       # Main application tab navigation
│   │   ├── index.tsx                                 # Dashboard/home screen with brewing overview
│   │   ├── recipes.tsx                               # Recipe management and browsing
│   │   ├── brew-sessions.tsx                         # Brew session tracking and management
│   │   ├── profile.tsx                               # User profile and settings with secure logout
│   │   └── _layout.tsx                               # Tab navigation layout with Material Icons
│   ├── index.tsx                                     # Entry point with auth routing
│   └── _layout.tsx                                   # Root layout with AuthProvider and QueryClient
├── src/                                              # Source code for React Native components and services
│   ├── components/                                   # Reusable UI components
│   ├── contexts/                                     # React contexts (Auth, etc.)
│   │   └── AuthContext.tsx                           # Authentication context with secure token storage
│   ├── hooks/                                        # Custom React hooks
│   ├── services/                                     # API services and business logic
│   │   ├── API/
│   │   │   ├── apiService.ts                         # Complete API service layer with Axios configuration
│   │   │   └── queryClient.ts                        # React Query client configuration
│   │   └── config.ts                                 # Service configuration and constants
│   ├── styles/                                       # Global styles and theme
│   ├── types/                                        # TypeScript type definitions for mobile app
│   │   ├── api.ts                                    # API request/response interfaces
│   │   ├── common.ts                                 # Shared utility types
│   │   ├── recipe.ts                                 # Recipe and ingredient types
│   │   ├── user.ts                                   # User account and authentication types
│   │   └── index.ts                                  # Central type exports
│   └── utils/                                        # Utility functions
├── assets/                                           # Static assets (images, fonts, icons)
├── app.json                                          # Expo configuration for Android-only development
├── package.json                                      # React Native dependencies and Expo configuration
├── tsconfig.json                                     # TypeScript configuration for React Native
└── .env                                              # Environment variables for API URL and mobile configuration
``` 

### Key Technologies

- **Expo Router**: File-based navigation
- **React Query**: Server state management with caching
- **Expo Secure Store**: Secure token storage
- **AsyncStorage**: Local data persistence
- **Axios**: HTTP client with interceptors

### State Management

- **Authentication**: React Context with secure storage
- **Server Data**: React Query for caching and synchronization
- **Local State**: React hooks (useState, useReducer)

## Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Start with Android-specific options
- `npm run lint` - Run ESLint

### Environment Variables

Configure in `.env`:

- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_DEBUG_MODE` - Enable debug logging
- `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` - Enable offline features

### Backend Integration

The app connects to the BrewTracker Flask backend. Ensure the backend is running and accessible from your mobile device's network.

For local development, use your computer's IP address instead of `localhost`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
```

## Building for Production

### Android APK/AAB

1. Configure app.json with your app details
2. Build for Android:
   ```bash
   expo build:android
   ```

### Google Play Store

1. Create a Google Play Console account
2. Configure signing keys and app details
3. Build AAB for Play Store:
   ```bash
   expo build:android -t app-bundle
   ```

## Features Status

### ✅ Completed (Phase 1)
- Project setup with Expo and TypeScript
- Authentication system with secure storage
- Navigation structure with tab and stack navigation
- Basic UI screens (Login, Register, Dashboard, etc.)
- API service layer with React Query integration
- Environment configuration

### 🚧 In Progress (Phase 2)
- Recipe management screens
- Brew session tracking
- User settings and preferences

### 📋 Planned (Phase 3+)
- Recipe builder with ingredient selection
- BeerXML import/export
- AI recipe optimization
- Push notifications
- Offline mode with SQLite
- Camera integration for brew photos
- Public recipe browsing

## Contributing

This is a companion app to the main BrewTracker project. Follow the same contribution guidelines as the main project.

## License

GPL-3.0-or-later - Same as the main BrewTracker project.