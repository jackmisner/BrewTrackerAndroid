import { useQuery } from "@tanstack/react-query";
import ApiService from "@services/api/apiService";
import { RecipeFormData, RecipeMetrics } from "@src/types";
import { useDebounce } from "./useDebounce";

/**
 * Hook for calculating recipe metrics in real-time with debouncing
 *
 * Automatically recalculates metrics when recipe data changes, with proper
 * debouncing to prevent excessive API calls. Includes caching and error handling.
 *
 * @param recipeData - Current recipe form data
 * @param enabled - Whether to enable the query (default: true when ingredients exist)
 * @returns React Query result with metrics data, loading state, and error
 */
export function useRecipeMetrics(
  recipeData: RecipeFormData,
  enabled?: boolean
) {
  // Debounce recipe data to prevent excessive API calls during rapid changes
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
      const response = await ApiService.recipes.calculateMetricsPreview({
        batch_size: debouncedRecipeData.batch_size,
        batch_size_unit: debouncedRecipeData.batch_size_unit,
        efficiency: debouncedRecipeData.efficiency,
        boil_time: debouncedRecipeData.boil_time,
        ingredients: debouncedRecipeData.ingredients,
        mash_temperature: debouncedRecipeData.mash_temperature,
        mash_temp_unit: debouncedRecipeData.mash_temp_unit,
      });

      return response.data;
    },
    enabled: shouldEnable,
    staleTime: 30000, // 30 seconds - metrics don't change frequently for same recipe
    gcTime: 300000, // 5 minutes - keep in cache for quick access (renamed from cacheTime in v5)
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors (400), only on network/server errors
      if (error?.response?.status === 400) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    select: (
      data
    ): {
      og?: number;
      fg?: number;
      abv?: number;
      ibu?: number;
      srm?: number;
    } => {
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
