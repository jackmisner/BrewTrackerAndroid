# BrewTracker Android

A React Native mobile app for the BrewTracker homebrewing platform, built with Expo.

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
│   │   ├── utilities.tsx                             # Brewing calculators and utility tools
│   │   ├── profile.tsx                               # User profile and settings with secure logout
│   │   └── _layout.tsx                               # Tab navigation layout with Material Icons
│   ├── (modals)/                                     # Modal/detail screens (not in tab navigation)
│   │   ├── _layout.tsx                               # Modal navigation layout configuration
│   │   ├── (recipes)/                                # Recipe-related detail and creation screens
│   │   │   ├── _layout.tsx                           # Recipe modals layout
│   │   │   ├── viewRecipe.tsx                        # Individual recipe detail view with ingredients and metrics
│   │   │   ├── createRecipe.tsx                      # Multi-step recipe creation wizard
│   │   │   ├── editRecipe.tsx                        # Recipe editing interface
│   │   │   ├── versionHistory.tsx                    # Recipe version history timeline navigation (358 lines)
│   │   │   └── ingredientPicker.tsx                  # Full-screen ingredient selection with search and filtering
│   │   ├── (beerxml)/                                # BeerXML import/export workflow screens
│   │   │   ├── importBeerXML.tsx                     # BeerXML file selection and parsing
│   │   │   ├── ingredientMatching.tsx                # Ingredient matching and approval workflow
│   │   │   └── importReview.tsx                      # Final import review and recipe creation
│   │   ├── (brewSessions)/                           # Brew session detail screens
│   │   │   ├── _layout.tsx                           # Brew session modals layout
│   │   │   ├── viewBrewSession.tsx                   # Individual brew session detail view with metrics and status
│   │   │   ├── createBrewSession.tsx                 # Multi-step brew session creation wizard
│   │   │   ├── editBrewSession.tsx                   # Brew session editing interface
│   │   │   ├── addFermentationEntry.tsx              # Add new fermentation data entries
│   │   │   └── editFermentationEntry.tsx             # Fermentation entry editing interface
│   │   ├── (calculators)/                            # Brewing calculator tools
│   │   │   ├── _layout.tsx                           # Calculator modals layout
│   │   │   ├── abv.tsx                               # ABV (Alcohol by Volume) calculator
│   │   │   ├── dilution.tsx                          # Water dilution calculator
│   │   │   ├── strikeWater.tsx                       # Strike water temperature calculator
│   │   │   ├── hydrometerCorrection.tsx              # Hydrometer temperature correction calculator
│   │   │   ├── unitConverter.tsx                     # Unit conversion calculator
│   │   │   └── boilTimer.tsx                         # Boil timer with hop addition alerts
│   │   └── (settings)/                               # Settings screens
│   │       ├── _layout.tsx                           # Settings modals layout
│   │       └── settings.tsx                          # User settings and preferences
│   ├── index.tsx                                     # Entry point with auth routing
│   └── _layout.tsx                                   # Root layout with AuthProvider and QueryClient
├── src/                                              # Source code for React Native components and services
│   ├── components/                                   # Reusable UI components organized by feature
│   │   ├── boilTimer/                                # Boil timer specific components
│   │   │   └── RecipeSelector.tsx                    # Recipe selection component for boil timer
│   │   ├── brewSessions/                             # Brew session specific components
│   │   │   ├── FermentationChart.tsx                 # Interactive fermentation tracking charts with dual-axis
│   │   │   ├── FermentationData.tsx                  # Fermentation data display and management component
│   │   │   └── FermentationEntryContextMenu.tsx      # Context menu for fermentation entry actions
│   │   ├── calculators/                              # Brewing calculator components
│   │   │   ├── CalculatorCard.tsx                    # Reusable calculator card component for utilities screen
│   │   │   ├── CalculatorHeader.tsx                  # Standard calculator header with title and description
│   │   │   ├── ResultDisplay.tsx                     # Standardized result display component for calculations
│   │   │   ├── UnitToggle.tsx                        # Unit system toggle component for calculator inputs
│   │   │   └── NumberInput.tsx                       # Specialized number input component for calculator forms
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
│   │   ├── NetworkStatusBanner.tsx                   # Network connectivity status banner component
│   │   ├── splash/                                   # Splash screen components
│   │   │   └── SplashScreen.tsx                      # App loading splash screen component
│   │   └── ui/                                       # Generic UI components
│   │       └── ContextMenu/                          # Context menu implementations
│   │           ├── BaseContextMenu.tsx               # Base context menu component with common functionality
│   │           ├── RecipeContextMenu.tsx             # Recipe-specific context menu actions
│   │           ├── BrewSessionContextMenu.tsx        # Brew session-specific context menu actions
│   │           └── contextMenuUtils.ts               # Shared utilities for context menu operations
│   ├── contexts/                                     # React contexts for global state
│   │   ├── AuthContext.tsx                           # Authentication context with secure token storage
│   │   ├── CalculatorsContext.tsx                    # Calculator state management and shared logic
│   │   ├── DeveloperContext.tsx                      # Developer options and debugging context
│   │   ├── NetworkContext.tsx                        # Network connectivity detection for offline functionality
│   │   ├── ScreenDimensionsContext.tsx               # Screen dimensions management with support for foldable devices
│   │   ├── ThemeContext.tsx                          # Theme management with light/dark mode support
│   │   └── UnitContext.tsx                           # Unit system management (imperial/metric)
│   ├── hooks/                                        # Custom React hooks
│   │   ├── useBeerStyles.ts                          # Beer style data fetching and management
│   │   ├── useDebounce.ts                            # Performance optimization for search inputs
│   │   ├── useOfflineIngredients.ts                  # Offline-first ingredient management with React Query integration
│   │   ├── useOfflineRecipes.ts                      # Offline-first recipe management with React Query integration
│   │   ├── useRecipeMetrics.ts                       # Real-time recipe calculations hook
│   │   └── useStoragePermissions.ts                  # Storage permission management for file operations
│   ├── services/                                     # API services and business logic
│   │   ├── api/                                      # API layer with React Query integration
│   │   │   ├── apiService.ts                         # Hardened API service with validated base URL, timeout, error normalization, and retry logic
│   │   │   ├── queryClient.ts                        # React Query client configuration
│   │   │   └── idInterceptor.ts                      # MongoDB ObjectId to string normalization
│   │   ├── beerxml/                                  # BeerXML processing services
│   │   │   └── BeerXMLService.ts                     # BeerXML import/export with mobile file integration
│   │   ├── offline/                                  # Offline functionality services
│   │   │   ├── OfflineCacheService.ts                # Generic offline caching service with AsyncStorage
│   │   │   ├── OfflineMetricsCalculator.ts           # Offline brewing calculations and recipe metrics
│   │   │   └── OfflineRecipeService.ts               # Offline-first recipe CRUD with automatic synchronization
│   │   ├── calculators/                              # Brewing calculation services
│   │   │   ├── ABVCalculator.ts                      # Alcohol by Volume calculation logic
│   │   │   ├── BoilTimerCalculator.ts                # Boil timer and hop addition scheduling
│   │   │   ├── DilutionCalculator.ts                 # Water dilution and blending calculations
│   │   │   ├── EfficiencyCalculator.ts               # Mash and brewhouse efficiency calculations (Service created, modal route not implemented yet)
│   │   │   ├── HydrometerCorrectionCalculator.ts     # Temperature-corrected hydrometer readings
│   │   │   ├── PrimingSugarCalculator.ts             # Carbonation and priming sugar calculations (Service created, modal route not implemented yet)
│   │   │   ├── StrikeWaterCalculator.ts              # Mash strike water temperature calculations
│   │   │   ├── UnitConverter.ts                      # Unit conversion utilities and logic
│   │   │   └── YeastPitchRateCalculator.ts           # Yeast pitching rate and viability calculations (Service created, modal route not implemented yet)
│   │   ├── config.ts                                 # Service configuration and constants
│   │   ├── NotificationService.ts                    # Local notification service for timers and alerts
│   │   ├── storageService.ts                         # Storage service for file operations and permissions
│   │   └── TimerPersistenceService.ts                # Timer state persistence for boil timer
│   ├── constants/                                    # Shared constants and configuration
│   │   ├── hopConstants.ts                           # Hop usage options, time presets, and type definitions
│   │   └── testIDs.ts                                # Centralized test IDs for consistent testing across components
│   ├── utils/                                        # Utility functions
│   │   ├── formatUtils.ts                            # Comprehensive brewing data formatting utilities
│   │   ├── idNormalization.ts                        # MongoDB ObjectId normalization utilities
│   │   ├── jwtUtils.ts                               # JWT token validation and management utilities
│   │   ├── keyUtils.ts                               # Secure key generation and management utilities
│   │   ├── timeUtils.ts                              # Time calculation and conversion utilities
│   │   └── userValidation.ts                         # User input validation utilities
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
│       │   ├── calculators/                          # Calculator modal styles
│       │   │   ├── boilTimerStyles.ts                # Boil timer calculator styling
│       │   │   └── calculatorScreenStyles.ts         # Common calculator screen styling
│       │   ├── viewRecipeStyles.ts                   # Recipe detail view styling
│       │   ├── createRecipeStyles.ts                 # Recipe creation wizard styling
│       │   ├── ingredientPickerStyles.ts             # Ingredient picker styling
│       │   ├── viewBrewSessionStyles.ts              # Brew session detail view styling
│       │   ├── createBrewSessionStyles.ts            # Brew session creation styling
│       │   ├── editBrewSessionStyles.ts              # Brew session editing styling
│       │   └── settingsStyles.ts                     # Settings screen styling
│       ├── components/                               # Component-specific styles
│       │   ├── brewingMetricsStyles.ts               # Brewing metrics display styling
│       │   ├── calculators/                          # Calculator component styles
│       │   │   ├── calculatorCardStyles.ts           # Calculator card component styling
│       │   │   ├── calculatorHeaderStyles.ts         # Calculator header component styling
│       │   │   ├── numberInputStyles.ts              # Number input component styling
│       │   │   ├── resultDisplayStyles.ts            # Result display component styling
│       │   │   └── unitToggleStyles.ts               # Unit toggle component styling
│       │   └── charts/                               # Chart component styles
│       │       └── fermentationChartStyles.ts        # Fermentation chart styling
│       ├── recipes/                                  # Recipe component styles
│       │   └── ingredientDetailEditorStyles.ts       # Ingredient editor styling
│       ├── ui/                                       # UI component styles
│       │   ├── baseContextMenuStyles.ts              # Base context menu styling
│       │   └── recipeContextMenuStyles.ts            # Recipe context menu styling
│       └── common/                                   # Shared styling utilities
│           ├── colors.ts                             # Theme color definitions
│           ├── buttons.ts                            # Reusable button styles
│           └── sharedStyles.ts                       # Common shared styling utilities
├── tests/                                            # Test files and configuration
├── assets/                                           # Static assets (images, fonts, icons)
├── app.json                                          # Expo configuration for Android-only development
├── package.json                                      # React Native dependencies and Expo configuration
├── eslint.config.js                                  # ESLint configuration (fallback)
├── .oxlintrc.json                                    # oxlint configuration (primary linter)
├── tsconfig.json                                     # TypeScript configuration with path aliases
├── LICENSE                                           # GPL-3.0-or-later license
├── LICENSE-HEADER.txt                                # License header for source files
└── .env                                              # Environment variables for API URL and mobile configuration
```

### Key Technologies

- **Expo Router**: File-based navigation with nested route groups and modal presentation
- **React Query**: Server state management with caching, optimistic updates, and offline persistence
- **Expo Secure Store**: Secure JWT token storage for authentication
- **AsyncStorage**: Local data persistence for user preferences and offline data
- **NetInfo**: Network connectivity detection for offline functionality
- **Axios**: HTTP client with request/response interceptors
- **React Native Reanimated**: High-performance animations and gestures
- **React Native Gesture Handler**: Advanced touch and gesture handling
- **Expo Notifications**: Local notification support for timers and alerts
- **React Native Gifted Charts**: Interactive charts for fermentation tracking
- **TypeScript**: Full type safety across the application
- **oxlint**: Ultra-fast Rust-based linter (100x performance improvement over ESLint)
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
- **Network Connectivity**: React Context with NetInfo for offline detection
- **Screen Dimensions**: React Context with support for foldable devices
- **Theme Management**: React Context with AsyncStorage persistence
- **Unit System**: React Context for imperial/metric conversion
- **Server Data**: React Query with AsyncStorage persistence for offline support
- **Offline Data**: AsyncStorage with React Query integration for seamless offline/online experience
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
- `npm run android` - Build and run on Android device/emulator
- `npm run lint` - Run oxlint (100x faster than ESLint)
- `npm run lint:fix` - Run oxlint with auto-fix
- `npm run lint:eslint` - Fallback to ESLint if needed
- `npm run lint:eslint:fix` - ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests for CI/CD with coverage
- `npm run version:patch` - Increment patch version and sync with app.json
- `npm run version:minor` - Increment minor version and sync with app.json
- `npm run version:major` - Increment major version and sync with app.json

### Code Quality & Testing

- **TypeScript**: Strict type checking with `npm run type-check` (must pass for all commits)
- **Linting**: oxlint primary linter (100x faster than ESLint), ESLint fallback available
- **Testing**: >70% coverage with comprehensive test suite across all features (119+ test files)
- **Quality Gates**: All CRUD operations, advanced features, and UI components fully tested
- **CI/CD**: Automated quality checks ensure code standards

### Environment Variables

Configure in `.env`:

- `EXPO_PUBLIC_API_URL` - Backend API URL (required)
- `EXPO_PUBLIC_DEBUG_MODE` - Enable debug logging (optional)
- `EXPO_PUBLIC_LOG_LEVEL` - Set logging level (optional)
- `EXPO_PUBLIC_ENABLE_GOOGLE_AUTH` - Enable Google authentication (optional)
- `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` - Enable offline features (enabled by default)
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

## 🌐 **Offline Functionality**

### **Phase 2 Complete: Recipe Offline CRUD Operations** ✅

BrewTrackerAndroid now supports comprehensive offline functionality for recipe management, ensuring brewers can continue working even without an internet connection.

#### ✅ **Implemented Offline Features**

**Offline Recipe Management:**

- **Complete CRUD Operations**: Create, read, update, and delete recipes offline
- **Automatic Fallback**: Seamlessly switches to offline storage when network unavailable
- **Optimistic Updates**: Instant UI updates with rollback on sync failure
- **Temporary ID Generation**: Offline-created recipes get unique temporary IDs until synced

**Synchronization System:**

- **Automatic Background Sync**: When network returns, pending changes sync automatically
- **Manual Sync Trigger**: Users can manually trigger sync with visual feedback
- **Conflict Resolution**: Last-write-wins strategy with timestamp-based merging
- **Retry Logic**: Failed sync operations retry with exponential backoff (max 3 attempts)

**Enhanced UI with Sync Status:**

- **Sync Indicators**: Visual indicators show recipes pending sync and sync status
- **Network Status**: Real-time network connectivity detection and user feedback
- **Sync Progress**: Loading states and progress indicators during synchronization
- **Error Handling**: Clear error messages and retry options for sync failures

#### 🏗️ **Technical Architecture**

**Offline Service Layer:**

- `OfflineRecipeService.ts` - Comprehensive offline-first service with AsyncStorage persistence
- `useOfflineRecipes.ts` - React Query hooks with offline integration and optimistic updates
- Network detection with `@react-native-community/netinfo`
- React Query persistence with AsyncStorage for seamless data access

**Data Flow:**

1. **Online**: Operations attempt server first, fallback to offline on failure
2. **Offline**: Operations stored locally with pending sync queue
3. **Network Return**: Automatic background sync with conflict resolution
4. **UI Updates**: Real-time sync status with manual trigger options

#### 📱 **User Experience**

**Seamless Offline/Online Transition:**

- No user intervention required for offline/online switching
- Visual feedback for all sync operations and network status
- Offline-created content clearly marked until successfully synced
- Background sync preserves user focus without interruption

**Reliability Features:**

- **Data Persistence**: All offline data survives app restarts
- ⚠️ Security: AsyncStorage is not encrypted; do not store secrets/PII. Tokens remain in SecureStore.
- **Conflict Resolution**: Automatic handling of concurrent edits
- **Sync Recovery**: Failed operations automatically retry when network improves
- **User Control**: Manual sync triggers for immediate synchronization

#### 🚀 **Next Phase: Ingredients & Calculations Offline**

**Phase 3 Roadmap:**

- **Ingredients Database Caching**: Cache ingredients database with background refresh
- **Offline Calculations**: Ensure recipe metrics work without internet connection
- **Enhanced Offline UI**: Additional sync status indicators and conflict resolution UI

---

## 💡 **Development Achievements & Architecture**

### **Phase 5 Completion Status: ~85% Feature Parity** ✅

### ✅ Core Features Complete

- **Authentication**: Complete login/register flow with email verification and secure JWT token storage
- **Recipe Management**: Full CRUD operations with 4-step creation wizard and real-time calculations
- **Offline Recipe Management**: Complete offline-first recipe CRUD with automatic synchronization
- **Recipe Cloning System**: Differentiated logic for private recipes (versioning) vs public recipes (attribution)
- **Version History**: Complete timeline navigation with visual version tree and interactive browsing
- **BeerXML Import/Export**: 3-screen mobile workflow with ingredient matching and file sharing
- **Brew Session Tracking**: Full CRUD operations with comprehensive fermentation data management
- **Advanced UI/UX**: Touch-optimized interface, context menus, gesture navigation, and theme support
- **Testing Infrastructure**: >70% coverage with comprehensive test suite (119+ test files)

### 🔧 Advanced Technical Features

- **Offline-First Architecture**: Complete recipe management works without internet connection
- **React Query Integration**: Optimistic updates, cache invalidation, background sync, and offline persistence
- **Automatic Synchronization**: Background sync when network becomes available with conflict resolution
- **Network Detection**: Real-time connectivity monitoring with automatic fallback behavior
- **Secure Storage**: JWT tokens in Expo SecureStore (not localStorage)
- **Mobile-First Design**: 48dp touch targets, responsive layouts, foldable device support
- **Network Resilience**: Hardened API service with retry logic and error normalization
- **Type Safety**: Full TypeScript coverage with strict type checking

### 🎯 Phase 5+ Roadmap: Final Feature Parity (~15% Remaining)

**Current Focus:** Implementing final advanced features to achieve 100% web app parity

#### High Priority Missing Features:

- **AI Optimization Engine**: Recipe analysis and improvement suggestions
- **Advanced Analytics**: Brewing dashboard and comprehensive reporting
- **Advanced Ingredient Management**: Enhanced search and filtering capabilities
- **Push Notifications**: Real-time brew session reminders and alerts

## Contributing

This is a companion app to the main BrewTracker project. Follow the same contribution guidelines as the main project.

## License

GPL-3.0-or-later - Same as the main BrewTracker project.
