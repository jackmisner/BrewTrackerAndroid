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
│   │   ├── forgotPassword.tsx                        # Password reset request with email validation
│   │   ├── resetPassword.tsx                         # Password reset confirmation with token validation
│   │   └── _layout.tsx                               # Authentication layout configuration
│   ├── (tabs)/                                       # Main application tab navigation
│   │   ├── index.tsx                                 # Dashboard/home screen with brewing overview
│   │   ├── recipes.tsx                               # Recipe management and browsing
│   │   ├── brewSessions.tsx                          # Brew session tracking and management
│   │   ├── profile.tsx                               # User profile and settings with secure logout
│   │   └── _layout.tsx                               # Tab navigation layout with Material Icons
│   ├── (modals)/                                     # Modal/detail screens (not in tab navigation)
│   │   ├── _layout.tsx                               # Modal navigation layout configuration
│   │   ├── (recipes)/                                # Recipe-related detail and creation screens
│   │   │   ├── _layout.tsx                           # Recipe modals layout
│   │   │   ├── viewRecipe.tsx                        # Individual recipe detail view with ingredients and metrics
│   │   │   ├── createRecipe.tsx                      # Multi-step recipe creation wizard
│   │   │   ├── editRecipe.tsx                        # Recipe editing interface
│   │   │   └── ingredientPicker.tsx                  # Full-screen ingredient selection with search and filtering
│   │   ├── (brewSessions)/                           # Brew session detail screens
│   │   │   ├── _layout.tsx                           # Brew session modals layout
│   │   │   ├── viewBrewSession.tsx                   # Individual brew session detail view with metrics and status
│   │   │   ├── createBrewSession.tsx                 # Multi-step brew session creation wizard
│   │   │   ├── editBrewSession.tsx                   # Brew session editing interface
│   │   │   ├── addFermentationEntry.tsx              # Add new fermentation data entries
│   │   │   └── editFermentationEntry.tsx             # Edit existing fermentation data entries
│   │   └── (settings)/                               # Settings screens
│   │       ├── _layout.tsx                           # Settings modals layout
│   │       └── settings.tsx                          # User settings and preferences
│   ├── index.tsx                                     # Entry point with auth routing
│   └── _layout.tsx                                   # Root layout with AuthProvider and QueryClient
├── src/                                              # Source code for React Native components and services
│   ├── components/                                   # Reusable UI components organized by feature
│   │   ├── brewSessions/                             # Brew session specific components
│   │   │   ├── FermentationChart.tsx                 # Interactive fermentation tracking charts with dual-axis
│   │   │   ├── FermentationData.tsx                  # Fermentation data display and management component
│   │   │   └── FermentationEntryContextMenu.tsx      # Context menu for fermentation entry actions
│   │   ├── recipes/                                  # Recipe management components
│   │   │   ├── BrewingMetrics/                       # Recipe metrics display components
│   │   │   │   └── BrewingMetricsDisplay.tsx         # Reusable brewing metrics with SRM color visualization
│   │   │   ├── IngredientEditor/                     # Advanced ingredient editing components
│   │   │   │   └── IngredientDetailEditor.tsx        # Complete ingredient editing with type-specific UI
│   │   │   └── RecipeForm/                           # Multi-step recipe creation forms
│   │   │       ├── BasicInfoForm.tsx                 # Recipe name, style, batch size input
│   │   │       ├── ParametersForm.tsx                # Brewing parameters (boil time, efficiency, mash temp)
│   │   │       ├── IngredientsForm.tsx               # Ingredient list management interface
│   │   │       └── ReviewForm.tsx                    # Final recipe review and submission
│   │   └── ui/                                       # Generic UI components
│   │       └── ContextMenu/                          # Context menu implementations
│   │           ├── BaseContextMenu.tsx               # Base context menu component with common functionality
│   │           ├── RecipeContextMenu.tsx             # Recipe-specific context menu actions
│   │           ├── BrewSessionContextMenu.tsx        # Brew session-specific context menu actions
│   │           └── contextMenuUtils.ts               # Shared utilities for context menu operations
│   ├── contexts/                                     # React contexts for global state
│   │   ├── AuthContext.tsx                           # Authentication context with secure token storage
│   │   ├── ThemeContext.tsx                          # Theme management with light/dark mode support
│   │   └── UnitContext.tsx                           # Unit system management (imperial/metric)
│   ├── hooks/                                        # Custom React hooks
│   │   ├── useBeerStyles.ts                          # Beer style data fetching and management
│   │   ├── useDebounce.ts                            # Performance optimization for search inputs
│   │   ├── useRecipeMetrics.ts                       # Real-time recipe calculations hook
│   │   └── useStoragePermissions.ts                  # Storage permission management for file operations
│   ├── services/                                     # API services and business logic
│   │   ├── api/                                      # API layer with React Query integration
│   │   │   ├── apiService.ts                         # Hardened API service with validated base URL, timeout, error normalization, and retry logic
│   │   │   ├── queryClient.ts                        # React Query client configuration
│   │   │   └── idInterceptor.ts                      # MongoDB ObjectId to string normalization
│   │   ├── config.ts                                 # Service configuration and constants
│   │   └── storageService.ts                         # Storage service for file operations and permissions
│   ├── constants/                                    # Shared constants and configuration
│   │   └── hopConstants.ts                           # Hop usage options, time presets, and type definitions
│   ├── utils/                                        # Utility functions
│   │   ├── formatUtils.ts                            # Comprehensive brewing data formatting utilities
│   │   ├── idNormalization.ts                        # MongoDB ObjectId normalization utilities
│   │   └── timeUtils.ts                              # Time calculation and conversion utilities
│   ├── types/                                        # TypeScript type definitions for mobile app
│   │   ├── api.ts                                    # API request/response interfaces
│   │   ├── common.ts                                 # Shared utility types
│   │   ├── recipe.ts                                 # Recipe and ingredient types
│   │   ├── brewSession.ts                            # Brew session and fermentation types
│   │   ├── user.ts                                   # User account and authentication types
│   │   └── index.ts                                  # Central type exports
│   └── styles/                                       # StyleSheet definitions organized by feature
│       ├── auth/                                     # Authentication screen styles
│       │   ├── loginStyles.ts                        # Login screen styling with theme support
│       │   ├── registerStyles.ts                     # Registration screen styling
│       │   └── verifyEmailStyles.ts                  # Email verification screen styling
│       ├── tabs/                                     # Tab navigation screen styles
│       │   ├── dashboardStyles.ts                    # Dashboard/home screen styling
│       │   ├── recipesStyles.ts                      # Recipe list screen styling
│       │   ├── brewSessionsStyles.ts                 # Brew session list screen styling
│       │   └── profileStyles.ts                      # Profile screen styling
│       ├── modals/                                   # Modal screen styles
│       │   ├── viewRecipeStyles.ts                   # Recipe detail view styling
│       │   ├── createRecipeStyles.ts                 # Recipe creation wizard styling
│       │   ├── ingredientPickerStyles.ts             # Ingredient picker styling
│       │   ├── viewBrewSessionStyles.ts              # Brew session detail view styling
│       │   ├── createBrewSessionStyles.ts            # Brew session creation styling
│       │   ├── editBrewSessionStyles.ts              # Brew session editing styling
│       │   └── settingsStyles.ts                     # Settings screen styling
│       ├── components/                               # Component-specific styles
│       │   └── brewingMetricsStyles.ts               # Brewing metrics display styling
│       ├── recipes/                                  # Recipe component styles
│       │   └── ingredientDetailEditorStyles.ts       # Ingredient editor styling
│       ├── ui/                                       # UI component styles
│       │   ├── baseContextMenuStyles.ts              # Base context menu styling
│       │   └── recipeContextMenuStyles.ts            # Recipe context menu styling
│       └── common/                                   # Shared styling utilities
│           ├── colors.ts                             # Theme color definitions
│           └── buttons.ts                            # Reusable button styles
├── tests/                                            # Test files and configuration
├── assets/                                           # Static assets (images, fonts, icons)
├── app.json                                          # Expo configuration for Android-only development
├── package.json                                      # React Native dependencies and Expo configuration
├── LICENSE                                           # GPL-3.0-or-later license
├── LICENSE-HEADER.txt                                # License header for source files
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
import { useTheme } from "@contexts/ThemeContext";
import { viewBrewSessionStyles } from "@styles/modals/viewBrewSessionStyles";

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

#### Network Configuration

Flask defaults to port 5000. If you've changed the backend port, update both the Flask command and API URL accordingly.

**For Physical Devices:** Use your computer's network IP address instead of `localhost`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
```

**For Android Emulators:** You can use the special IP address `10.0.2.2` which maps to the host machine's `localhost`:

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

**Important Setup Steps:**

1. Start the backend with `--host=0.0.0.0` to accept connections from mobile devices:

```bash
# In the BrewTracker backend directory
flask run --host=0.0.0.0
```

2. **Firewall Configuration:** When testing on physical devices, ensure port 5000 (or your custom port) is open in your computer's firewall settings to allow incoming connections from mobile devices on your network.

## Building for Production

### Android APK/AAB

1. Configure app.json with your app details
2. Build for Android:
   ```bash
   eas build -p android
   ```

### Google Play Store

1. Create a Google Play Console account
2. Configure signing keys and app details
3. Build AAB for Play Store:
   ```bash
   eas build -p android
   ```

## API Security & Hardening

The BrewTrackerAndroid API service layer has been hardened with robust security and reliability features:

### Configuration Validation

- **Mandatory Base URL**: `EXPO_PUBLIC_API_URL` environment variable is strictly required and validated
- **URL Format Validation**: Ensures API URL is properly formatted and accessible
- **Clean URL Processing**: Automatic trailing slash removal for consistency
- **Fail-Fast Validation**: Application fails immediately with clear error messages for invalid configuration

### Enhanced Error Handling

- **Error Normalization**: Consistent error format across all API responses
- **Categorized Errors**: Network errors, timeouts, client errors, and server errors properly classified
- **User-Friendly Messages**: Technical errors translated to actionable user messages
- **Retryability Detection**: Automatic identification of retryable vs non-retryable errors

### Network Resilience

- **Smart Retry Policy**: Automatic retry for idempotent GET requests on transient failures
- **Exponential Backoff**: Progressive retry delays with jitter to prevent thundering herd
- **Timeout Configuration**: Hardened 15-second timeout optimized for mobile networks
- **Connection Validation**: Built-in network connectivity checking

### Error Types Handled

- **Network Errors**: Connection failures, DNS issues, network timeouts
- **HTTP Status Codes**: Proper handling of 4xx client errors and 5xx server errors
- **Rate Limiting**: Automatic retry for 429 (Too Many Requests) responses
- **Service Unavailability**: Retry logic for 502, 503, 504 temporary service issues
- **Authentication**: Secure token cleanup on 401 authentication failures

### Usage Example

```typescript
// Error handling with normalization
try {
  const recipe = await ApiService.recipes.getById("recipe-id");
} catch (error) {
  const normalized = ApiService.handleApiError(error);

  if (normalized.isRetryable) {
    // Will be automatically retried for GET requests
    console.log("Retrying request...");
  } else {
    // Handle non-retryable errors
    showUserError(normalized.message);
  }
}
```

### Configuration Requirements

```bash
# Required in .env file
EXPO_PUBLIC_API_URL=https://api.brewtracker.com/v1  # Must be valid URL
EXPO_PUBLIC_DEBUG_MODE=false                        # Optional debug logging
```


## 💡 **Strategic Considerations**

### **Mobile-First Adaptations Needed:**

- Touch-optimized ingredient selection
- Simplified recipe builder for mobile screens
- Mobile-friendly file import/export
- Gesture-based navigation for complex features

### **Backend Capabilities:**

- ✅ Most APIs exist for missing features (verify relevant endpoints per feature)
- ✅ Mobile-optimized endpoints available
- ✅ Comprehensive data models support all features

### **Architecture Readiness:**

- ✅ React Query caching supports complex features
  🔶 Offline Write Strategy:
  - Pending mutation queue with retry/backoff
  - Conflict resolution policy (last-write-wins or server-merged)
  - Idempotency keys for create/edit to prevent duplicates
  - User feedback for out-of-sync edits
- ✅ Type definitions exist for all data models
- ✅ Theme system can handle complex UIs
- ✅ Navigation structure supports modal workflows
  **Current Status:** Phase 3 Complete (85% Feature Complete for viewing), Phase 4 focuses on bringing core creation/editing capabilities to achieve feature parity with web application.

## Contributing

This is a companion app to the main BrewTracker project. Follow the same contribution guidelines as the main project.

## License

GPL-3.0-or-later - Same as the main BrewTracker project.
