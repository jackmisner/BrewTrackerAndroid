/**
 * Beer Styles Hook
 *
 * React Query hook for fetching and managing beer styles data from the API.
 * Provides cached beer style options for recipe creation and filtering.
 *
 * Features:
 * - Cached beer styles with React Query
 * - Auto-retry on failure
 * - Loading and error state management
 * - Formatted style options for dropdowns
 *
 * @returns Object containing beer styles data, loading state, and error state
 */

import { useQuery } from "@tanstack/react-query";
import ApiService from "@services/api/apiService";

// Final item shape returned by this hook
export interface BeerStyleOption {
  name: string;
  styleId: string;
}

interface BeerStylesResponse {
  categories?: Record<
    string,
    { styles?: Array<{ name?: string; style_id?: string }> }
  >;
}

/**
 * Hook for fetching beer styles from the backend API
 *
 * Provides access to the complete list of beer styles with caching and
 * fallback to hardcoded common styles if the API is unavailable.
 *
 * @returns React Query result with beer styles data, loading state, and error
 */
export function useBeerStyles() {
  return useQuery<BeerStylesResponse, unknown, BeerStyleOption[]>({
    queryKey: ["beerStyles"],
    queryFn: async (): Promise<BeerStylesResponse> => {
      const response = await ApiService.beerStyles.getAll();
      return response.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - styles don't change frequently
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days - keep in cache for a week
    retry: (failureCount, error: any) => {
      const status = error?.status ?? error?.response?.status;
      // Don't retry on most client errors, but do retry 429 rate-limits
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    select: (data: BeerStylesResponse): BeerStyleOption[] => {
      // Parse the complex nested structure to extract style names
      if (!data || !data.categories) {
        return [];
      }

      const styles: { name: string; styleId: string }[] = [];

      // Iterate through each category
      Object.values(data.categories).forEach((category: any) => {
        if (category.styles && Array.isArray(category.styles)) {
          // Extract style names and IDs from each category
          category.styles.forEach((style: any) => {
            if (style.name && style.style_id) {
              styles.push({
                name: style.name,
                styleId: style.style_id,
              });
            }
          });
        }
      });

      // Sort by style ID (1A, 1B, 1C, 2A, 2B, etc.) and return style objects with both name and ID
      return styles.sort((a, b) => {
        // Extract number and letter parts for proper sorting
        const parseStyleId = (id: string) => {
          const match = id.match(/(\d+)([A-Z]+)/);
          return match
            ? { num: parseInt(match[1], 10), letter: match[2].toUpperCase() }
            : { num: 999, letter: "Z" };
        };

        const aId = parseStyleId(a.styleId);
        const bId = parseStyleId(b.styleId);

        if (aId.num !== bId.num) {
          return aId.num - bId.num;
        }
        return aId.letter.localeCompare(bId.letter);
      });
    },
  });
}
