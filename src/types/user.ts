import { UnitSystem, ID } from "./common";

// User interface
export interface User {
  id: ID;
  user_id: ID;
  username: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  google_linked?: boolean;
  profile_picture?: string;
  is_active: boolean;
}

// User settings interface
export interface UserSettings {
  user_id: ID;
  preferred_units: UnitSystem;
  default_batch_size: number;
  default_batch_size_unit: string;
  default_efficiency: number;
  default_boil_time: number;
  default_mash_temperature: number;
  default_mash_temp_unit: string;
  email_notifications: boolean;
  push_notifications?: boolean; // Mobile-specific
  theme_preference?: "light" | "dark" | "auto"; // Mobile-specific
  privacy_settings: {
    share_recipes: boolean;
    show_in_leaderboards: boolean;
    allow_recipe_cloning: boolean;
  };
  created_at: string;
  updated_at: string;
}

// User profile for display
export interface UserProfile {
  id: ID;
  username: string;
  email?: string;
  profile_picture?: string;
  total_recipes: number;
  public_recipes: number;
  total_brews: number;
  joined_date: string;
}

// User preferences (client-side)
export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  notifications_enabled: boolean;
  offline_mode: boolean;
  auto_sync: boolean;
  cache_size_limit: number; // MB
}
