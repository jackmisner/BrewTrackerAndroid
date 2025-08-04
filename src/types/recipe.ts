import { ID } from './common';

// Recipe types
export type IngredientType = "fermentable" | "hop" | "yeast" | "other";
export type BatchSizeUnit = "gal" | "l";
export type IngredientUnit = "lb" | "kg" | "g" | "oz" | "pkg" | "tsp" | "tbsp" | "cup" | "ml" | "l";

// Recipe ingredient interface
export interface RecipeIngredient {
  id: ID;
  name: string;
  type: IngredientType;
  amount: number;
  unit: IngredientUnit;
  
  // Fermentable-specific
  potential?: number;
  color?: number;
  grain_type?: string;
  
  // Hop-specific
  alpha_acid?: number;
  use?: string;
  time?: number;
  hop_type?: string;
  
  // Yeast-specific
  attenuation?: number;
  yeast_type?: string;
  manufacturer?: string;
  code?: string;
  
  // Other ingredient fields
  description?: string;
  notes?: string;
  
  // Meta fields
  created_at?: string;
  updated_at?: string;
}

// Recipe metrics
export interface RecipeMetrics {
  og: number;
  fg: number;
  abv: number;
  ibu: number;
  srm: number;
}

// Main recipe interface
export interface Recipe {
  id: ID;
  recipe_id: ID;
  name: string;
  style: string;
  description: string;
  batch_size: number;
  batch_size_unit: BatchSizeUnit;
  boil_time: number;
  efficiency: number;
  mash_temperature: number;
  mash_temp_unit: "F" | "C";
  is_public: boolean;
  notes: string;
  ingredients: RecipeIngredient[];
  
  // Calculated metrics (stored)
  estimated_og?: number;
  estimated_fg?: number;
  estimated_abv?: number;
  estimated_ibu?: number;
  estimated_srm?: number;
  
  // Version control
  version?: number;
  parent_recipe_id?: ID;
  original_author?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // User context
  author?: string;
  author_id?: ID;
  clone_count?: number;
  brew_count?: number;
}

// Recipe form data (for creation/editing)
export interface RecipeFormData {
  name: string;
  style: string;
  description: string;
  batch_size: number;
  batch_size_unit: BatchSizeUnit;
  boil_time: number;
  efficiency: number;
  mash_temperature: number;
  mash_temp_unit: "F" | "C";
  is_public: boolean;
  notes: string;
  ingredients: RecipeIngredient[];
}

// Recipe search filters
export interface RecipeSearchFilters {
  style?: string;
  search?: string;
  author?: string;
  min_abv?: number;
  max_abv?: number;
  min_ibu?: number;
  max_ibu?: number;
  min_srm?: number;
  max_srm?: number;
  is_public?: boolean;
}

// Ingredients grouped by type
export interface IngredientsByType {
  fermentable: RecipeIngredient[];
  hop: RecipeIngredient[];
  yeast: RecipeIngredient[];
  other: RecipeIngredient[];
}

// Recipe analysis for AI system
export interface RecipeAnalysis {
  style_compliance: {
    og_in_range: boolean;
    fg_in_range: boolean;
    abv_in_range: boolean;
    ibu_in_range: boolean;
    srm_in_range: boolean;
    overall_compliance: number; // percentage
  };
  grain_bill_analysis: {
    base_malt_percentage: number;
    specialty_malt_percentage: number;
    dominant_grain: string;
  };
  hop_analysis: {
    total_ibu: number;
    bittering_ratio: number;
    aroma_ratio: number;
    hop_varieties: string[];
  };
  yeast_analysis: {
    expected_attenuation: number;
    temperature_range: string;
    yeast_character: string;
  };
}

// Data for creating recipe ingredients
export interface CreateRecipeIngredientData {
  name: string;
  type: IngredientType;
  amount: number;
  unit: IngredientUnit;
  potential?: number;
  color?: number;
  grain_type?: string;
  alpha_acid?: number;
  use?: string;
  time?: number;
  hop_type?: string;
  attenuation?: number;
  yeast_type?: string;
  manufacturer?: string;
  code?: string;
  description?: string;
  notes?: string;
}