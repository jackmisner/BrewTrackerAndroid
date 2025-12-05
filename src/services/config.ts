/**
 * API Configuration for BrewTracker mobile app
 *
 * Central configuration for all network requests, storage keys, and API endpoints.
 * Uses environment variables for deployment-specific settings with local dev fallbacks.
 */

/**
 * Main API configuration object
 * Configures base URL, timeouts, retry logic, and debug settings
 */
export const API_CONFIG = {
  // Use environment variable or fallback to local development
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5000/api",
  TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  DEBUG_MODE: process.env.EXPO_PUBLIC_DEBUG_MODE === "true",
  LOG_LEVEL: process.env.EXPO_PUBLIC_LOG_LEVEL || "info",
};

/**
 * Authentication configuration
 * Timeout settings for auth initialization to prevent blocking on slow networks
 */
export const AUTH_CONFIG = {
  // Device token exchange timeout (quick login)
  DEVICE_TOKEN_TIMEOUT: 3000, // 3 seconds
  // Profile fetch timeout during initialization
  PROFILE_FETCH_TIMEOUT: 5000, // 5 seconds
} as const;

/** React Query client configuration
 * Default settings for query caching, garbage collection, and network timeouts
 */
export const QUERY_CLIENT_CONFIG = {
  DEFAULT_STALE_TIME: 15 * 60 * 1000, // 15 minutes
  DEFAULT_GC_TIME: Infinity, // Keep data indefinitely for offline access
  NETWORK_TIMEOUT: 5000, // 5 seconds
  MAX_RETRIES: 2, // Retry failed requests twice
} as const;

/** React Query client mutation configuration
 * Settings specific to mutation CRUD operations
 */
export const QUERY_CLIENT_MUTATIONS_CONFIG = {
  NETWORK_TIMEOUT: 5000, // 5 seconds
  MAX_RETRIES: 1, // Retry failed mutations once
} as const;

/**
 * Storage keys for secure storage
 * All user data and authentication tokens are stored using these keys
 * Uses SecureStore on mobile for enhanced security
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  USER_DATA: "user_data",
  USER_SETTINGS: "user_settings",
  OFFLINE_RECIPES: "offline_recipes",
  OFFLINE_CACHE: "offline_cache",
  CACHED_INGREDIENTS: "cached_ingredients",
  LAST_SYNC: "last_sync",
  NETWORK_STATE: "network_state",
  // Biometric authentication (token-based, not password-based)
  BIOMETRIC_ENABLED: "biometric_enabled",
  BIOMETRIC_USERNAME: "biometric_username",
  BIOMETRIC_DEVICE_TOKEN: "biometric_device_token", // Long-lived refresh token
  BIOMETRIC_DEVICE_ID: "biometric_device_id", // Unique device identifier
} as const;

/**
 * Centralized API endpoint definitions
 * Organizes all backend routes by functional area for easy maintenance
 */
export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    GOOGLE_AUTH: "/auth/google",
    PROFILE: "/auth/profile",
    VERIFY_EMAIL: "/auth/verify-email",
    RESEND_VERIFICATION: "/auth/resend-verification",
    VALIDATE_USERNAME: "/auth/validate-username",
    VERIFICATION_STATUS: "/auth/verification-status",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    REFRESH_TOKEN: "/auth/refresh-token",
    // Biometric authentication (device tokens)
    CREATE_DEVICE_TOKEN: "/auth/device-token",
    BIOMETRIC_LOGIN: "/auth/biometric-login",
    LIST_DEVICE_TOKENS: "/auth/device-tokens",
    REVOKE_DEVICE_TOKEN: (deviceId: string) =>
      `/auth/device-tokens/${deviceId}`,
    REVOKE_ALL_DEVICE_TOKENS: "/auth/device-tokens/revoke-all",
  },

  // User
  USER: {
    SETTINGS: "/user/settings",
    PROFILE: "/user/profile",
    CHANGE_PASSWORD: "/user/change-password",
    DELETE_ACCOUNT: "/user/delete-account",
  },

  // Recipes
  RECIPES: {
    LIST: "/recipes",
    DETAIL: (id: string) => `/recipes/${id}`,
    CREATE: "/recipes",
    UPDATE: (id: string) => `/recipes/${id}`,
    DELETE: (id: string) => `/recipes/${id}`,
    CLONE: (id: string) => `/recipes/${id}/clone`,
    CLONE_PUBLIC: (id: string) => `/recipes/${id}/clone-public`,
    METRICS: (id: string) => `/recipes/${id}/metrics`,
    CALCULATE_PREVIEW: "/recipes/calculate-metrics-preview",
    VERSIONS: (id: string) => `/recipes/${id}/versions`,
    BREW_SESSIONS: (id: string) => `/recipes/${id}/brew-sessions`,
    PUBLIC: "/recipes/public",
  },

  // Beer Styles
  BEER_STYLES: {
    LIST: "/beer-styles",
    DETAIL: (id: string) => `/beer-styles/${id}`,
    SEARCH: "/beer-styles/search",
    SUGGESTIONS: (recipeId: string) => `/beer-styles/suggestions/${recipeId}`,
    ANALYSIS: (recipeId: string) => `/beer-styles/analysis/${recipeId}`,
    VERSION: "/beer-styles/version",
  },

  // Ingredients
  INGREDIENTS: {
    LIST: "/ingredients",
    DETAIL: (id: string) => `/ingredients/${id}`,
    CREATE: "/ingredients",
    UPDATE: (id: string) => `/ingredients/${id}`,
    DELETE: (id: string) => `/ingredients/${id}`,
    RECIPES: (id: string) => `/ingredients/${id}/recipes`,
    VERSION: "/ingredients/version",
  },

  // Brew Sessions
  BREW_SESSIONS: {
    LIST: "/brew-sessions",
    DETAIL: (id: string) => `/brew-sessions/${id}`,
    CREATE: "/brew-sessions",
    UPDATE: (id: string) => `/brew-sessions/${id}`,
    DELETE: (id: string) => `/brew-sessions/${id}`,
    FERMENTATION: (id: string) => `/brew-sessions/${id}/fermentation`,
    FERMENTATION_ENTRY: (id: string, index: number) =>
      `/brew-sessions/${id}/fermentation/${index}`,
    FERMENTATION_STATS: (id: string) =>
      `/brew-sessions/${id}/fermentation/stats`,
    ANALYZE_COMPLETION: (id: string) =>
      `/brew-sessions/${id}/fermentation/analyze-completion`,
    DRY_HOPS: (id: string) => `/brew-sessions/${id}/dry-hops`,
    DRY_HOP_ENTRY: (id: string, index: number) =>
      `/brew-sessions/${id}/dry-hops/${index}`,
  },

  // BeerXML
  BEERXML: {
    EXPORT: (recipeId: string) => `/beerxml/export/${recipeId}`,
    PARSE: "/beerxml/parse",
    MATCH_INGREDIENTS: "/beerxml/match-ingredients",
    CREATE_INGREDIENTS: "/beerxml/create-ingredients",
    CONVERT_RECIPE: "/beerxml/convert-recipe",
  },

  // AI
  AI: {
    ANALYZE_RECIPE: "/ai/analyze-recipe",
    HEALTH: "/ai/health",
  },

  // Dashboard
  DASHBOARD: {
    DATA: "/dashboard",
  },
} as const;
