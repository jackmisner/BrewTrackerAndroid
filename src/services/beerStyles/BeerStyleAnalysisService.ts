/**
 * Beer Style Analysis Service
 *
 * Provides offline calculation methods for analyzing how well a recipe matches
 * beer style guidelines. All methods are pure functions with no network requests.
 *
 * Features:
 * - Calculate match percentage against style specifications
 * - Spec-by-spec comparison (OG, FG, ABV, IBU, SRM)
 * - Range formatting for display
 * - Match status categorization
 *
 * 100% OFFLINE - Uses cached beer style data and calculated recipe metrics.
 * No API calls required for real-time analysis.
 *
 * @example
 * ```typescript
 * const service = new BeerStyleAnalysisService();
 * const match = service.calculateStyleMatch(ipaStyle, recipeMetrics);
 * console.log(`${match.percentage}% match`); // "85% match"
 * ```
 */

import { BeerStyle, RecipeMetrics, StyleRange, MetricType } from "@src/types";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

/**
 * Result of comparing recipe metrics against a beer style
 */
export interface StyleMatchResult {
  /**
   * Boolean flags indicating which specs match the style range
   */
  matches: {
    og: boolean;
    fg: boolean;
    abv: boolean;
    ibu: boolean;
    srm: boolean;
  };
  /**
   * Overall match percentage (0-100)
   */
  percentage: number;
  /**
   * Number of specs that match the style
   */
  matchingSpecs: number;
  /**
   * Total number of specs evaluated (always 5)
   */
  totalSpecs: number;
}

/**
 * Match quality categories based on percentage
 */
export type MatchStatus = "excellent" | "good" | "needs-adjustment";

/**
 * Service for analyzing beer recipe adherence to style guidelines
 * All methods are pure, offline calculations
 */
export class BeerStyleAnalysisService {
  /**
   * Calculate how well recipe metrics match a beer style
   *
   * Compares 5 key specifications: OG, FG, ABV, IBU, SRM
   * Returns boolean match status for each spec and overall percentage
   *
   * @param style - The beer style with specification ranges
   * @param metrics - The calculated recipe metrics
   * @returns Match result with percentage and spec-by-spec breakdown
   *
   * @example
   * ```typescript
   * const match = service.calculateStyleMatch(americanIPA, {
   *   og: 1.052,
   *   fg: 1.016,
   *   abv: 6.2,
   *   ibu: 55,
   *   srm: 8
   * });
   * // Returns: { percentage: 80, matchingSpecs: 4, totalSpecs: 5, matches: {...} }
   * ```
   */
  calculateStyleMatch(
    style: BeerStyle,
    metrics: Partial<RecipeMetrics>
  ): StyleMatchResult {
    const matches = {
      og:
        metrics.og && metrics.og > 0
          ? this.isInRange(metrics.og, this.getRange(style, "og"))
          : false,
      fg:
        metrics.fg && metrics.fg > 0
          ? this.isInRange(metrics.fg, this.getRange(style, "fg"))
          : false,
      abv:
        metrics.abv && metrics.abv > 0
          ? this.isInRange(metrics.abv, this.getRange(style, "abv"))
          : false,
      ibu:
        metrics.ibu && metrics.ibu > 0
          ? this.isInRange(metrics.ibu, this.getRange(style, "ibu"))
          : false,
      srm:
        metrics.srm && metrics.srm > 0
          ? this.isInRange(metrics.srm, this.getRange(style, "srm"))
          : false,
    };

    const totalSpecs = 5;
    const matchingSpecs = Object.values(matches).filter(Boolean).length;
    const percentage = totalSpecs > 0 ? (matchingSpecs / totalSpecs) * 100 : 0;

    return {
      matches,
      percentage,
      matchingSpecs,
      totalSpecs,
    };
  }

  /**
   * Get style range for a specific metric
   * Extracts min/max from nested BeerJSON format
   *
   * @param style - The beer style
   * @param metric - The metric type
   * @returns StyleRange with min/max values, or undefined if not available
   */
  getRange(style: BeerStyle, metric: MetricType): StyleRange | undefined {
    let rangeValue: any;

    switch (metric) {
      case "og":
        rangeValue = style.original_gravity;
        break;
      case "fg":
        rangeValue = style.final_gravity;
        break;
      case "abv":
        rangeValue = style.alcohol_by_volume;
        break;
      case "ibu":
        rangeValue = style.international_bitterness_units;
        break;
      case "srm":
        rangeValue = style.color;
        break;
    }

    if (!rangeValue) {
      UnifiedLogger.debug(
        "BeerStyleAnalysisService",
        `Missing range for ${metric}`,
        {
          metric,
          styleId: style.style_id,
          styleName: style.name,
          rangeValue,
        }
      );
      return undefined;
    }

    // Extract min/max from nested format
    // Backend format: { minimum: { unit: "sg", value: 1.048 }, maximum: { unit: "sg", value: 1.056 } }
    const min = rangeValue.minimum?.value;
    const max = rangeValue.maximum?.value;

    if (min === undefined || max === undefined) {
      UnifiedLogger.debug(
        "BeerStyleAnalysisService",
        `Invalid range format for ${metric}`,
        {
          metric,
          styleId: style.style_id,
          styleName: style.name,
          rangeValue,
          extractedMin: min,
          extractedMax: max,
        }
      );
      return undefined;
    }

    return { min, max };
  }

  /**
   * Check if a value falls within a style specification range
   *
   * @param value - The metric value to check
   * @param range - The style specification range
   * @returns true if value is within range, false otherwise
   *
   * @example
   * ```typescript
   * const inRange = service.isInRange(1.052, { min: 1.048, max: 1.056 });
   * // Returns: true
   * ```
   */
  isInRange(value: number, range?: StyleRange): boolean {
    if (!range || range.min === undefined || range.max === undefined) {
      return false;
    }
    return value >= range.min && value <= range.max;
  }

  /**
   * Format a style range for display
   *
   * @param range - The style specification range
   * @param precision - Number of decimal places (default: 1)
   * @returns Formatted range string (e.g., "1.048 - 1.056")
   *
   * @example
   * ```typescript
   * const formatted = service.formatStyleRange({ min: 1.048, max: 1.056 }, 3);
   * // Returns: "1.048 - 1.056"
   * ```
   */
  formatStyleRange(range?: StyleRange, precision: number = 1): string {
    if (!range || range.min === undefined || range.max === undefined) {
      return "-";
    }

    const min = Number(range.min).toFixed(precision);
    const max = Number(range.max).toFixed(precision);

    // If min and max are the same, just show one value
    if (min === max) {
      return `${min}`;
    }

    return `${min} - ${max}`;
  }

  /**
   * Get match status category based on percentage
   *
   * - Excellent: ≥80% match
   * - Good: 60-79% match
   * - Needs Adjustment: <60% match
   *
   * @param percentage - Match percentage (0-100)
   * @returns Match status category
   *
   * @example
   * ```typescript
   * const status = service.getMatchStatus(85);
   * // Returns: "excellent"
   * ```
   */
  getMatchStatus(percentage: number): MatchStatus {
    if (percentage >= 80) {
      return "excellent";
    }
    if (percentage >= 60) {
      return "good";
    }
    return "needs-adjustment";
  }

  /**
   * Get human-readable label for match status
   *
   * @param percentage - Match percentage (0-100)
   * @returns User-friendly status label
   *
   * @example
   * ```typescript
   * const label = service.getMatchStatusLabel(85);
   * // Returns: "Excellent Match"
   * ```
   */
  getMatchStatusLabel(percentage: number): string {
    const status = this.getMatchStatus(percentage);
    switch (status) {
      case "excellent":
        return "Excellent Match";
      case "good":
        return "Good Match";
      case "needs-adjustment":
        return "Needs Adjustment";
    }
  }

  /**
   * Get color for match status visualization
   *
   * Returns semantic color names that should be mapped to theme colors
   *
   * @param percentage - Match percentage (0-100)
   * @returns Color identifier for theming
   */
  getMatchStatusColor(percentage: number): "success" | "warning" | "danger" {
    if (percentage >= 80) {
      return "success";
    }
    if (percentage >= 60) {
      return "warning";
    }
    return "danger";
  }
}

// Export singleton instance for convenience
export const beerStyleAnalysisService = new BeerStyleAnalysisService();

// Export as default for easier imports
export default beerStyleAnalysisService;
