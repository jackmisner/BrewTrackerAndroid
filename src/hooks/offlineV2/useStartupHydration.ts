/**
 * useStartupHydration Hook - BrewTracker Offline V2
 *
 * React hook that manages automatic cache hydration on app startup.
 * Ensures that server data is available offline immediately after authentication.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@contexts/AuthContext";
import { useNetwork } from "@contexts/NetworkContext";
import { useUnits } from "@contexts/UnitContext";
import { StartupHydrationService } from "@services/offlineV2/StartupHydrationService";

export interface UseStartupHydrationReturn {
  isHydrating: boolean;
  hasHydrated: boolean;
  error: string | null;
}

/**
 * Hook to manage startup cache hydration
 */
export function useStartupHydration(): UseStartupHydrationReturn {
  const { user, isAuthenticated } = useAuth();
  const { isConnected } = useNetwork();
  const { unitSystem } = useUnits();
  const [isHydrating, setIsHydrating] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserId, setLastUserID] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const performHydration = async () => {
      // Only hydrate if user is authenticated, online, and we haven't hydrated yet
      if (
        !isAuthenticated ||
        !user?.id ||
        !isConnected ||
        (hasHydrated && lastUserId === user.id)
      ) {
        return;
      }

      try {
        setIsHydrating(true);
        setError(null);

        // Use user.id (normalized) for hydration
        const userId = user.id;
        await StartupHydrationService.hydrateOnStartup(userId, unitSystem);

        if (!isCancelled) {
          setHasHydrated(true);
          setLastUserID(userId);
        }
      } catch (hydrationError) {
        console.error(
          `[useStartupHydration] Hydration failed:`,
          hydrationError
        );
        if (!isCancelled) {
          setError(
            hydrationError instanceof Error
              ? hydrationError.message
              : "Failed to hydrate cache on startup"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsHydrating(false);
        }
      }
    };

    performHydration();

    return () => {
      isCancelled = true;
    };
  }, [
    isAuthenticated,
    user?.id,
    isConnected,
    hasHydrated,
    lastUserId,
    unitSystem,
  ]);

  // Reset hydration state when user logs out
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setHasHydrated(false);
      setIsHydrating(false);
      setError(null);
      setLastUserID(null);
      StartupHydrationService.resetHydrationState();
      console.log(
        `[useStartupHydration] Reset hydration state (user logged out)`
      );
    }
  }, [isAuthenticated, user?.id]);

  return {
    isHydrating,
    hasHydrated,
    error,
  };
}
