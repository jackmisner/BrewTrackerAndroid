/**
 * AI Recipe Analysis & Optimization Types
 *
 * Type definitions for the AI-powered recipe analysis and optimization features.
 * Provides comprehensive type safety for API requests, responses, and UI state management.
 *
 * Features:
 * - Recipe analysis requests with complete recipe data
 * - Optimization results with before/after metrics
 * - Recipe changes tracking (modifications, additions, removals)
 * - Style analysis and compliance
 *
 * @module types/ai
 */

import { Recipe, RecipeMetrics } from "./recipe";

/**
 * Request payload for AI recipe analysis
 *
 * Sends complete recipe data to backend for analysis and optimization
 */
export interface AIAnalysisRequest {
  /** Complete recipe object with all fields (ingredients, parameters, etc.) */
  complete_recipe: Recipe;

  /** Optional beer style guide ID for style-specific analysis */
  style_id?: string;

  /** Unit system preference for analysis results */
  unit_system?: "metric" | "imperial";

  /** Optional workflow name for specific optimization strategies */
  workflow_name?: string;
}

/**
 * Response from AI recipe analysis endpoint
 *
 * Contains analysis results, suggestions, and optional optimization data
 */
export interface AIAnalysisResponse {
  /** Current calculated metrics for the recipe */
  current_metrics: RecipeMetrics;

  /** Style analysis results (if style provided) */
  style_analysis?: StyleAnalysis;

  /** Individual suggestions for recipe improvements (when no optimization performed) */
  suggestions: AISuggestion[];

  /** Timestamp of when analysis was performed */
  analysis_timestamp: string;

  /** Unit system used for the analysis */
  unit_system: "metric" | "imperial";

  /** User preferences used during analysis */
  user_preferences: AIUserPreferences;

  // Optimization-specific fields (when optimization was performed)

  /** Whether automatic optimization was performed by the AI */
  optimization_performed?: boolean;

  /** Number of optimization iterations completed */
  iterations_completed?: number;

  /** Original recipe metrics before optimization */
  original_metrics?: RecipeMetrics;

  /** Optimized recipe metrics after changes */
  optimized_metrics?: RecipeMetrics;

  /** Complete optimized recipe with all changes applied */
  optimized_recipe?: Recipe;

  /** List of all changes made during optimization */
  recipe_changes?: RecipeChange[];

  /** History of optimization iterations (for debugging/transparency) */
  optimization_history?: OptimizationHistoryEntry[];
}

/**
 * Style analysis results
 *
 * Provides compliance scores and adherence to BJCP style guidelines
 */
export interface StyleAnalysis {
  /** Name of the beer style analyzed */
  style_name: string;

  /** Overall compliance score (0-100) */
  overall_score: number;

  /** Detailed compliance breakdown by metric */
  compliance: {
    [metric: string]: {
      value: number;
      min: number;
      max: number;
      inRange: boolean;
    };
  };

  /** Suggested optimization targets for better style adherence */
  optimization_targets: OptimizationTarget[];
}

/**
 * Optimization target for a specific metric
 *
 * Identifies which metrics should be adjusted for better style compliance
 */
export interface OptimizationTarget {
  /** Metric to optimize (OG, FG, ABV, IBU, SRM) */
  metric: string;

  /** Current value of the metric */
  current_value: number;

  /** Target value for optimal style adherence */
  target_value: number;

  /** Priority level for this optimization (higher = more important) */
  priority: number;

  /** Explanation of why this optimization is recommended */
  reasoning: string;
}

/**
 * Individual AI suggestion for recipe improvement
 *
 * Used when optimization is not automatically performed
 */
export interface AISuggestion {
  /** Unique identifier for the suggestion */
  id: string;

  /** Type of suggestion (e.g., "ingredient", "parameter", "style") */
  type: string;

  /** Human-readable title for the suggestion */
  title: string;

  /** Detailed description of the suggestion */
  description: string;

  /** Confidence level in the suggestion */
  confidence: "high" | "medium" | "low";

  /** List of specific changes to make */
  changes: AIIngredientChange[];

  /** Priority of the suggestion (1 = highest) */
  priority: number;

  /** Predicted impact on style adherence */
  style_impact?: string;

  /** Impact type for UI prioritization */
  impact_type?: "critical" | "important" | "nice-to-have";

  /** Predicted effects of applying this suggestion */
  predicted_effects?: {
    original_metrics: RecipeMetrics;
    predicted_metrics: RecipeMetrics;
    metric_changes: Record<string, number>;
  };
}

/**
 * Individual ingredient change suggestion
 *
 * Details a specific change to an ingredient
 */
export interface AIIngredientChange {
  /** ID of the ingredient to change */
  ingredient_id?: string;

  /** Name of the ingredient */
  ingredient_name: string;

  /** Field to change (amount, time, use, etc.) */
  field: string;

  /** Current value of the field */
  current_value: any;

  /** Suggested new value for the field */
  suggested_value: any;

  /** Unit for the value (g, oz, min, etc.) */
  unit?: string;

  /** Reason for the suggested change */
  reason: string;

  /** Whether this is a new ingredient to add */
  is_new_ingredient?: boolean;

  /** Data for new ingredient (if adding) */
  new_ingredient_data?: {
    name: string;
    type: string;
    grain_type?: string;
    color?: number;
    use?: string;
    unit?: string;
    amount?: number;
  };
}

/**
 * Recipe change record from optimization
 *
 * Documents a single change made during optimization
 */
export interface RecipeChange {
  /** Type of change made */
  type:
    | "ingredient_modified"
    | "ingredient_added"
    | "ingredient_removed"
    | "modify_recipe_parameter";

  /** Name of ingredient affected (if applicable) */
  ingredient_name?: string;

  /** Type of ingredient (grain, hop, yeast, other) */
  ingredient_type?: string;

  /** Field that was changed (if modification) */
  field?: string;

  /** Original value before optimization */
  original_value?: any;

  /** New value after optimization */
  optimized_value?: any;

  /** Unit for the values */
  unit?: string;

  /** Recipe parameter changed (if parameter modification) */
  parameter?: string;

  /** Explanation of why this change was made */
  change_reason: string;

  /** Amount for ingredient additions/removals */
  amount?: number;
}

/**
 * Single iteration entry in optimization history
 *
 * Records what happened during one optimization iteration
 */
export interface OptimizationHistoryEntry {
  /** Iteration number */
  iteration: number;

  /** Changes applied during this iteration */
  applied_changes: RecipeChange[];

  /** Metrics before this iteration */
  metrics_before: RecipeMetrics;

  /** Metrics after this iteration */
  metrics_after: RecipeMetrics;
}

/**
 * User preferences used during AI analysis
 *
 * Contains user-specific settings that affect analysis
 * (Renamed from UserPreferences to avoid conflict with user.ts types)
 */
export interface AIUserPreferences {
  /** Preferred unit system */
  preferred_units: string;

  /** Default batch size */
  default_batch_size: number;
}

/**
 * Optimization result for UI state management
 *
 * Simplified version of optimization data for component state
 */
export interface OptimizationResult {
  /** Whether optimization was performed */
  performed: boolean;

  /** Original metrics before optimization */
  originalMetrics: RecipeMetrics;

  /** Optimized metrics after changes */
  optimizedMetrics: RecipeMetrics;

  /** Complete optimized recipe */
  optimizedRecipe: Recipe;

  /** List of all changes made */
  recipeChanges: RecipeChange[];

  /** Number of iterations completed */
  iterationsCompleted: number;
}

/**
 * AI analysis state for UI management
 *
 * Tracks the state of an ongoing or completed analysis
 */
export interface AIAnalysisState {
  /** Whether analysis is currently in progress */
  analyzing: boolean;

  /** Analysis result (if completed) */
  result: AIAnalysisResponse | null;

  /** Error message (if failed) */
  error: string | null;

  /** Whether results modal is visible */
  isVisible: boolean;
}
