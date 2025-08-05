import { ID } from "./common";
import { Recipe } from "./recipe";

// Brew session status types
export type BrewSessionStatus =
  | "active"
  | "fermenting"
  | "in-progress" // API status
  | "completed"
  | "failed"
  | "paused";

export type FermentationStage =
  | "primary"
  | "secondary"
  | "tertiary"
  | "bottled"
  | "kegged";

// Temperature unit
export type TemperatureUnit = "F" | "C";

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

// Fermentation log entry
export interface FermentationEntry {
  id: ID;
  date: string;
  stage: FermentationStage;
  temperature: number;
  temperature_unit: TemperatureUnit;
  gravity_reading?: GravityReading;
  ph?: number;
  notes: string;
  photo_urls?: string[];
  created_at: string;
}

// Brew session interface
export interface BrewSession {
  session_id: ID; // API returns session_id, not id
  recipe_id: ID;
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
  target_og?: number;
  target_fg?: number;

  // Final readings
  final_gravity?: number;
  actual_abv?: number;

  // Progress tracking
  current_stage?: FermentationStage; // Optional since API doesn't always provide
  days_fermenting?: number;
  fermentation_entries?: FermentationEntry[];

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

  // Additional API fields
  temperature_unit?: "C" | "F";
  fermentation_data?: any[];
  dry_hop_additions?: any[];

  // Timestamps
  created_at: string;
  updated_at: string;

  // User context
  user_id: ID;
}

// Form data for creating brew sessions
export interface CreateBrewSessionRequest {
  recipe_id: ID;
  name: string;
  batch_size: number;
  batch_size_unit: "gal" | "l";
  brew_date: string;
  original_gravity?: number;
  target_og?: number;
  target_fg?: number;
  notes?: string;
  brew_notes?: string;
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
}

// Fermentation entry creation
export interface CreateFermentationEntryRequest {
  date: string;
  stage: FermentationStage;
  temperature: number;
  temperature_unit: TemperatureUnit;
  specific_gravity?: number;
  gravity_temperature?: number;
  gravity_temperature_unit?: TemperatureUnit;
  ph?: number;
  notes: string;
}

// Update fermentation entry
export interface UpdateFermentationEntryRequest {
  date?: string;
  stage?: FermentationStage;
  temperature?: number;
  temperature_unit?: TemperatureUnit;
  specific_gravity?: number;
  gravity_temperature?: number;
  gravity_temperature_unit?: TemperatureUnit;
  ph?: number;
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
