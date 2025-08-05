# BrewTracker Android

A React Native mobile app for the BrewTracker homebrewing platform, built with Expo.

## Features

- **Authentication**: Complete login/register flow with email verification and JWT tokens
- **Recipe Management**: Browse and view detailed recipes with ingredients and metrics
- **Brew Session Tracking**: View brew session details with status tracking and metrics
- **User Profile**: Settings management with theme support
- **Offline Support**: React Query caching for improved performance
- **Native Experience**: Touch-optimized UI with theme support and responsive design

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
│   │   ├── verifyEmail.tsx                           # Email verification with token input and resend functionality
│   │   └── _layout.tsx                               # Authentication layout configuration
│   ├── (tabs)/                                       # Main application tab navigation
│   │   ├── index.tsx                                 # Dashboard/home screen with brewing overview
│   │   ├── recipes.tsx                               # Recipe management and browsing
│   │   ├── brewSessions.tsx                          # Brew session tracking and management
│   │   ├── profile.tsx                               # User profile and settings with secure logout
│   │   └── _layout.tsx                               # Tab navigation layout with Material Icons
│   ├── (modals)/                                     # Modal/detail screens (not in tab navigation)
│   │   ├── _layout.tsx                               # Modal navigation layout configuration
│   │   ├── (recipes)/                                # Recipe-related detail screens
│   │   │   ├── _layout.tsx                           # Recipe modals layout
│   │   │   └── viewRecipe.tsx                        # Individual recipe detail view with ingredients and metrics
│   │   ├── (brewSessions)/                           # Brew session detail screens
│   │   │   ├── _layout.tsx                           # Brew session modals layout
│   │   │   └── viewBrewSession.tsx                   # Individual brew session detail view with metrics and status
│   │   └── (settings)/                               # Settings screens
│   │       ├── _layout.tsx                           # Settings modals layout
│   │       └── settings.tsx                         # User settings and preferences
│   ├── index.tsx                                     # Entry point with auth routing
│   └── _layout.tsx                                   # Root layout with AuthProvider and QueryClient
├── src/                                              # Source code for React Native components and services
│   ├── components/                                   # Reusable UI components
│   ├── contexts/                                     # React contexts (Auth, Theme)
│   │   ├── AuthContext.tsx                           # Authentication context with secure token storage
│   │   └── ThemeContext.tsx                          # Theme management with light/dark mode support
│   ├── hooks/                                        # Custom React hooks
│   ├── services/                                     # API services and business logic
│   │   ├── API/
│   │   │   ├── apiService.ts                         # Complete API service layer with Axios configuration
│   │   │   └── queryClient.ts                        # React Query client configuration
│   │   └── config.ts                                 # Service configuration and constants
│   ├── styles/                                       # StyleSheet definitions organized by feature
│   │   ├── auth/                                     # Authentication screen styles
│   │   │   ├── loginStyles.ts                        # Login screen styling with common colors
│   │   │   ├── registerStyles.ts                     # Registration screen styling
│   │   │   └── verifyEmailStyles.ts                  # Email verification screen styling
│   │   ├── tabs/                                     # Main tab navigation screen styles
│   │   │   ├── dashboardStyles.ts                    # Dashboard/home screen styling
│   │   │   ├── recipesStyles.ts                      # Recipe browsing screen styling
│   │   │   ├── brewSessionsStyles.ts                 # Brew session tracking screen styling
│   │   │   └── profileStyles.ts                      # User profile screen styling
│   │   ├── modals/                                   # Modal/detail screen styles
│   │   │   ├── viewRecipeStyles.ts                   # Recipe detail view styling
│   │   │   ├── viewBrewSessionStyles.ts               # Brew session detail view styling
│   │   │   └── settingsStyles.ts                     # Settings screen styling
│   │   └── common/                                   # Shared style definitions
│   │       ├── colors.ts                             # Centralized color constants for consistent theming
│   │       └── buttons.ts                            # Reusable button styles using color constants
│   ├── types/                                        # TypeScript type definitions for mobile app
│   │   ├── api.ts                                    # API request/response interfaces
│   │   ├── common.ts                                 # Shared utility types
│   │   ├── recipe.ts                                 # Recipe and ingredient types
│   │   ├── brewSession.ts                            # Brew session and fermentation types
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

- **Expo Router**: File-based navigation with nested route groups and modal presentation
- **React Query**: Server state management with caching and optimistic updates
- **Expo Secure Store**: Secure JWT token storage for authentication
- **AsyncStorage**: Local data persistence for user preferences
- **Axios**: HTTP client with request/response interceptors
- **TypeScript**: Full type safety across the application
- **Material Icons**: Consistent iconography from @expo/vector-icons

### File Organization Conventions

- **camelCase**: All TypeScript files use camelCase naming (e.g., `verifyEmail.tsx`, `brewSessions.tsx`)
- **Route Groups**: Parentheses `()` create logical groupings without affecting URLs:
  - `(auth)/` - Authentication screens
  - `(tabs)/` - Main tab navigation screens
  - `(modals)/` - Detail/overlay screens not in tab navigation
- **Feature Grouping**: Modal screens are grouped by feature under `(modals)/(feature)/`
- **Consistent Structure**: Follows TypeScript and React Native best practices

### State Management

- **Authentication**: React Context with Expo SecureStore for JWT tokens
- **Theme Management**: React Context with AsyncStorage persistence
- **Server Data**: React Query for caching, background updates, and offline support
- **Local State**: React hooks (useState, useReducer) for component-level state

### Styling Architecture

The app uses a centralized styling system with theme support:

- **Theme Context**: Light/dark mode support with automatic system detection
- **Feature-based Organization**: Styles are organized by screen type (auth, tabs, modals)
- **Dynamic Theming**: All style functions accept theme context for consistent theming
- **TypeScript Integration**: All styles are fully typed with theme-aware interfaces
- **Centralized Colors**: Theme-based color system with light/dark variants
- **Responsive Design**: Proper spacing, typography, and touch targets for mobile

#### Theme-Aware Style Pattern:

```typescript
import { useTheme } from "../../../src/contexts/ThemeContext";
import { viewBrewSessionStyles } from "../../../src/styles/modals/viewBrewSessionStyles";

const theme = useTheme();
const styles = viewBrewSessionStyles(theme);
```

This approach provides:

- **Theme Consistency**: All screens automatically adapt to light/dark themes
- **Maintainability**: Styles are separate from component logic with theme support
- **Accessibility**: Proper contrast ratios and readable text in both themes
- **Type Safety**: Full TypeScript support for all style properties and theme values

## Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Start with Android-specific options
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run lint:fix` - Run ESLint and auto-fix issues
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Environment Variables

Configure in `.env`:

- `EXPO_PUBLIC_API_URL` - Backend API URL (required)
- `EXPO_PUBLIC_DEBUG_MODE` - Enable debug logging (optional)
- `EXPO_PUBLIC_LOG_LEVEL` - Set logging level (optional)
- `EXPO_PUBLIC_ENABLE_GOOGLE_AUTH` - Enable Google authentication (optional)
- `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` - Enable offline features (optional)
- `EXPO_PUBLIC_ANALYTICS_ENABLED` - Enable analytics tracking (optional)

### Backend Integration

The app connects to the BrewTracker Flask backend. Ensure the backend is running and accessible from your mobile device's network.

For local development, use your computer's network IP address instead of `localhost`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
```

**Important:** The backend must be started with `--host=0.0.0.0` to accept connections from mobile devices:

```bash
# In the BrewTracker backend directory
flask run --host=0.0.0.0
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

### ✅ Completed (Phase 1 & 2)

**Core Infrastructure:**

- Project setup with Expo Router and TypeScript
- Authentication system with JWT and secure storage
- Complete navigation structure with nested modal routing
- Theme system with light/dark mode support
- API service layer with React Query integration
- Comprehensive TypeScript type definitions
- Code quality tools (ESLint, Prettier, TypeScript)

**User Interface:**

- Authentication flow (login, register, email verification)
- Dashboard with brewing overview and statistics
- Recipe browsing and detailed recipe viewing
- Brew session management and detailed session viewing
- User profile with settings and logout functionality
- Responsive design with proper touch targets

**Data Management:**

- Complete API integration with BrewTracker backend
- React Query caching and background synchronization
- Offline-capable data persistence
- Error handling and loading states
- Pull-to-refresh functionality

### 🚧 In Progress (Phase 3)

- Enhanced brew session features (fermentation tracking)
- Advanced recipe filtering and search
- User preferences and settings expansion
- Performance optimizations

### 📋 Planned (Phase 4+)

- Recipe builder with ingredient selection
- BeerXML import/export functionality
- AI recipe optimization integration
- Push notifications for brew milestones
- Advanced offline mode with local database
- Camera integration for brew session photos
- Public recipe browsing and community features
- Advanced analytics and brew statistics

## Contributing

This is a companion app to the main BrewTracker project. Follow the same contribution guidelines as the main project.

## License

GPL-3.0-or-later - Same as the main BrewTracker project.
