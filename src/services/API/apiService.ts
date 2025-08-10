import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import * as SecureStore from "expo-secure-store";
import { API_CONFIG, STORAGE_KEYS, ENDPOINTS } from "@services/config";
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
} from "@src/types";

// Create typed axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Setup automatic ID normalization interceptors
setupIDInterceptors(api);

// Token management utilities
class TokenManager {
  static async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  static async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      console.error("Error setting token:", error);
      throw error;
    }
  }

  static async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }
}

// Request interceptor to add authentication token
api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  async (error: AxiosError): Promise<AxiosError> => {
    // Handle token expiration
    if (error.response?.status === 401) {
      await TokenManager.removeToken();
      // You might want to trigger a navigation to login screen here
      // This would require passing a navigation callback or using a global event emitter
    }

    // Handle different error codes, including MongoDB-specific errors
    if (
      error.response?.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      console.error("API Error:", (error.response.data as any).error);
    }

    return Promise.reject(error);
  }
);

// Recipe search filters interface
interface RecipeSearchFilters {
  style?: string;
  search?: string;
}

// Type-safe API Service
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
      api.get(`${ENDPOINTS.RECIPES.LIST}?page=${page}&per_page=${perPage}`),

    getById: (id: ID): Promise<AxiosResponse<RecipeResponse>> =>
      api.get(ENDPOINTS.RECIPES.DETAIL(id)),

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
      api.get(
        `/search/recipes?q=${encodeURIComponent(
          query
        )}&page=${page}&per_page=${perPage}`
      ),

    calculateMetrics: (
      recipeId: ID
    ): Promise<AxiosResponse<RecipeMetricsResponse>> =>
      api.get(ENDPOINTS.RECIPES.METRICS(recipeId)),

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
      api.get(ENDPOINTS.RECIPES.VERSIONS(id)),

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
      return api.get(`${ENDPOINTS.RECIPES.PUBLIC}?${params}`);
    },
  },

  // Brew sessions endpoints
  brewSessions: {
    getAll: (
      page: number = 1,
      perPage: number = 10
    ): Promise<AxiosResponse<BrewSessionsListResponse>> =>
      api.get(
        `${ENDPOINTS.BREW_SESSIONS.LIST}?page=${page}&per_page=${perPage}`
      ),

    getById: (id: ID): Promise<AxiosResponse<BrewSessionResponse>> =>
      api.get(ENDPOINTS.BREW_SESSIONS.DETAIL(id)),

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
      api.get(ENDPOINTS.BREW_SESSIONS.FERMENTATION(brewSessionId)),

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
      api.get(ENDPOINTS.BREW_SESSIONS.FERMENTATION_STATS(brewSessionId)),

    analyzeCompletion: (
      brewSessionId: ID
    ): Promise<
      AxiosResponse<{
        estimated_days_remaining: number;
        completion_probability: number;
      }>
    > => api.get(ENDPOINTS.BREW_SESSIONS.ANALYZE_COMPLETION(brewSessionId)),
  },

  // Ingredients endpoints
  ingredients: {
    getAll: (
      type?: IngredientType,
      search?: string
    ): Promise<AxiosResponse<RecipeIngredient[]>> => {
      const params = new URLSearchParams();
      if (type) params.append("type", type);
      if (search) params.append("search", search);
      const queryString = params.toString();
      const url = `${ENDPOINTS.INGREDIENTS.LIST}${queryString ? `?${queryString}` : ""}`;

      // ID interceptors will automatically handle response transformation
      return api
        .get(url)
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
      api.get(ENDPOINTS.INGREDIENTS.DETAIL(id)),

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
      api.get(ENDPOINTS.INGREDIENTS.RECIPES(id)),
  },

  // Dashboard endpoints
  dashboard: {
    getData: (): Promise<AxiosResponse<DashboardResponse>> =>
      api.get(ENDPOINTS.DASHBOARD.DATA),
  },

  // Network status check
  checkConnection: async (): Promise<boolean> => {
    try {
      const response = await api.get("/health", { timeout: 5000 });
      return response.status === 200;
    } catch (_error) {
      return false;
    }
  },

  // Cancel all pending requests
  cancelAllRequests: (): void => {
    // Implementation would cancel all pending axios requests
    // This is useful for cleanup when the app goes to background
  },
};

export default ApiService;
