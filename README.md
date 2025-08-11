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
│   │   ├── (recipes)/                                # Recipe-related detail and creation screens
│   │   │   ├── _layout.tsx                           # Recipe modals layout
│   │   │   ├── viewRecipe.tsx                        # Individual recipe detail view with ingredients and metrics
│   │   │   ├── createRecipe.tsx                      # Multi-step recipe creation wizard
│   │   │   ├── editRecipe.tsx                        # Recipe editing interface
│   │   │   └── ingredientPicker.tsx                  # Full-screen ingredient selection with search and filtering
│   │   ├── (brewSessions)/                           # Brew session detail screens
│   │   │   ├── _layout.tsx                           # Brew session modals layout
│   │   │   └── viewBrewSession.tsx                   # Individual brew session detail view with metrics and status
│   │   └── (settings)/                               # Settings screens
│   │       ├── _layout.tsx                           # Settings modals layout
│   │       └── settings.tsx                          # User settings and preferences
│   ├── index.tsx                                     # Entry point with auth routing
│   └── _layout.tsx                                   # Root layout with AuthProvider and QueryClient
├── src/                                              # Source code for React Native components and services
│   ├── components/                                   # Reusable UI components organized by feature
│   │   ├── brewSessions/                             # Brew session specific components
│   │   │   └── FermentationChart.tsx                 # Interactive fermentation tracking charts with dual-axis
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
│   │           └── RecipeContextMenu.tsx             # Recipe-specific context menu actions
│   ├── contexts/                                     # React contexts for global state
│   │   ├── AuthContext.tsx                           # Authentication context with secure token storage
│   │   ├── ThemeContext.tsx                          # Theme management with light/dark mode support
│   │   └── UnitContext.tsx                           # Unit system management (imperial/metric)
│   ├── hooks/                                        # Custom React hooks
│   │   ├── useBeerStyles.ts                          # Beer style data fetching and management
│   │   ├── useDebounce.ts                            # Performance optimization for search inputs
│   │   └── useRecipeMetrics.ts                       # Real-time recipe calculations hook
│   ├── services/                                     # API services and business logic
│   │   ├── api/                                      # API layer with React Query integration
│   │   │   ├── apiService.ts                         # Hardened API service with validated base URL, timeout, error normalization, and retry logic
│   │   │   ├── queryClient.ts                        # React Query client configuration
│   │   │   └── idInterceptor.ts                      # MongoDB ObjectId to string normalization
│   │   └── config.ts                                 # Service configuration and constants
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
   expo build:android
   ```

### Google Play Store

1. Create a Google Play Console account
2. Configure signing keys and app details
3. Build AAB for Play Store:
   ```bash
   expo build:android -t app-bundle
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
  const recipe = await ApiService.recipes.getById('recipe-id');
} catch (error) {
  const normalized = ApiService.handleApiError(error);
  
  if (normalized.isRetryable) {
    // Will be automatically retried for GET requests
    console.log('Retrying request...');
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

## Current Status

**Version**: 0.6.3  
**Test Coverage**: 13.45% (with comprehensive test infrastructure)  
**Development Phase**: Phase 3 Complete, Phase 4 In Progress

## Features Status

### ✅ Completed (Phase 1, 2 & 3)

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

**Advanced Data Visualization:**

- Interactive fermentation tracking charts
- Real-time data visualization with dual-axis support
- Mobile-optimized chart interactions (pinch, zoom, toggle views)
- Theme-aware chart styling with light/dark mode support
- Unit system integration for temperature display
- Dynamic chart scaling and reference line support

### ✅ Completed (Phase 3)

**Enhanced Fermentation Tracking:**

- Interactive fermentation charts with react-native-gifted-charts
- Dual-axis visualization (gravity + temperature)
- Combined and separate chart views
- Reference lines for expected final gravity
- Mobile-optimized chart interactions
- Theme-aware chart styling
- Unit system integration (Celsius/Fahrenheit)
- Empty state handling for sessions without data

**Testing Infrastructure:**

- Comprehensive Jest test framework with React Native Testing Library
- Test coverage reporting with HTML output
- Mock implementations for Expo SecureStore and API services
- Path aliases in testing configuration
- CI-ready test scripts with coverage thresholds

**Development Improvements:**

- Enhanced TypeScript configuration
- Automated code formatting with Prettier
- ESLint configuration for React Native
- Version management scripts for package.json and app.json synchronization

### 🚧 In Progress (Phase 4 - Recipe Builder Foundation)

**Current Progress: 75% Complete (6/7 major components)**

**✅ Recently Completed Components:**

- **Full-Screen Ingredient Picker**: Complete ingredient selection with search, filtering, and detailed editing
- **Ingredient Detail Editor**: Advanced ingredient editing with hop timing, usage selection, and unit conversion
- **Shared Formatting Utilities**: Centralized constants and formatting functions across the app
- **Performance Optimizations**: Debounced API calls, optimized search, and React key fixes

**✅ Completed Earlier:**

- Multi-step Recipe Wizard with progress tracking
- Recipe input forms (Basic Info, Parameters, Review)
- Navigation integration with modal presentation
- Comprehensive styling system with theme support

**🔄 Currently Working On:**

- Real-time metrics calculation display
- Recipe creation API integration
- Enhanced form validation and error handling

**Priority Tasks Remaining:**

- Add real-time brewing calculations (IBU, ABV, SRM)
- Implement complete recipe creation workflow
- Add recipe editing capabilities

## 📋 Feature Disparity Analysis & Implementation Roadmap

### 🔍 Missing Features from BrewTracker Web Application

Based on comprehensive analysis, BrewTrackerAndroid is missing ~75% of web features across 11 functional areas:

#### 🔥 **HIGH PRIORITY - Core Functionality Gaps**

##### **1. Recipe Creation & Editing System** 🟡 **IN PROGRESS (Phase 4 - 60% Complete)**

**Web Features:**

- ✅ Advanced Recipe Builder with real-time calculations
- ✅ Interactive ingredient addition with autocomplete
- ✅ Recipe validation with brewing logic
- ✅ Recipe scaling with automatic recalculations
- ✅ Recipe versioning and change tracking
- ✅ Recipe templates and defaults
- ✅ BeerXML export functionality

**Android Status:** Multi-step creation wizard implemented with debounced ingredient picker. Real-time calculations, API integration, and editing pending.

**Recent Progress:**

- ✅ Multi-step recipe wizard (Basic Info → Parameters → Ingredients → Review)
- ✅ Form validation and error handling
- ✅ Beer style picker and efficiency presets
- ✅ Ingredient picker with debounced search (performance optimized)
- 🔄 Real-time metrics calculation integration
- ⏳ Recipe creation API endpoint integration

**Implementation Files:**

- `app/(modals)/(recipes)/createRecipe.tsx` - Multi-step wizard
- `app/(modals)/(recipes)/ingredientPicker.tsx` - Ingredient selection with search
- `src/components/recipes/RecipeForm/` - Form components (4 files)
- `src/styles/modals/createRecipeStyles.ts` - Theme-aware styling system

##### **2. Brew Session Creation & Management** ❌ **MISSING ENTIRELY**

**Web Features:**

- ✅ Create brew sessions from recipes
- ✅ Interactive brew session workflow
- ✅ Real-time efficiency calculations
- ✅ Fermentation data entry and tracking
- ✅ Dry hop addition scheduling
- ✅ Session status management (Planned → Active → Completed)
- ✅ Brewing notes and observations

**Android Status:** Can only VIEW brew sessions

##### **3. Ingredient Management System** ❌ **MISSING ENTIRELY**

**Web Features:**

- ✅ Complete ingredient database CRUD
- ✅ Custom ingredient creation
- ✅ Ingredient usage analytics
- ✅ Ingredient performance tracking
- ✅ Advanced ingredient search and filtering

**Android Status:** No ingredient management capabilities

#### 🤖 **MEDIUM PRIORITY - Advanced Features**

##### **4. AI-Powered Recipe Optimization** ❌ **COMPLETELY MISSING**

- Flowchart-based optimization engine
- Style compliance analysis
- Cascading effects understanding
- Multi-iteration optimization
- AI-powered suggestions and improvements

#### **5. BeerXML Import/Export System** ❌ **COMPLETELY MISSING**

- BeerXML file import with parsing
- Intelligent ingredient matching
- Automatic ingredient creation
- Recipe format conversion
- Import validation and error handling

#### **6. Advanced Analytics & Performance Tracking** ❌ **MOSTLY MISSING**

- Yeast attenuation analytics
- Real-world vs. theoretical performance comparison
- System-wide brewing statistics
- Recipe performance metrics
- Brewing efficiency tracking
- Historical data analysis

**Current:** Has basic fermentation charts only

### 📱 **MEDIUM-LOW PRIORITY - User Experience Features**

#### **7. Advanced Search & Discovery** ⚠️ **BASIC IMPLEMENTATION**

- Fuzzy search with advanced algorithms
- Advanced filtering by multiple criteria
- Recipe sorting and organization
- Tag-based organization
- Saved searches

**Current:** Has basic search only

#### **8. Recipe Sharing & Social Features** ⚠️ **VIEW-ONLY**

- Public recipe sharing
- Recipe rating system
- Community features
- Recipe cloning from public library
- Privacy controls

**Current:** Can browse but not share/rate

#### **9. Advanced Brewing Calculations** ❌ **MISSING**

- Real-time brewing calculations (IBU, ABV, SRM)
- Temperature corrections
- Hop utilization calculations
- Gravity calculations with efficiency
- Water chemistry calculations

### 🔧 **LOW PRIORITY - Technical & Admin Features**

#### **10. Data Management & Export** ❌ **MISSING**

- Complete data export capabilities
- Recipe backup and restore
- Data migration tools
- Bulk operations

#### **11. Advanced User Settings** ⚠️ **BASIC SETTINGS**

- Comprehensive brewing preferences
- Advanced unit system customization
- Calculation preferences
- Default recipe templates
- Brewing profile customization

**Current:** Basic theme/unit preferences only

#### **12. Help & Documentation System** ❌ **MISSING**

- Interactive help system
- Feature tutorials
- Brewing guides and references
- Troubleshooting guides

---

## 🎯 **Implementation Priority Roadmap**

### **Phase 4 (Immediate - Core Functionality)**

1. **Recipe Builder** - Mobile recipe creation interface
2. **Ingredient Selection** - Mobile ingredient picker and management
3. **Brew Session Creation** - Start new sessions from recipes
4. **Basic Data Entry** - Fermentation logging interface

### **Phase 5 (Short-term - Enhanced UX)**

1. **Recipe Editing** - Full CRUD operations for recipes
2. **Advanced Search** - Filtering and sorting improvements
3. **Session Management** - Edit sessions, update status
4. **Recipe Sharing** - Basic sharing capabilities

### **Phase 6 (Medium-term - Advanced Features)**

1. **BeerXML Import/Export** - File handling and format support
2. **Recipe Calculations** - Real-time brewing math
3. **Basic Analytics** - Performance tracking
4. **Recipe Cloning** - Clone from public library

### **Phase 7 (Long-term - AI & Advanced)**

1. **AI Optimization** - Mobile AI features
2. **Advanced Analytics** - Performance comparison
3. **Community Features** - Rating, reviews
4. **Data Export** - Backup and export capabilities

---

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
- ✅ No backend changes required for Phase 4-5

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
