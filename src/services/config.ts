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
  },

  // BeerXML
  BEERXML: {
    EXPORT: (recipeId: string) => `/beerxml/export/${recipeId}`,
    PARSE: "/beerxml/parse",
    MATCH_INGREDIENTS: "/beerxml/match-ingredients",
    CREATE_INGREDIENTS: "/beerxml/create-ingredients",
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
