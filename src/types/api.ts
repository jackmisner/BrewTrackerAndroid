/**
 * API Type Definitions
 *
 * TypeScript definitions for all API request and response structures.
 * Defines the contract between the mobile app and the Flask backend API.
 *
 * Key Types:
 * - API response wrappers with success/error states
 * - Request/response types for all endpoints
 * - Error handling structures
 * - Authentication token types
 * - Pagination and filtering structures
 */

import {
  Recipe,
  RecipeMetrics,
  RecipeFormData,
  RecipeSearchFilters,
} from "./recipe";
import {
  BrewSession,
  FermentationEntry,
  FermentationStats,
  BrewSessionSummary,
} from "./brewSession";
import { User, UserSettings } from "./user";
import { ApiResponse, PaginatedResponse } from "./common";

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

// Password reset API types
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
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

// Shared types for version history responses
export interface ParentInfo {
  recipe_id: string;
  name: string;
  version: number;
  unit_system: string;
}

export interface VersionEntry {
  recipe_id: string;
  name: string;
  version: number;
  unit_system: string;
  is_current: boolean;
  is_root: boolean;
  is_available: boolean;
}

export interface LegacyVersionEntry {
  recipe_id: string;
  name: string;
  version: number;
  unit_system: string;
}

// Union type for version history responses based on actual API properties
export type EnhancedRecipeVersionHistoryResponse = {
  // Enhanced API response - has all_versions Array
  current_version: number;
  immediate_parent?: ParentInfo;
  root_recipe?: ParentInfo;
  all_versions: VersionEntry[];
  total_versions: number;
  // Explicitly exclude legacy-only fields in this variant
  parent_recipe?: never;
  child_versions?: never;
};

export type LegacyRecipeVersionHistoryResponse = {
  // Legacy API response - has parent_recipe and (optionally) child_versions
  current_version: number;
  parent_recipe?: ParentInfo;
  child_versions?: ParentInfo[];
  // Explicitly exclude enhanced-only fields in this variant
  all_versions?: never;
  total_versions?: never;
  immediate_parent?: never;
  root_recipe?: never;
};

export type RecipeVersionHistoryResponse =
  | EnhancedRecipeVersionHistoryResponse
  | LegacyRecipeVersionHistoryResponse;

// Type guard functions for version history responses
export function isEnhancedVersionHistoryResponse(
  response: RecipeVersionHistoryResponse
): response is {
  current_version: number;
  immediate_parent?: ParentInfo;
  root_recipe?: ParentInfo;
  all_versions: VersionEntry[];
  total_versions: number;
} {
  return (
    "all_versions" in response &&
    Array.isArray(response.all_versions) &&
    "total_versions" in response &&
    typeof response.total_versions === "number" &&
    Number.isFinite(response.total_versions) &&
    "current_version" in response &&
    typeof response.current_version === "number" &&
    Number.isFinite(response.current_version)
  );
}

export function isLegacyVersionHistoryResponse(
  response: RecipeVersionHistoryResponse
): response is {
  current_version: number;
  parent_recipe?: ParentInfo;
  child_versions?: LegacyVersionEntry[];
} {
  const hasParent =
    "parent_recipe" in response &&
    typeof (response as any).parent_recipe === "object" &&
    (response as any).parent_recipe !== null;
  const hasChildren =
    "child_versions" in response &&
    Array.isArray((response as any).child_versions);
  const lacksEnhanced =
    !Array.isArray((response as any).all_versions) &&
    typeof (response as any).total_versions !== "number";
  return lacksEnhanced && (hasParent || hasChildren);
}

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

export type CreateBrewSessionResponse = BrewSession;

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
