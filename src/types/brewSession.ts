import { ID, TemperatureUnit } from "./common";
import { Recipe, HopFormat } from "./recipe";

// Brew session status types
export type BrewSessionStatus =
  | "planned"
  | "active"
  | "fermenting"
  | "in-progress" // API status
  | "conditioning"
  | "completed"
  | "archived"
  | "failed"
  | "paused";

export type FermentationStage =
  | "primary"
  | "secondary"
  | "tertiary"
  | "bottled"
  | "kegged";

// Gravity reading interface
export interface GravityReading {
  id: ID;
  specific_gravity: number;
  temperature: number;
  temperature_unit: TemperatureUnit;
  corrected_gravity?: number;
  date_recorded: string;
  notes?: string;
}

// Fermentation log entry (matches backend API)
export interface FermentationEntry {
  entry_date?: string; // API field name
  date?: string; // Legacy field name for compatibility
  temperature?: number;
  gravity?: number; // specific gravity (e.g., 1.010)
  ph?: number; // pH value
  notes?: string;
}

// Brew session interface
export interface BrewSession {
  id: ID; // Normalized by API interceptors (was session_id)
  recipe_id: ID; // Foreign key - remains domain-specific
  recipe?: Recipe; // Optional since API doesn't always return the full recipe object
  name: string;
  status: BrewSessionStatus;
  batch_size: number;
  batch_size_unit: "gal" | "l";

  // Brewing details
  brew_date: string;
  expected_completion_date?: string;
  actual_completion_date?: string;
  fermentation_start_date?: string;
  fermentation_end_date?: string;
  packaging_date?: string;

  // Initial readings
  original_gravity?: number;
  actual_og?: number; // API field name
  target_og?: number;
  target_fg?: number;

  // Final readings
  final_gravity?: number;
  actual_fg?: number; // API field name
  actual_abv?: number;

  // Progress tracking
  current_stage?: FermentationStage; // Optional since API doesn't always provide
  days_fermenting?: number;

  // Quality metrics
  efficiency?: number;
  actual_efficiency?: number;
  attenuation?: number;
  batch_rating?: number;

  // User notes and photos
  notes: string;
  brew_notes?: string;
  tasting_notes?: string;
  photo_urls?: string[];
  photos_url?: string;

  // Brew day measurements
  mash_temp?: number;

  // Additional API fields
  temperature_unit?: TemperatureUnit;
  fermentation_data?: FermentationEntry[]; // Backend uses fermentation_data
  dry_hop_additions?: DryHopAddition[];
  style_database_id?: string; // Android-specific field for style reference. Gets stripped out on API calls.

  // Timestamps
  created_at: string;
  updated_at: string;

  // User context
  user_id: ID;
  /**
   * Viewer-scoped UI hint indicating if the current user owns this brew session.
   * WARNING: This is a client-side computed property that must NOT be persisted
   * globally as it varies per user. Use server-validated permissions for
   * destructive actions rather than relying on this cached value.
   */
  is_owner?: boolean;
}

// Form data for creating brew sessions
export interface CreateBrewSessionRequest {
  recipe_id: ID;
  name: string;
  brew_date: string;
  status: BrewSessionStatus;
  notes?: string;
  temperature_unit?: TemperatureUnit;
}

// Update brew session data
export interface UpdateBrewSessionRequest {
  name?: string;
  status?: BrewSessionStatus;
  current_stage?: FermentationStage;
  final_gravity?: number;
  actual_completion_date?: string;
  notes?: string;
  brew_notes?: string;
  tasting_notes?: string;
  efficiency?: number;
  fermentation_start_date?: string;
  fermentation_end_date?: string;
  packaging_date?: string;
  actual_og?: number;
  actual_fg?: number;
  actual_abv?: number;
  mash_temp?: number;
  batch_rating?: number;
}

// Fermentation entry creation - matches backend schema
export interface CreateFermentationEntryRequest {
  entry_date: string; // ISO date string
  temperature?: number;
  gravity?: number; // Specific gravity (e.g., 1.010)
  ph?: number;
  notes?: string;
}

// Update fermentation entry - matches backend schema
export interface UpdateFermentationEntryRequest {
  entry_date?: string; // ISO date string
  temperature?: number;
  gravity?: number; // Specific gravity (e.g., 1.010)
  ph?: number;
  notes?: string;
}

// Dry-hop addition - matches backend schema
export interface DryHopAddition {
  addition_date: string; // ISO date string
  hop_name: string;
  hop_type?: HopFormat;
  amount: number;
  amount_unit: string; // oz, g, etc.
  duration_days?: number; // Planned duration
  removal_date?: string; // ISO date string when removed
  notes?: string;
  phase?: string; // fermentation, secondary, etc.
  recipe_instance_id?: string; // Unique ID from recipe ingredient to handle duplicate hops
}

// Create dry-hop from recipe ingredient
export interface CreateDryHopFromRecipeRequest {
  hop_name: string;
  hop_type?: HopFormat;
  amount: number;
  amount_unit: string;
  duration_days?: number;
  addition_date?: string; // Defaults to now
  phase?: string;
  recipe_instance_id?: string; // Unique ID from recipe ingredient to handle duplicate hops
}

// Update dry-hop addition
export interface UpdateDryHopRequest {
  removal_date?: string;
  notes?: string;
}

// Fermentation statistics
export interface FermentationStats {
  avg_temperature: number;
  min_temperature: number;
  max_temperature: number;
  temperature_unit: TemperatureUnit;
  gravity_trend: "falling" | "stable" | "rising";
  estimated_completion_days: number;
  current_attenuation: number;
  expected_final_gravity: number;
  fermentation_health: "excellent" | "good" | "concerning" | "poor";
}

// Dashboard summary data
export interface BrewSessionSummary {
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  avg_brew_time: number;
  success_rate: number;
  most_brewed_style: string;
}
