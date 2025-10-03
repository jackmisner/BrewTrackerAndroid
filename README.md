# BrewTracker Android

A production-ready React Native mobile app for the BrewTracker homebrewing platform, built with Expo. Features comprehensive offline-first architecture, advanced brewing tools, and seamless synchronization with the Flask backend.

**Version:** 2.4.10 | **Platform:** Android | **Architecture:** React Native 0.81.4 + Expo 54

## 📚 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Offline Functionality](#offline-functionality)
- [Development Achievements](#development-achievements--architecture)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality

- **Recipe Management**: Create, edit, delete, and clone recipes with 4-step wizard
- **Brew Session Tracking**: Track brewing sessions with fermentation data and interactive charts
- **BeerXML Support**: Import and export recipes with ingredient matching workflow
- **Version History**: Track recipe versions with visual timeline and navigation
- **Brewing Calculators**: ABV, dilution, strike water, hydrometer correction, unit converter, boil timer

### Offline-First Architecture

- **Complete Offline Support**: Work without internet connection
- **Automatic Synchronization**: Background sync when network returns
- **Version-Based Caching**: Smart cache invalidation for ingredients and beer styles
- **Conflict Resolution**: Last-write-wins strategy for concurrent edits
- **Pending Operation Queue**: Retry logic with exponential backoff

### User Experience

- **Theme Support**: Light/dark mode with automatic system detection
- **Touch-Optimized**: 48dp touch targets for comfortable mobile interaction
- **Context Menus**: Long-press actions for recipes and brew sessions
- **Gesture Navigation**: Swipe gestures and smooth animations
- **Responsive Design**: Support for various screen sizes including foldables

### Security & Authentication

- **JWT Authentication**: Secure token storage in Expo SecureStore
- **Email Verification**: Complete registration flow with email confirmation
- **Password Reset**: Forgot password workflow with token validation
- **Secure API**: Hardened API service with retry logic and error normalization

### Brewing Tools

- **Real-Time Calculations**: Live recipe metrics as you edit
- **Fermentation Tracking**: Interactive charts with dual-axis display
- **Dry Hop Tracker**: Track hop additions during fermentation
- **Ingredient Database**: Search and filter comprehensive ingredient library
- **Unit Conversion**: Seamless imperial/metric conversion

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Device or Emulator**: Physical device or Android Studio
- **BrewTracker Backend**: Flask backend must be running (see main project README)

### Installation & Setup

```bash
# 1. Navigate to the project directory
cd BrewTrackerAndroid

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Update .env with your backend IP address
# For physical devices:
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
# For Android emulators:
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api

# 5. Start the Flask backend with network access
# (In the BrewTracker backend directory)
flask run --host=0.0.0.0

# 6. Start the Expo development server
npm start
```

### Development Workflow

```bash
# Run type checking
npm run type-check

# Run linter (oxlint - 100x faster)
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run coverage

# Format code
npm run format
```

### First Time Setup

1. **Physical Device**: Install Expo Go from Google Play Store
2. **Scan QR Code**: Use Expo Go to scan the QR code from `npm start`
3. **Android Emulator**: Press 'a' in the terminal after `npm start`
4. **Create Account**: Register a new account in the app
5. **Verify Email**: Check your email for verification link (if backend email is configured)

## Architecture

## Project Structure

```
BrewTrackerAndroid/                                   # React Native Android application
├── app/                                              # Expo Router file-based routing structure
│   ├── (auth)/                                       # Authentication flow screens
│   │   ├── _layout.tsx                               # Authentication stack layout configuration
│   │   ├── login.tsx                                 # Login screen with JWT authentication and navigation
│   │   ├── register.tsx                              # User registration with real-time validation
│   │   ├── verifyEmail.tsx                           # Email verification with token input and resend functionality
│   │   ├── forgotPassword.tsx                        # Password reset request with email validation
│   │   └── resetPassword.tsx                         # Password reset confirmation with token validation
│   ├── (tabs)/                                       # Main application tab navigation
│   │   ├── _layout.tsx                               # Tab navigation layout with Material Icons
│   │   ├── index.tsx                                 # Dashboard/home screen with brewing overview and recent activity
│   │   ├── recipes.tsx                               # Recipe management and browsing with search and filtering
│   │   ├── brewSessions.tsx                          # Brew session tracking and management with status filtering
│   │   ├── utilities.tsx                             # Brewing calculators and utility tools grid
│   │   └── profile.tsx                               # User profile and settings with secure logout
│   ├── (modals)/                                     # Modal/detail screens (not in tab navigation)
│   │   ├── _layout.tsx                               # Modal navigation layout configuration
│   │   ├── (recipes)/                                # Recipe-related detail and creation screens
│   │   │   ├── _layout.tsx                           # Recipe modals stack layout
│   │   │   ├── viewRecipe.tsx                        # Individual recipe detail view with ingredients and metrics
│   │   │   ├── createRecipe.tsx                      # Multi-step recipe creation wizard (4 steps)
│   │   │   ├── editRecipe/[id].tsx                   # Recipe editing interface with dynamic route parameter
│   │   │   ├── versionHistory.tsx                    # Recipe version history timeline navigation
│   │   │   └── ingredientPicker.tsx                  # Full-screen ingredient selection with search and filtering
│   │   ├── (beerxml)/                                # BeerXML import/export workflow screens
│   │   │   ├── importBeerXML.tsx                     # BeerXML file selection and parsing
│   │   │   ├── ingredientMatching.tsx                # Ingredient matching and approval workflow
│   │   │   └── importReview.tsx                      # Final import review and recipe creation
│   │   ├── (brewSessions)/                           # Brew session detail screens
│   │   │   ├── _layout.tsx                           # Brew session modals stack layout
│   │   │   ├── viewBrewSession.tsx                   # Individual brew session detail view with metrics and status
│   │   │   ├── createBrewSession.tsx                 # Multi-step brew session creation wizard
│   │   │   ├── editBrewSession/[id].tsx              # Brew session editing interface with dynamic route parameter
│   │   │   ├── addFermentationEntry.tsx              # Add new fermentation data entries with validation
│   │   │   └── editFermentationEntry/[id].tsx        # Fermentation entry editing interface with dynamic route parameter
│   │   ├── (calculators)/                            # Brewing calculator tools
│   │   │   ├── _layout.tsx                           # Calculator modals stack layout
│   │   │   ├── abv.tsx                               # ABV (Alcohol by Volume) calculator
│   │   │   ├── dilution.tsx                          # Water dilution calculator
│   │   │   ├── strikeWater.tsx                       # Strike water temperature calculator
│   │   │   ├── hydrometerCorrection.tsx              # Hydrometer temperature correction calculator
│   │   │   ├── unitConverter.tsx                     # Unit conversion calculator (volume, weight, temperature)
│   │   │   └── boilTimer.tsx                         # Boil timer with hop addition alerts and notifications
│   │   └── (settings)/                               # Settings screens
│   │       ├── _layout.tsx                           # Settings modals stack layout
│   │       └── settings.tsx                          # User settings and preferences (units, theme, notifications)
│   ├── index.tsx                                     # Entry point with auth routing and splash screen
│   └── _layout.tsx                                   # Root layout with providers (Auth, Theme, Network, Query)
├── src/                                              # Source code for React Native components and services
│   ├── components/                                   # Reusable UI components organized by feature
│   │   ├── boilTimer/                                # Boil timer specific components
│   │   │   └── RecipeSelector.tsx                    # Recipe selection component for boil timer with search
│   │   ├── brewSessions/                             # Brew session specific components
│   │   │   ├── DryHopTracker.tsx                     # Dry hop additions tracker with schedule display
│   │   │   ├── FermentationChart.tsx                 # Interactive fermentation tracking charts with dual-axis
│   │   │   ├── FermentationData.tsx                  # Fermentation data display and management component
│   │   │   └── FermentationEntryContextMenu.tsx      # Context menu for fermentation entry actions
│   │   ├── calculators/                              # Brewing calculator components
│   │   │   ├── CalculatorCard.tsx                    # Reusable calculator card component for utilities screen
│   │   │   ├── CalculatorHeader.tsx                  # Standard calculator header with title and description
│   │   │   ├── ResultDisplay.tsx                     # Standardized result display component for calculations
│   │   │   ├── UnitToggle.tsx                        # Unit system toggle component for calculator inputs
│   │   │   └── NumberInput.tsx                       # Specialized number input component for calculator forms
│   │   ├── debug/                                    # Debug and development components
│   │   │   └── DevIdDebugger.tsx                     # Development ID debugging component for troubleshooting
│   │   ├── recipes/                                  # Recipe management components
│   │   │   ├── BrewingMetrics/                       # Recipe metrics display components
│   │   │   │   └── BrewingMetricsDisplay.tsx         # Reusable brewing metrics with SRM color visualization
│   │   │   ├── IngredientEditor/                     # Advanced ingredient editing components
│   │   │   │   └── IngredientDetailEditor.tsx        # Complete ingredient editing with type-specific UI
│   │   │   └── RecipeForm/                           # Multi-step recipe creation forms
│   │   │       ├── BasicInfoForm.tsx                 # Recipe name, style, batch size input (Step 1)
│   │   │       ├── ParametersForm.tsx                # Brewing parameters (boil time, efficiency, mash temp) (Step 2)
│   │   │       ├── IngredientsForm.tsx               # Ingredient list management interface (Step 3)
│   │   │       └── ReviewForm.tsx                    # Final recipe review and submission (Step 4)
│   │   ├── splash/                                   # Splash screen components
│   │   │   └── SplashScreen.tsx                      # App loading splash screen component with animations
│   │   ├── ui/                                       # Generic UI components
│   │   │   ├── ContextMenu/                          # Context menu implementations
│   │   │   │   ├── BaseContextMenu.tsx               # Base context menu component with common functionality
│   │   │   │   ├── RecipeContextMenu.tsx             # Recipe-specific context menu actions (view, edit, delete, clone, version)
│   │   │   │   ├── BrewSessionContextMenu.tsx        # Brew session-specific context menu actions (view, edit, delete)
│   │   │   │   └── contextMenuUtils.ts               # Shared utilities for context menu operations
│   │   │   └── ModalHeader.tsx                       # Reusable modal header component with close button
│   │   └── NetworkStatusBanner.tsx                   # Network connectivity status banner component with online/offline indicator
│   ├── contexts/                                     # React contexts for global state
│   │   ├── AuthContext.tsx                           # Authentication context with secure token storage (JWT in SecureStore)
│   │   ├── CalculatorsContext.tsx                    # Calculator state management and shared logic with useReducer
│   │   ├── DeveloperContext.tsx                      # Developer options and debugging context for dev mode
│   │   ├── NetworkContext.tsx                        # Network connectivity detection for offline functionality (NetInfo)
│   │   ├── ScreenDimensionsContext.tsx               # Screen dimensions management with support for foldable devices
│   │   ├── ThemeContext.tsx                          # Theme management with light/dark mode support
│   │   └── UnitContext.tsx                           # Unit system management (imperial/metric) with AsyncStorage persistence
│   ├── hooks/                                        # Custom React hooks
│   │   ├── offlineV2/                                # V2 offline system hooks
│   │   │   ├── index.ts                              # Centralized exports for V2 offline hooks
│   │   │   ├── useStaticData.ts                      # Offline-first ingredients and beer styles management
│   │   │   ├── useUserData.ts                        # Offline-first user data (recipes) management with sync
│   │   │   ├── useOfflineSync.ts                     # Sync status monitoring and manual sync triggers
│   │   │   └── useStartupHydration.ts                # App startup data hydration and cache warming
│   │   ├── useDebounce.ts                            # Performance optimization for search inputs (300ms debounce)
│   │   ├── useRecipeMetrics.ts                       # Real-time recipe calculations hook (OG, FG, ABV, IBU, SRM)
│   │   └── useStoragePermissions.ts                  # Storage permission management for file operations
│   ├── services/                                     # API services and business logic
│   │   ├── api/                                      # API layer with React Query integration
│   │   │   ├── apiService.ts                         # Hardened API service with validated base URL, timeout, error normalization, and retry logic
│   │   │   ├── queryClient.ts                        # React Query client configuration with AsyncStorage persistence
│   │   │   └── idInterceptor.ts                      # MongoDB ObjectId to string normalization for consistent IDs
│   │   ├── beerxml/                                  # BeerXML processing services
│   │   │   └── BeerXMLService.ts                     # BeerXML import/export with mobile file integration (expo-document-picker)
│   │   ├── offlineV2/                                # V2 offline system services
│   │   │   ├── index.ts                              # Centralized exports for V2 offline services
│   │   │   ├── StaticDataService.ts                  # Permanent caching of ingredients/beer styles with version-based invalidation
│   │   │   ├── UserCacheService.ts                   # Offline-first user data CRUD with sync queue and conflict resolution
│   │   │   ├── LegacyMigrationService.ts             # Migration utilities for V1 to V2 system transition
│   │   │   └── StartupHydrationService.ts            # App startup data hydration and cache warming system
│   │   ├── brewing/                                  # Brewing-specific services
│   │   │   └── OfflineMetricsCalculator.ts           # Offline brewing calculations and recipe metrics (OG, FG, ABV, IBU, SRM)
│   │   ├── logger/                                   # Logging and debugging services
│   │   │   ├── Logger.ts                             # Base logging service interface
│   │   │   ├── UnifiedLogger.ts                      # Unified logging with development and production modes
│   │   │   └── DevLogger.ts                          # Development-specific logging with endpoint integration
│   │   ├── debug/                                    # Debugging utilities
│   │   │   └── DebugHelpers.ts                       # Development debugging and troubleshooting utilities
│   │   ├── calculators/                              # Brewing calculation services
│   │   │   ├── ABVCalculator.ts                      # Alcohol by Volume calculation logic
│   │   │   ├── BoilTimerCalculator.ts                # Boil timer and hop addition scheduling
│   │   │   ├── DilutionCalculator.ts                 # Water dilution and blending calculations
│   │   │   ├── EfficiencyCalculator.ts               # Mash and brewhouse efficiency calculations
│   │   │   ├── HydrometerCorrectionCalculator.ts     # Temperature-corrected hydrometer readings
│   │   │   ├── PrimingSugarCalculator.ts             # Carbonation and priming sugar calculations
│   │   │   ├── StrikeWaterCalculator.ts              # Mash strike water temperature calculations
│   │   │   ├── UnitConverter.ts                      # Unit conversion utilities and logic (volume, weight, temperature)
│   │   │   └── YeastPitchRateCalculator.ts           # Yeast pitching rate and viability calculations
│   │   ├── config.ts                                 # Service configuration and constants (API URLs, timeouts)
│   │   ├── NotificationService.ts                    # Local notification service for timers and alerts (expo-notifications)
│   │   ├── storageService.ts                         # Storage service for file operations and permissions
│   │   └── TimerPersistenceService.ts                # Timer state persistence for boil timer (AsyncStorage)
│   ├── constants/                                    # Shared constants and configuration
│   │   ├── hopConstants.ts                           # Hop usage options, time presets, and type definitions
│   │   └── testIDs.ts                                # Centralized test IDs for consistent testing across components
│   ├── utils/                                        # Utility functions
│   │   ├── formatUtils.ts                            # Comprehensive brewing data formatting utilities
│   │   ├── idNormalization.ts                        # MongoDB ObjectId normalization utilities
│   │   ├── jwtUtils.ts                               # JWT token validation and management utilities
│   │   ├── keyUtils.ts                               # Secure key generation and management utilities
│   │   ├── recipeUtils.ts                            # Recipe data manipulation and transformation utilities
│   │   ├── syncUtils.ts                              # Offline sync utilities for conflict resolution
│   │   ├── timeUtils.ts                              # Time calculation and conversion utilities
│   │   └── userValidation.ts                         # User input validation utilities (email, password strength)
│   ├── types/                                        # TypeScript type definitions for mobile app
│   │   ├── api.ts                                    # API request/response interfaces
│   │   ├── common.ts                                 # Shared utility types
│   │   ├── recipe.ts                                 # Recipe and ingredient types
│   │   ├── brewSession.ts                            # Brew session and fermentation types
│   │   ├── user.ts                                   # User account and authentication types
│   │   ├── offlineV2.ts                              # V2 offline system type definitions
│   │   ├── logger.ts                                 # Logging system type definitions
│   │   ├── offline.ts                                # Legacy offline types (for migration compatibility)
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
│       │   ├── brewSessions/                         # Brew session component styles
│       │   │   └── dryHopTrackerStyles.ts            # Dry hop tracker component styling
│       │   ├── calculators/                          # Calculator component styles
│       │   │   ├── calculatorCardStyles.ts           # Calculator card component styling
│       │   │   ├── calculatorHeaderStyles.ts         # Calculator header component styling
│       │   │   ├── numberInputStyles.ts              # Number input component styling
│       │   │   ├── resultDisplayStyles.ts            # Result display component styling
│       │   │   └── unitToggleStyles.ts               # Unit toggle component styling
│       │   ├── charts/                               # Chart component styles
│       │   │   └── fermentationChartStyles.ts        # Fermentation chart styling
│       │   └── modalHeaderStyles.ts                  # Modal header component styling
│       ├── recipes/                                  # Recipe component styles
│       │   └── ingredientDetailEditorStyles.ts       # Ingredient editor styling
│       ├── ui/                                       # UI component styles
│       │   ├── baseContextMenuStyles.ts              # Base context menu styling
│       │   └── recipeContextMenuStyles.ts            # Recipe context menu styling
│       └── common/                                   # Shared styling utilities
│           ├── colors.ts                             # Theme color definitions (light/dark mode)
│           ├── buttons.ts                            # Reusable button styles
│           └── sharedStyles.ts                       # Common shared styling utilities
├── tests/                                            # Comprehensive test suite (3148 tests across 129 suites)
├── plugins/                                          # Expo config plugins
│   ├── withConditionalNetworkSecurity.js             # Network security configuration for development/production
│   └── withSingleTaskLaunchMode.js                   # Android launch mode configuration
├── scripts/                                          # Build and development scripts
│   ├── build-helper.js                               # Environment-specific build configuration
│   ├── build-info.js                                 # Display current build information
│   ├── bump-version.js                               # Version bumping script (patch/minor/major)
│   └── detect-ip.js                                  # Auto-detect local IP for development
├── assets/                                           # Static assets (images, fonts, icons)
├── app.json                                          # Expo configuration (Android-only, New Architecture enabled)
├── package.json                                      # Dependencies and scripts (v2.4.10)
├── eas.json                                          # EAS Build configuration (dev/preview/production)
├── eslint.config.js                                  # ESLint configuration (fallback linter)
├── .oxlintrc.json                                    # oxlint configuration (primary linter - 100x faster)
├── tsconfig.json                                     # TypeScript configuration with path aliases (@/, @services/, etc.)
├── jest.config.js                                    # Jest testing configuration
├── metro.config.js                                   # Metro bundler configuration
├── babel.config.js                                   # Babel configuration with module resolver
├── dev-log-server.js                                 # Development log server for mobile debugging
├── expo-env.d.ts                                     # Expo TypeScript environment definitions
├── LICENSE                                           # GPL-3.0-or-later license
├── LICENSE-HEADER.txt                                # License header for source files
└── .env                                              # Environment variables (API URL, debug mode, etc.)
```

### Key Technologies

**Core Framework:**

- **React 19.1.0**: Latest React with concurrent features
- **React Native 0.81.4**: Modern React Native with New Architecture enabled
- **Expo 54**: Complete development platform with OTA updates
- **TypeScript 5.9.2**: Full type safety with strict mode

**Navigation & State:**

- **Expo Router 6.0**: File-based navigation with typed routes
- **React Query 5.87**: Server state with offline persistence
- **Expo Secure Store**: Encrypted JWT token storage
- **AsyncStorage 2.2**: Local data persistence

**Offline & Network:**

- **NetInfo 11.4**: Network connectivity detection
- **Custom Offline V2 System**: Version-based caching with sync
- **Query Persistence**: AsyncStorage persister for React Query

**UI & Animation:**

- **React Native Reanimated 4.1**: High-performance animations
- **React Native Gesture Handler 2.28**: Touch and gesture handling
- **React Native Gifted Charts 1.4**: Interactive fermentation charts
- **@expo/vector-icons**: Material Icons for consistent UI

**Development Tools:**

- **oxlint 1.14**: Ultra-fast Rust-based linter (100x faster than ESLint)
- **Jest 29.7**: Testing framework with 3148 passing tests
- **Prettier 3.4**: Code formatting
- **EAS Build**: Production builds with OTA updates

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
- **Testing**: Comprehensive test suite with 3148 passing tests across 129 test suites
- **Test Coverage**: High coverage across all critical paths
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

### Production Build Scripts

The app includes automated build scripts for development, preview, and production builds:

```bash
# Build for development (includes debug tools)
npm run build:dev

# Build for preview (production mode with debug)
npm run build:preview

# Build for production (optimized release)
npm run build:prod

# Build all profiles
npm run build:all
```

### Environment Management

```bash
# Set development environment (auto-detects local IP)
npm run env:dev

# Set production environment (uses production API)
npm run env:prod

# Display current build information
npm run build:info
```

### EAS Build Configuration

The app uses Expo Application Services (EAS) for builds:

- **Development builds**: Include dev tools, connect to local backend
- **Preview builds**: Production mode with debugging enabled
- **Production builds**: Optimized for Google Play Store release

**Build Configuration:**

- Android package: `com.brewtracker.android`
- Version: 2.4.10 (build 149)
- Runtime version: 2.4.10
- OTA updates: Enabled via EAS Update
- New Architecture: Enabled for performance

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

## **Offline Functionality**

### **V2 System Complete: Comprehensive Offline-First Architecture** ✅

BrewTrackerAndroid features a fully implemented V2 offline-first system with comprehensive caching, version-based synchronization, and automatic conflict resolution, ensuring brewers can work seamlessly regardless of network connectivity.

#### **V2 System Capabilities**

**Complete Static Data Management:**

- **Permanent Caching**: Ingredients and beer styles cached indefinitely with version-based invalidation
- **Background Version Checking**: Automatic version comparison with 30-second cooldown periods
- **Smart Cache Updates**: Only downloads data when backend versions change
- **Instant Access**: Static data available immediately without network requests

**Advanced User Data Synchronization:**

- **Offline-First CRUD**: Complete recipe operations work without internet connection
- **Pending Operation Queue**: Offline changes queued with retry logic and exponential backoff
- **Conflict Resolution**: Last-write-wins strategy with timestamp-based merging
- **Tombstone Deletion**: Proper sync handling for deleted items

**Comprehensive Startup System:**

- **App Hydration**: Automatic cache warming and data preparation on app launch
- **Legacy Migration**: Seamless transition from V1 to V2 system with data preservation
- **Performance Optimization**: Efficient startup with background data loading

#### **V2 Technical Architecture**

**Core V2 Services:**

- `StaticDataService.ts` - Permanent caching with version-based invalidation for ingredients and beer styles
- `UserCacheService.ts` - Offline-first user data CRUD with sync queue and conflict resolution
- `StartupHydrationService.ts` - App startup data hydration and cache warming system
- `LegacyMigrationService.ts` - Migration utilities for V1 to V2 system transition

**Advanced React Hooks:**

- `useStaticData()` - Combined ingredients and beer styles management with background refresh
- `useUserData()` - User recipe CRUD with offline support and authentication
- `useOfflineSync()` - Sync status monitoring and manual sync triggers
- `useStartupHydration()` - App startup data hydration and cache management

**Robust Type System:**

- `offlineV2.ts` - Complete type definitions for caching, sync, and conflict resolution
- `logger.ts` - Comprehensive logging system types for debugging and monitoring

#### **V2 User Experience**

**Seamless Performance:**

- **Instant Responses**: All data operations respond immediately from local cache
- **Zero Loading States**: Cached static data eliminates loading spinners
- **Background Sync**: Network operations happen transparently without user interruption
- **Automatic Recovery**: Failed operations retry automatically when network improves

**Advanced Sync Management:**

- **Real-time Status**: Comprehensive sync status monitoring with user-friendly messages
- **Manual Control**: Optional manual sync triggers for immediate synchronization
- **Visual Indicators**: Clear indication of pending changes and sync progress
- **Error Recovery**: Automatic retry with user notification for persistent failures

#### **V2 Testing Coverage**

**Comprehensive Offline V2 Test Suite (126 Tests):**

- `StaticDataService.test.ts` (23 tests) - Version checking, caching, and filtering
- `UserCacheService.test.ts` (36 tests) - CRUD operations, sync queue, and conflict resolution
- `useStaticData.test.tsx` (25 tests) - Hook functionality and cache management
- `useUserData.test.tsx` (24 tests) - User data operations and sync integration
- `useOfflineSync.test.tsx` (18 tests) - Sync status monitoring and manual triggers
- Plus startup hydration, legacy migration, and integration tests

**Data Integrity & Performance:**

- **Version-Based Cache Invalidation**: Prevents stale data with backend version comparison
- **Offline Data Persistence**: All data survives app restarts and device reboots
- **Sync Conflict Resolution**: Robust handling of concurrent edits across devices
- **Performance Optimization**: Efficient cache management with memory and storage optimization

**Overall Test Suite:** 3148 passing tests across 129 test suites covering all features

---

## **Development Achievements & Architecture**

### **Phase 5 Completion Status: ~85% Feature Parity** ✅

### Core Features Complete

- **Authentication**: Complete login/register flow with email verification and secure JWT token storage in Expo SecureStore
- **Offline Recipe Management**: Complete offline-first recipe CRUD with automatic background synchronization
- **Recipe Cloning System**: Differentiated logic for private recipes (versioning) vs public recipes (attribution with original author)
- **Version History**: Complete timeline navigation with visual version tree and interactive browsing
- **BeerXML Import/Export**: 3-screen mobile workflow with ingredient matching, file sharing, and export functionality
- **Brew Session Tracking**: Full CRUD operations with comprehensive fermentation data management and interactive charts as well as Dry Hop tracking/management
- **Brewing Calculators**: ABV, dilution, strike water, hydrometer correction, unit converter, and boil timer with notifications
- **Advanced UI/UX**: Touch-optimized interface (48dp targets), context menus, gesture navigation, and comprehensive theme support
- **Testing Infrastructure**: 3148 passing tests across 129 test suites with comprehensive coverage

### Advanced Technical Features

- **V2 Offline-First Architecture**: Comprehensive caching with version-based invalidation and automatic sync
- **React Query Integration**: Optimistic updates, cache invalidation, background sync, and offline persistence
- **Automatic Synchronization**: Background sync when network becomes available with conflict resolution
- **Network Detection**: Real-time connectivity monitoring with automatic fallback behavior
- **Secure Storage**: JWT tokens in Expo SecureStore (not localStorage)
- **Mobile-First Design**: 48dp touch targets, responsive layouts, foldable device support
- **Network Resilience**: Hardened API service with retry logic and error normalization
- **Type Safety**: Full TypeScript coverage with strict type checking

### Phase 5+ Roadmap: Final Feature Parity (~15% Remaining)

**Current Focus:** Implementing final advanced features to achieve 100% web app parity

#### High Priority Missing Features:

- **AI Optimization Engine**: Recipe analysis and improvement suggestions
- **Advanced Analytics**: Brewing dashboard and comprehensive reporting
- **Advanced Ingredient Management**: Enhanced search and filtering capabilities
- **Push Notifications**: Real-time brew session reminders and alerts

## Contributing

This is a companion app to the main BrewTracker project. Follow the same contribution guidelines as the main project.

### Development Standards

- **TypeScript**: All code must pass `npm run type-check` with no errors
- **Linting**: Use `npm run lint` (oxlint) before committing
- **Testing**: Maintain high test coverage with meaningful tests
- **Code Style**: Use Prettier for consistent formatting (`npm run format`)
- **Commit Messages**: Clear, descriptive commit messages
- **Pull Requests**: Include tests and documentation for new features

### Testing Requirements

- All new features must include comprehensive tests
- Bug fixes should include regression tests
- Maintain >70% code coverage
- Tests must pass before merging: `npm test`

### Architecture Principles

- **Offline-First**: All features should work offline when possible
- **Type Safety**: Leverage TypeScript's strict type checking
- **Mobile-First**: Design for touch interaction and mobile networks
- **Performance**: Optimize for battery life and data usage
- **Security**: Follow secure coding practices, especially for authentication

## License

**GPL-3.0-or-later** - Same as the main BrewTracker project.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
