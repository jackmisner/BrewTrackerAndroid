import {
  Recipe,
  RecipeMetrics,
  RecipeFormData,
  RecipeSearchFilters,
} from "./recipe";
import {
  BrewSession,
  CreateBrewSessionRequest,
  UpdateBrewSessionRequest,
  FermentationEntry,
  CreateFermentationEntryRequest,
  UpdateFermentationEntryRequest,
  FermentationStats,
  BrewSessionSummary,
} from "./brewSession";
import { User, UserSettings } from "./user";
import { ApiResponse, PaginatedResponse, ID } from "./common";

// Authentication API types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user?: User;
  verification_email_sent?: boolean;
}

export interface ValidateUsernameRequest {
  username: string;
}

export interface ValidateUsernameResponse {
  valid: boolean;
  error?: string;
  suggestions?: string[];
}

export interface ProfileResponse {
  user: User;
}

export interface GoogleAuthRequest {
  token: string;
}

export interface GoogleAuthResponse {
  access_token: string;
  user: User;
  message: string;
}

// Email verification API types
export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
  access_token?: string;
  user?: any;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface VerificationStatusResponse {
  email_verified: boolean;
  email: string;
  verification_sent_at?: string;
}

// User API types
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface DeleteAccountRequest {
  password: string;
  confirmation: string;
  preserve_public_recipes?: boolean;
}

export interface UserSettingsResponse {
  settings: UserSettings;
}

export interface UpdateSettingsRequest extends Partial<UserSettings> {}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

// Recipe API types
export interface RecipeResponse extends ApiResponse<Recipe> {}

export interface RecipesListResponse extends PaginatedResponse<Recipe> {
  recipes: Recipe[];
}

export interface CreateRecipeRequest extends RecipeFormData {}

export interface UpdateRecipeRequest extends Partial<RecipeFormData> {}

export interface CloneRecipeResponse extends ApiResponse<Recipe> {}

export interface ClonePublicRecipeRequest {
  originalAuthor: string;
}

export interface ClonePublicRecipeResponse extends ApiResponse<Recipe> {}

export interface RecipeMetricsResponse extends ApiResponse<RecipeMetrics> {
  data: RecipeMetrics & {
    og?: number;
    avg_og?: number;
    fg?: number;
    avg_fg?: number;
    abv?: number;
    avg_abv?: number;
    ibu?: number;
    srm?: number;
  };
}

export interface CalculateMetricsPreviewRequest {
  batch_size: number;
  batch_size_unit: string;
  efficiency: number;
  boil_time: number;
  ingredients: Recipe["ingredients"];
  mash_temperature?: number;
  mash_temp_unit?: "F" | "C";
}

export interface CalculateMetricsPreviewResponse
  extends ApiResponse<RecipeMetrics> {}

export interface RecipeVersionHistoryResponse extends ApiResponse<Recipe[]> {}

export interface PublicRecipesResponse extends PaginatedResponse<Recipe> {
  recipes: Recipe[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    has_prev: boolean;
    has_next: boolean;
    total: number;
    prev_num?: number;
    next_num?: number;
  };
}

// Search API types
export interface RecipeSearchRequest extends RecipeSearchFilters {
  q?: string;
  page?: number;
  per_page?: number;
}

export interface RecipeSearchResponse extends PaginatedResponse<Recipe> {}

// Generic API query parameters
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface SearchParams extends PaginationParams {
  q?: string;
}

// API Error types
export interface ApiError {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ValidationError extends ApiError {
  field_errors?: Record<string, string[]>;
}

// HTTP methods for API calls
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// API endpoint configuration
export interface ApiEndpoint {
  method: HttpMethod;
  url: string;
  requiresAuth?: boolean;
}

// Generic API call options
export interface ApiCallOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

// Brew Session API types
export interface BrewSessionResponse extends ApiResponse<BrewSession> {}

export interface BrewSessionsListResponse
  extends PaginatedResponse<BrewSession> {
  brew_sessions: BrewSession[];
}

export interface CreateBrewSessionResponse extends ApiResponse<BrewSession> {}

export interface UpdateBrewSessionResponse extends ApiResponse<BrewSession> {}

export interface FermentationEntryResponse
  extends ApiResponse<FermentationEntry> {}

export interface FermentationEntriesResponse
  extends ApiResponse<FermentationEntry[]> {
  data: FermentationEntry[];
}

export interface CreateFermentationEntryResponse
  extends ApiResponse<FermentationEntry> {}

export interface UpdateFermentationEntryResponse
  extends ApiResponse<FermentationEntry> {}

export interface FermentationStatsResponse
  extends ApiResponse<FermentationStats> {}

export interface BrewSessionSummaryResponse
  extends ApiResponse<BrewSessionSummary> {}

// Dashboard API types
export interface DashboardData {
  user_stats: {
    total_recipes: number;
    public_recipes: number;
    total_brew_sessions: number;
    active_brew_sessions: number;
  };
  recent_recipes: Recipe[];
  active_brew_sessions: BrewSession[];
  brew_session_summary: BrewSessionSummary;
}

export interface DashboardResponse extends ApiResponse<DashboardData> {}
