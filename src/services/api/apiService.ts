/**
 * API Service for BrewTracker Android App
 *
 * Provides a comprehensive, type-safe interface to all backend endpoints.
 * Handles authentication, error normalization, retry logic, and automatic ID transformation.
 *
 * Features:
 * - Automatic JWT token management via SecureStore
 * - Automatic ID normalization between backend and frontend formats
 * - Retry logic for transient failures with exponential backoff
 * - Normalized error handling across all endpoints
 * - Type-safe request/response contracts
 *
 * @example
 * ```typescript
 * // Login and get user recipes
 * const loginResult = await ApiService.auth.login({ email, password });
 * const recipes = await ApiService.recipes.getAll();
 * ```
 */

import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";
import * as SecureStore from "expo-secure-store";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS, ENDPOINTS } from "@services/config";
import { setupIDInterceptors } from "./idInterceptor";
import {
  // Authentication types
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ValidateUsernameRequest,
  ValidateUsernameResponse,
  ProfileResponse,
  GoogleAuthRequest,
  GoogleAuthResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationResponse,
  VerificationStatusResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,

  // User types
  ChangePasswordRequest,
  DeleteAccountRequest,
  UserSettingsResponse,
  UpdateSettingsRequest,
  UpdateProfileRequest,

  // Recipe types
  RecipeResponse,
  RecipesListResponse,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  CloneRecipeResponse,
  ClonePublicRecipeResponse,
  RecipeMetricsResponse,
  CalculateMetricsPreviewRequest,
  CalculateMetricsPreviewResponse,
  RecipeVersionHistoryResponse,
  PublicRecipesResponse,
  RecipeSearchFilters,

  // Additional types needed
  RecipeIngredient,
  CreateRecipeIngredientData,
  Recipe,

  // Brew Session types
  BrewSessionResponse,
  BrewSessionsListResponse,
  CreateBrewSessionRequest,
  CreateBrewSessionResponse,
  UpdateBrewSessionRequest,
  UpdateBrewSessionResponse,
  CreateFermentationEntryRequest,
  CreateFermentationEntryResponse,
  UpdateFermentationEntryRequest,
  UpdateFermentationEntryResponse,
  FermentationEntriesResponse,
  FermentationStatsResponse,
  DashboardResponse,

  // Common types
  ID,
  IngredientType,
  StaticDataVersionResponse,
} from "@src/types";

/**
 * Validates and retrieves API configuration from environment variables
 * Ensures the API URL is properly formatted and accessible
 *
 * @returns Validated API configuration object
 * @throws Error if API URL is missing or invalid
 */
function validateAndGetApiConfig() {
  // For testing, allow override through global.__TEST_API_URL
  const baseURL =
    process.env.EXPO_PUBLIC_API_URL ||
    (typeof global !== "undefined" && (global as any).__TEST_API_URL) ||
    (process.env.NODE_ENV === "test" ? "http://localhost:5000/api" : null);

  if (!baseURL) {
    throw new Error(
      "API_URL environment variable is required. Please set EXPO_PUBLIC_API_URL in your .env file."
    );
  }

  // Validate URL format
  try {
    const url = new URL(baseURL);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`Invalid protocol: ${url.protocol}`);
    }
  } catch {
    throw new Error(
      `Invalid API_URL format: ${baseURL}. Please provide a valid URL.`
    );
  }

  // Ensure URL doesn't end with trailing slash for consistency
  const cleanBaseURL = baseURL.replace(/\/+$/, "");

  return {
    BASE_URL: cleanBaseURL,
    TIMEOUT: 15000, // 15 seconds - sensible timeout for mobile
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
  };
}

const API_CONFIG = validateAndGetApiConfig();

/**
 * Normalized error interface for consistent error handling across the app
 * Provides standardized error information regardless of the underlying error type
 */
interface NormalizedApiError {
  message: string;
  code?: string | number;
  status?: number;
  isNetworkError: boolean;
  isTimeout: boolean;
  isRetryable: boolean;
  originalError?: any;
}

/**
 * Normalizes any error into a consistent format for handling in UI components
 * Handles Axios errors, network errors, timeouts, and generic JavaScript errors
 *
 * @param error - Any error object or value
 * @returns Normalized error object with consistent structure
 */
function normalizeError(error: any): NormalizedApiError {
  // Default error structure
  const normalized: NormalizedApiError = {
    message: "An unexpected error occurred",
    isNetworkError: false,
    isTimeout: false,
    isRetryable: false,
    originalError: error,
  };

  // Handle Axios errors
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Network or timeout errors
    if (!axiosError.response) {
      normalized.isNetworkError = true;
      normalized.isRetryable = true;

      if (
        axiosError.code === "ECONNABORTED" ||
        axiosError.message.includes("timeout")
      ) {
        normalized.isTimeout = true;
        normalized.message =
          "Request timed out. Please check your connection and try again.";
      } else if (
        axiosError.code === "NETWORK_ERROR" ||
        axiosError.message.includes("Network Error")
      ) {
        normalized.message =
          "Network error. Please check your internet connection.";
      } else {
        normalized.message = "Unable to connect to server. Please try again.";
      }

      normalized.code = axiosError.code;
      return normalized;
    }

    // HTTP response errors
    const { response } = axiosError;
    normalized.status = response.status;

    // Handle specific HTTP status codes
    switch (response.status) {
      case 400:
        normalized.message = "Invalid request data. Please check your input.";
        break;
      case 401:
        normalized.message = "Authentication failed. Please log in again.";
        break;
      case 403:
        normalized.message =
          "Access denied. You don't have permission to perform this action.";
        break;
      case 404:
        normalized.message = "Resource not found.";
        break;
      case 409:
        normalized.message =
          "Conflict. The resource already exists or has been modified.";
        break;
      case 422:
        normalized.message = "Validation error. Please check your input.";
        break;
      case 429:
        normalized.message =
          "Too many requests. Please wait a moment and try again.";
        normalized.isRetryable = true;
        break;
      case 500:
        normalized.message = "Server error. Please try again later.";
        normalized.isRetryable = true;
        break;
      case 502:
      case 503:
      case 504:
        normalized.message =
          "Service temporarily unavailable. Please try again.";
        normalized.isRetryable = true;
        break;
      default:
        normalized.message = `Server error (${response.status}). Please try again.`;
        if (response.status >= 500) {
          normalized.isRetryable = true;
        }
    }

    // Try to extract more specific error message from response
    if (response.data && typeof response.data === "object") {
      const data = response.data as any;
      if (data.error && typeof data.error === "string") {
        normalized.message = data.error;
      } else if (data.message && typeof data.message === "string") {
        normalized.message = data.message;
      } else if (data.detail && typeof data.detail === "string") {
        normalized.message = data.detail;
      }
    }

    normalized.code = response.status;
    return normalized;
  }

  // Handle non-Axios errors
  if (error instanceof Error) {
    normalized.message = error.message;
  } else if (typeof error === "string") {
    normalized.message = error;
  }

  return normalized;
}

async function logApiError(normalizedError: NormalizedApiError, err: unknown) {
  // Check network status to avoid logging expected offline errors
  let isOffline = false;
  try {
    const networkState = await Promise.race([
      NetInfo.fetch(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("NetInfo timeout")), 1000)
      ),
    ]);
    isOffline = !(networkState as { isConnected: boolean }).isConnected;
  } catch {
    // Assume online if we can't determine network state
    isOffline = false;
  }

  // Suppress network errors when offline to improve UX
  if (
    isOffline &&
    (normalizedError.isNetworkError || normalizedError.isTimeout)
  ) {
    console.debug("Suppressed offline network error:", {
      message: normalizedError.message,
      code: normalizedError.code,
      status: normalizedError.status,
    });
    return;
  }

  const base: any = {
    message: normalizedError.message,
    status: normalizedError.status,
    code: normalizedError.code,
    isNetworkError: normalizedError.isNetworkError,
    isTimeout: normalizedError.isTimeout,
    networkStatus: isOffline ? "offline" : "online",
  };

  if (isAxiosError(err)) {
    const ax = err as AxiosError;
    const headers = (ax.config?.headers ?? {}) as Record<string, any>;
    // Redact and whitelist headers
    const safeHeaders: Record<string, any> = {};
    Object.entries(headers).forEach(([k, v]) => {
      const key = k.toLowerCase();
      const redact =
        key === "authorization" ||
        key === "cookie" ||
        key.startsWith("x-api-key") ||
        key.startsWith("x-amz-") ||
        key.includes("token");
      if (redact) {
        safeHeaders[k] = "[REDACTED]";
      } else if (key === "content-type" || key === "accept") {
        safeHeaders[k] = v;
      }
    });
    // Sanitize URL (remove query string)
    const rawUrl = ax.config?.url ?? "";
    let safeUrl = rawUrl;
    try {
      const u = new URL(rawUrl, API_CONFIG.BASE_URL);
      u.search = "";
      safeUrl = u.toString();
    } catch {
      safeUrl = rawUrl.split("?")[0];
    }
    base.request = {
      method: ax.config?.method,
      url: safeUrl,
      headers: safeHeaders,
    };
    base.response = {
      status: ax.response?.status,
    };
  }

  // Single consolidated log (only when not suppressed and not simulated offline)
  if (
    !base.message?.includes("Simulated offline") &&
    !(
      base.status === 404 &&
      base.request?.method === "delete" &&
      base.request?.url?.includes("/recipes/")
    )
  ) {
    console.error("API Error:", base);
  }
}

/**
 * Retry wrapper for idempotent requests with exponential backoff
 * Automatically retries failed requests for transient errors (network, timeout, 5xx)
 * Uses jittered exponential backoff to prevent thundering herd
 *
 * @param operation - The async operation to retry
 * @param isRetryable - Function to determine if error should be retried
 * @param maxAttempts - Maximum number of retry attempts
 * @param delay - Base delay between retries in milliseconds
 * @returns Promise resolving to operation result
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  isRetryable: (error: any) => boolean = error => {
    const normalized = normalizeError(error);
    return normalized.isRetryable;
  },
  maxAttempts: number = API_CONFIG.MAX_RETRIES,
  delay: number = API_CONFIG.RETRY_DELAY
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or if error is not retryable
      if (attempt === maxAttempts || !isRetryable(error)) {
        throw error;
      }

      // Exponential backoff with jitter
      const backoffDelay =
        delay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve =>
        setTimeout(resolve, Math.min(backoffDelay, 10000))
      );
    }
  }

  throw lastError;
}

// Create typed axios instance with hardened configuration
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  // Throw on any non-2xx so interceptors and withRetry can handle errors (401/429 included)
  validateStatus: (status: number) => status >= 200 && status < 300,
});

// Setup automatic ID normalization interceptors
setupIDInterceptors(api);

/**
 * Secure token management utilities for JWT authentication
 * Handles storage, retrieval, and cleanup of authentication tokens
 * Uses Expo SecureStore for secure token storage on device
 */
class TokenManager {
  /**
   * Retrieves the stored authentication token
   * @returns JWT token string or null if not found
   */
  static async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  /**
   * Stores a new authentication token securely
   * @param token - JWT token to store
   */
  static async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      console.error("Error setting token:", error);
      throw error;
    }
  }

  /**
   * Removes the stored authentication token (logout)
   */
  static async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }
}

/**
 * Developer mode utilities for API service
 */
class DeveloperModeManager {
  private static readonly NETWORK_SIMULATION_KEY = `${STORAGE_KEYS.USER_SETTINGS}_network_simulation`;

  /**
   * Check if we're in simulated offline mode
   */
  static async isSimulatedOffline(): Promise<boolean> {
    if (!__DEV__) {
      return false; // Only available in development
    }

    try {
      const storedMode = await AsyncStorage.getItem(
        this.NETWORK_SIMULATION_KEY
      );
      if (storedMode) {
        try {
          const mode = JSON.parse(storedMode);
          return mode === "offline";
        } catch {
          return storedMode === "offline";
        }
      }
      return false;
    } catch (error) {
      console.warn("Failed to check simulated offline mode:", error);
      return false;
    }
  }
}

// Request interceptor to add authentication token
api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    // Check for simulated offline mode in development
    if (__DEV__) {
      const isOffline = await DeveloperModeManager.isSimulatedOffline();
      if (isOffline) {
        // Allow auth requests to pass through even in simulated offline mode
        const isAuthRequest = config.url?.startsWith("/auth/");
        if (!isAuthRequest) {
          // Simulate network error to properly trigger offline behavior for non-auth requests
          const offlineError = new Error("Network request failed");
          (offlineError as any).code = "NETWORK_ERROR";
          (offlineError as any).message = "Simulated offline mode enabled";
          throw offlineError;
        }
      }
    }

    const token = await TokenManager.getToken();
    if (token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling and normalization
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  async (error: AxiosError): Promise<never> => {
    // Handle token expiration
    if (error.response?.status === 401) {
      await TokenManager.removeToken();
    }

    // Normalize the error before rejecting
    const normalizedError = normalizeError(error);

    // Log error details for debugging (only in development, skip 401 as they're expected)
    if (
      (__DEV__ || process.env.EXPO_PUBLIC_DEBUG_MODE === "true") &&
      normalizedError.status !== 401
    ) {
      await logApiError(normalizedError, error);
    }

    // Create enhanced error object that maintains compatibility while adding normalized data
    const enhancedError = Object.assign(error, {
      normalized: normalizedError,
    });

    return Promise.reject(enhancedError);
  }
);

/**
 * Main API Service object providing access to all BrewTracker backend endpoints
 *
 * Organized by functional areas (auth, user, recipes, brewSessions, etc.)
 * All methods return typed Axios responses and handle errors consistently
 *
 * Key features:
 * - Automatic authentication header injection
 * - ID normalization for all entities
 * - Retry logic for GET operations
 * - Comprehensive error handling
 * - Type safety for all requests/responses
 *
 * @example
 * ```typescript
 * // Authentication
 * await ApiService.auth.login({ email: 'user@example.com', password: 'password' });
 *
 * // Recipe management
 * const recipes = await ApiService.recipes.getAll(1, 20);
 * const newRecipe = await ApiService.recipes.create({ name: 'IPA', ... });
 *
 * // Brew session tracking
 * const sessions = await ApiService.brewSessions.getAll();
 * await ApiService.brewSessions.addFermentationEntry(sessionId, entryData);
 * ```
 */
const ApiService = {
  // Token management
  token: TokenManager,

  // Auth endpoints
  auth: {
    register: (
      userData: RegisterRequest
    ): Promise<AxiosResponse<RegisterResponse>> =>
      api.post(ENDPOINTS.AUTH.REGISTER, userData),

    login: (credentials: LoginRequest): Promise<AxiosResponse<LoginResponse>> =>
      api.post(ENDPOINTS.AUTH.LOGIN, credentials),

    googleAuth: (
      googleData: GoogleAuthRequest
    ): Promise<AxiosResponse<GoogleAuthResponse>> =>
      api.post(ENDPOINTS.AUTH.GOOGLE_AUTH, googleData),

    getProfile: (): Promise<AxiosResponse<ProfileResponse>> =>
      api.get(ENDPOINTS.AUTH.PROFILE),

    validateUsername: (
      data: ValidateUsernameRequest
    ): Promise<AxiosResponse<ValidateUsernameResponse>> =>
      api.post(ENDPOINTS.AUTH.VALIDATE_USERNAME, data),

    // Email verification endpoints
    verifyEmail: (
      data: VerifyEmailRequest
    ): Promise<AxiosResponse<VerifyEmailResponse>> =>
      api.post(ENDPOINTS.AUTH.VERIFY_EMAIL, data),

    resendVerification: (): Promise<
      AxiosResponse<ResendVerificationResponse>
    > => api.post(ENDPOINTS.AUTH.RESEND_VERIFICATION),

    getVerificationStatus: (): Promise<
      AxiosResponse<VerificationStatusResponse>
    > => api.get("/auth/verification-status"),

    // Password reset endpoints
    forgotPassword: (
      data: ForgotPasswordRequest
    ): Promise<AxiosResponse<ForgotPasswordResponse>> =>
      api.post("/auth/forgot-password", data),

    resetPassword: (
      data: ResetPasswordRequest
    ): Promise<AxiosResponse<ResetPasswordResponse>> =>
      api.post("/auth/reset-password", data),
  },

  // User settings endpoints
  user: {
    getSettings: (): Promise<AxiosResponse<UserSettingsResponse>> =>
      api.get(ENDPOINTS.USER.SETTINGS),

    updateSettings: (
      settingsData: UpdateSettingsRequest
    ): Promise<AxiosResponse<UserSettingsResponse>> =>
      api.put(ENDPOINTS.USER.SETTINGS, settingsData),

    updateProfile: (
      profileData: UpdateProfileRequest
    ): Promise<AxiosResponse<ProfileResponse>> =>
      api.put(ENDPOINTS.USER.PROFILE, profileData),

    changePassword: (
      passwordData: ChangePasswordRequest
    ): Promise<AxiosResponse<{ message: string }>> =>
      api.post(ENDPOINTS.USER.CHANGE_PASSWORD, passwordData),

    deleteAccount: (
      confirmationData: DeleteAccountRequest
    ): Promise<AxiosResponse<{ message: string }>> =>
      api.post(ENDPOINTS.USER.DELETE_ACCOUNT, confirmationData),
  },

  // Recipe endpoints
  recipes: {
    getAll: (
      page: number = 1,
      perPage: number = 10
    ): Promise<AxiosResponse<RecipesListResponse>> =>
      withRetry(() =>
        api.get(`${ENDPOINTS.RECIPES.LIST}?page=${page}&per_page=${perPage}`)
      ),

    getById: (id: ID): Promise<AxiosResponse<RecipeResponse>> =>
      withRetry(() => api.get(ENDPOINTS.RECIPES.DETAIL(id))),

    create: (
      recipeData: CreateRecipeRequest
    ): Promise<AxiosResponse<RecipeResponse>> =>
      api.post(ENDPOINTS.RECIPES.CREATE, recipeData),

    update: (
      id: ID,
      recipeData: UpdateRecipeRequest
    ): Promise<AxiosResponse<RecipeResponse>> =>
      api.put(ENDPOINTS.RECIPES.UPDATE(id), recipeData),

    delete: (id: ID): Promise<AxiosResponse<{ message: string }>> =>
      api.delete(ENDPOINTS.RECIPES.DELETE(id)),

    search: (
      query: string,
      page: number = 1,
      perPage: number = 10
    ): Promise<AxiosResponse<RecipesListResponse>> =>
      withRetry(() =>
        api.get(
          `/search/recipes?q=${encodeURIComponent(
            query
          )}&page=${page}&per_page=${perPage}`
        )
      ),

    calculateMetrics: (
      recipeId: ID
    ): Promise<AxiosResponse<RecipeMetricsResponse>> =>
      withRetry(() => api.get(ENDPOINTS.RECIPES.METRICS(recipeId))),

    calculateMetricsPreview: (
      recipeData: CalculateMetricsPreviewRequest
    ): Promise<AxiosResponse<CalculateMetricsPreviewResponse>> =>
      api.post(ENDPOINTS.RECIPES.CALCULATE_PREVIEW, recipeData),

    clone: (id: ID): Promise<AxiosResponse<CloneRecipeResponse>> =>
      api.post(ENDPOINTS.RECIPES.CLONE(id)),

    clonePublic: (
      id: ID,
      originalAuthor: string
    ): Promise<AxiosResponse<ClonePublicRecipeResponse>> =>
      api.post(ENDPOINTS.RECIPES.CLONE_PUBLIC(id), { originalAuthor }),

    getVersionHistory: (
      id: ID
    ): Promise<AxiosResponse<RecipeVersionHistoryResponse>> =>
      withRetry(() => api.get(ENDPOINTS.RECIPES.VERSIONS(id))),

    getPublic: (
      page: number = 1,
      perPage: number = 10,
      filters: RecipeSearchFilters = {}
    ): Promise<AxiosResponse<PublicRecipesResponse>> => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(filters.style && { style: filters.style }),
        ...(filters.search && { search: filters.search }),
      });
      return withRetry(() => api.get(`${ENDPOINTS.RECIPES.PUBLIC}?${params}`));
    },
  },

  // Brew sessions endpoints
  brewSessions: {
    getAll: (
      page: number = 1,
      perPage: number = 10
    ): Promise<AxiosResponse<BrewSessionsListResponse>> =>
      withRetry(() =>
        api.get(
          `${ENDPOINTS.BREW_SESSIONS.LIST}?page=${page}&per_page=${perPage}`
        )
      ),

    getById: (id: ID): Promise<AxiosResponse<BrewSessionResponse>> =>
      withRetry(() => api.get(ENDPOINTS.BREW_SESSIONS.DETAIL(id))),

    create: (
      brewSessionData: CreateBrewSessionRequest
    ): Promise<AxiosResponse<CreateBrewSessionResponse>> =>
      api.post(ENDPOINTS.BREW_SESSIONS.CREATE, brewSessionData),

    update: (
      id: ID,
      brewSessionData: UpdateBrewSessionRequest
    ): Promise<AxiosResponse<UpdateBrewSessionResponse>> =>
      api.put(ENDPOINTS.BREW_SESSIONS.UPDATE(id), brewSessionData),

    delete: (id: ID): Promise<AxiosResponse<{ message: string }>> =>
      api.delete(ENDPOINTS.BREW_SESSIONS.DELETE(id)),

    // Fermentation tracking
    getFermentationEntries: (
      brewSessionId: ID
    ): Promise<AxiosResponse<FermentationEntriesResponse>> =>
      withRetry(() =>
        api.get(ENDPOINTS.BREW_SESSIONS.FERMENTATION(brewSessionId))
      ),

    addFermentationEntry: (
      brewSessionId: ID,
      entryData: CreateFermentationEntryRequest
    ): Promise<AxiosResponse<CreateFermentationEntryResponse>> =>
      api.post(ENDPOINTS.BREW_SESSIONS.FERMENTATION(brewSessionId), entryData),

    updateFermentationEntry: (
      brewSessionId: ID,
      entryIndex: number,
      entryData: UpdateFermentationEntryRequest
    ): Promise<AxiosResponse<UpdateFermentationEntryResponse>> =>
      api.put(
        ENDPOINTS.BREW_SESSIONS.FERMENTATION_ENTRY(brewSessionId, entryIndex),
        entryData
      ),

    deleteFermentationEntry: (
      brewSessionId: ID,
      entryIndex: number
    ): Promise<AxiosResponse<{ message: string }>> =>
      api.delete(
        ENDPOINTS.BREW_SESSIONS.FERMENTATION_ENTRY(brewSessionId, entryIndex)
      ),

    getFermentationStats: (
      brewSessionId: ID
    ): Promise<AxiosResponse<FermentationStatsResponse>> =>
      withRetry(() =>
        api.get(ENDPOINTS.BREW_SESSIONS.FERMENTATION_STATS(brewSessionId))
      ),

    analyzeCompletion: (
      brewSessionId: ID
    ): Promise<
      AxiosResponse<{
        estimated_days_remaining: number;
        completion_probability: number;
      }>
    > =>
      withRetry(() =>
        api.get(ENDPOINTS.BREW_SESSIONS.ANALYZE_COMPLETION(brewSessionId))
      ),
  },

  // Beer styles endpoints
  beerStyles: {
    getAll: (): Promise<AxiosResponse<any>> =>
      withRetry(() => api.get(ENDPOINTS.BEER_STYLES.LIST)),
    getById: (id: ID): Promise<AxiosResponse<any>> =>
      withRetry(() => api.get(ENDPOINTS.BEER_STYLES.DETAIL(id))),
    search: (query: string): Promise<AxiosResponse<any>> =>
      withRetry(() =>
        api.get(
          `${ENDPOINTS.BEER_STYLES.SEARCH}?q=${encodeURIComponent(query)}`
        )
      ),

    getVersion: (): Promise<AxiosResponse<StaticDataVersionResponse>> =>
      withRetry(() => api.get(ENDPOINTS.BEER_STYLES.VERSION)),
  },

  // Ingredients endpoints
  ingredients: {
    getAll: (
      type?: IngredientType,
      search?: string,
      category?: string
    ): Promise<AxiosResponse<RecipeIngredient[]>> => {
      const params = new URLSearchParams();
      if (type) {
        params.append("type", type);
      }
      if (search) {
        params.append("search", search);
      }
      if (category) {
        params.append("category", category);
      }
      const queryString = params.toString();
      const url = `${ENDPOINTS.INGREDIENTS.LIST}${queryString ? `?${queryString}` : ""}`;

      // ID interceptors will automatically handle response transformation
      return withRetry(() => api.get(url))
        .then(response => {
          // Handle wrapped response format: {ingredients: [...], unit_system: "...", unit_preferences: {...}}
          if (
            response.data?.ingredients &&
            Array.isArray(response.data.ingredients)
          ) {
            // Add default values for picker ingredients (ID normalization already handled by interceptor)
            const ingredients = response.data.ingredients.map(
              (ingredient: any) => ({
                ...ingredient,
                amount: 0, // Default amount for picker ingredients
                unit: ingredient.suggested_unit || ingredient.unit || "lb", // Use suggested unit or default
              })
            );

            // Return with processed ingredients
            return {
              ...response,
              data: ingredients,
            };
          } else if (Array.isArray(response.data)) {
            // Handle direct array response (already ID normalized by interceptor)
            const ingredients = response.data.map((ingredient: any) => ({
              ...ingredient,
              amount: 0,
              unit: ingredient.suggested_unit || ingredient.unit || "lb",
            }));

            return {
              ...response,
              data: ingredients,
            };
          }

          // Return response as-is if no special processing needed
          return response;
        })
        .catch(error => {
          throw error;
        });
    },

    getById: (id: ID): Promise<AxiosResponse<RecipeIngredient>> =>
      withRetry(() => api.get(ENDPOINTS.INGREDIENTS.DETAIL(id))),

    create: (
      ingredientData: CreateRecipeIngredientData
    ): Promise<AxiosResponse<RecipeIngredient>> =>
      api.post(ENDPOINTS.INGREDIENTS.CREATE, ingredientData),

    update: (
      id: ID,
      ingredientData: Partial<CreateRecipeIngredientData>
    ): Promise<AxiosResponse<RecipeIngredient>> =>
      api.put(ENDPOINTS.INGREDIENTS.UPDATE(id), ingredientData),

    delete: (id: ID): Promise<AxiosResponse<{ message: string }>> =>
      api.delete(ENDPOINTS.INGREDIENTS.DELETE(id)),

    getRecipesUsingIngredient: (id: ID): Promise<AxiosResponse<Recipe[]>> =>
      withRetry(() => api.get(ENDPOINTS.INGREDIENTS.RECIPES(id))),

    getVersion: (): Promise<AxiosResponse<StaticDataVersionResponse>> =>
      withRetry(() => api.get(ENDPOINTS.INGREDIENTS.VERSION)),
  },

  // Dashboard endpoints
  dashboard: {
    getData: (): Promise<AxiosResponse<DashboardResponse>> =>
      withRetry(() => api.get(ENDPOINTS.DASHBOARD.DATA)),
  },

  // BeerXML endpoints
  beerxml: {
    export: (
      recipeId: ID
    ): Promise<
      AxiosResponse<{ xml: string; xml_content: string; filename: string }>
    > => withRetry(() => api.get(ENDPOINTS.BEERXML.EXPORT(recipeId))),

    parse: (data: {
      xml_content: string;
    }): Promise<AxiosResponse<{ recipes: any[] }>> =>
      api.post(ENDPOINTS.BEERXML.PARSE, data),

    matchIngredients: (data: {
      ingredients: any[];
    }): Promise<AxiosResponse<{ matching_results: any[] }>> =>
      api.post(ENDPOINTS.BEERXML.MATCH_INGREDIENTS, data),

    createIngredients: (data: {
      ingredients: any[];
    }): Promise<AxiosResponse<{ created_ingredients: any[] }>> =>
      api.post(ENDPOINTS.BEERXML.CREATE_INGREDIENTS, data),
  },

  // Network status check
  checkConnection: async (): Promise<boolean> => {
    try {
      const response = await api.get("/health", { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  // Utility for handling API errors in components
  handleApiError: (error: any): NormalizedApiError => {
    if (error && error.normalized) {
      return error.normalized;
    }
    return normalizeError(error);
  },

  // Cancel all pending requests
  cancelAllRequests: (): void => {
    // Implementation would cancel all pending axios requests
    // This is useful for cleanup when the app goes to background
  },
};

export default ApiService;
