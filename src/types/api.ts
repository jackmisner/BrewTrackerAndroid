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

export type ProfileResponse = User;

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

export type UpdateSettingsRequest = Partial<UserSettings>;

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

// Recipe API types
export type RecipeResponse = Recipe;

export interface RecipesListResponse {
  recipes: Recipe[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
    has_prev: boolean;
    has_next: boolean;
    prev_num?: number;
    next_num?: number;
  };
}

export type CreateRecipeRequest = RecipeFormData;

export type UpdateRecipeRequest = Partial<RecipeFormData>;

export interface CloneRecipeResponse {
  message: string;
  recipe: Recipe;
  recipe_id: string;
}

export interface ClonePublicRecipeRequest {
  originalAuthor: string;
}

export interface ClonePublicRecipeResponse {
  message: string;
  recipe: Recipe;
  recipe_id: string;
}

export interface RecipeMetricsResponse {
  og?: number;
  avg_og?: number;
  fg?: number;
  avg_fg?: number;
  abv?: number;
  avg_abv?: number;
  ibu?: number;
  srm?: number;
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

export type CalculateMetricsPreviewResponse = RecipeMetrics;

export type RecipeVersionHistoryResponse = Recipe[];

export interface PublicRecipesResponse {
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

export interface RecipeSearchResponse {
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
export type BrewSessionResponse = BrewSession;

export interface BrewSessionsListResponse
  extends PaginatedResponse<BrewSession> {
  brew_sessions: BrewSession[];
}

export type CreateBrewSessionResponse = ApiResponse<BrewSession>;

export type UpdateBrewSessionResponse = ApiResponse<BrewSession>;

export type FermentationEntryResponse = ApiResponse<FermentationEntry>;

export interface FermentationEntriesResponse
  extends ApiResponse<FermentationEntry[]> {
  data: FermentationEntry[];
}

export type CreateFermentationEntryResponse = ApiResponse<FermentationEntry>;

export type UpdateFermentationEntryResponse = ApiResponse<FermentationEntry>;

export type FermentationStatsResponse = ApiResponse<FermentationStats>;

export type BrewSessionSummaryResponse = ApiResponse<BrewSessionSummary>;

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

export type DashboardResponse = ApiResponse<DashboardData>;
