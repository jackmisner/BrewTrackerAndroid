import { useQuery } from "@tanstack/react-query";
import { RecipeFormData, RecipeMetrics } from "@src/types";
import { useDebounce } from "./useDebounce";
import { OfflineMetricsCalculator } from "@services/brewing/OfflineMetricsCalculator";

/**
 * Hook for calculating recipe metrics with offline-first approach
 *
 * Automatically recalculates metrics when recipe data changes using local calculations.
 * Always calculates locally for instant results without network dependency.
 * Includes proper debouncing to prevent excessive calculations during rapid changes.
 *
 * @param recipeData - Current recipe form data
 * @param enabled - Whether to enable the query (default: true when ingredients exist)
 * @returns React Query result with metrics data, loading state, and error
 */
export function useRecipeMetrics(
  recipeData: RecipeFormData,
  enabled?: boolean
) {
  const FALLBACK_METRICS: RecipeMetrics = {
    og: 1.05,
    fg: 1.012,
    abv: 5.0,
    ibu: 20,
    srm: 5,
  };

  // Debounce recipe data to prevent excessive calculations during rapid changes
  const debouncedRecipeData = useDebounce(recipeData, 500);

  // Determine if query should be enabled
  const shouldEnable =
    enabled !== undefined
      ? enabled
      : debouncedRecipeData.ingredients.length > 0 &&
        debouncedRecipeData.batch_size > 0;

  return useQuery<RecipeMetrics, unknown, Partial<RecipeMetrics>>({
    queryKey: [
      "recipeMetrics",
      "offline-first",
      // Include relevant recipe parameters in query key for proper caching
      debouncedRecipeData.batch_size,
      debouncedRecipeData.batch_size_unit,
      debouncedRecipeData.efficiency,
      debouncedRecipeData.boil_time,
      debouncedRecipeData.mash_temperature,
      debouncedRecipeData.mash_temp_unit,
      // Serialize ingredients for cache key
      JSON.stringify(
        [...debouncedRecipeData.ingredients]
          .map(ing => ({
            id: ing.id,
            type: ing.type,
            amount: ing.amount,
            unit: ing.unit,
            use: ing.use,
            time: ing.time,
            potential: ing.potential,
            color: ing.color,
            alpha_acid: ing.alpha_acid,
            attenuation: ing.attenuation,
            name: (ing as any)?.name, // optional tie-breaker if no id
          }))
          .sort(
            (a, b) =>
              (a.type ?? "").localeCompare(b.type ?? "") ||
              String(a.id ?? a.name ?? "").localeCompare(
                String(b.id ?? b.name ?? "")
              ) ||
              (a.amount ?? 0) - (b.amount ?? 0)
          )
      ),
    ],
    queryFn: async (): Promise<RecipeMetrics> => {
      // Basic validation for recipe data
      if (
        !debouncedRecipeData.batch_size ||
        debouncedRecipeData.batch_size <= 0 ||
        !debouncedRecipeData.ingredients.length
      ) {
        return FALLBACK_METRICS;
      }

      // Always calculate metrics locally using brewing formulas (offline-first)
      try {
        const validation =
          OfflineMetricsCalculator.validateRecipeData(debouncedRecipeData);
        if (!validation.isValid) {
          console.warn(
            "Invalid recipe data for metrics calculation:",
            validation.errors
          );
          return FALLBACK_METRICS;
        }

        const calculatedMetrics =
          OfflineMetricsCalculator.calculateMetrics(debouncedRecipeData);
        return calculatedMetrics;
      } catch (error) {
        console.error("Metrics calculation failed:", error);
        return FALLBACK_METRICS;
      }
    },

    enabled: shouldEnable,

    // Cache configuration - calculations are deterministic and fast
    staleTime: Infinity, // Never stale - recalculate only when inputs change
    gcTime: 300000, // 5 minutes - keep in cache for quick access
    refetchOnMount: false, // No need to refetch, calculations are deterministic
    refetchOnReconnect: false, // No network dependency
    refetchOnWindowFocus: false,

    // Retry configuration - only retry on unexpected errors
    retry: false, // Local calculations don't need retries

    // Data transformation
    select: (data): Partial<RecipeMetrics> => {
      // Ensure we return valid numeric values with optional fields
      return {
        og:
          typeof data.og === "number" && !isNaN(data.og) ? data.og : undefined,
        fg:
          typeof data.fg === "number" && !isNaN(data.fg) ? data.fg : undefined,
        abv:
          typeof data.abv === "number" && !isNaN(data.abv)
            ? data.abv
            : undefined,
        ibu:
          typeof data.ibu === "number" && !isNaN(data.ibu)
            ? data.ibu
            : undefined,
        srm:
          typeof data.srm === "number" && !isNaN(data.srm)
            ? data.srm
            : undefined,
      };
    },
  });
}
