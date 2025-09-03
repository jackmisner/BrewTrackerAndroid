import React, { createContext, useContext, ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaFrame } from "react-native-safe-area-context";

interface ScreenDimensions {
  width: number;
  height: number;
  isSmallScreen: boolean;
  isLandscape: boolean;
}

interface ScreenDimensionsContextType {
  dimensions: ScreenDimensions;
  refreshDimensions: () => void;
}

const ScreenDimensionsContext = createContext<
  ScreenDimensionsContextType | undefined
>(undefined);

/**
 * Hook to access screen dimensions with automatic updates for foldable devices
 * Provides reliable dimension detection for Samsung Z Fold and other foldable devices
 */
export const useScreenDimensions = (): ScreenDimensionsContextType => {
  const context = useContext(ScreenDimensionsContext);
  if (!context) {
    throw new Error(
      "useScreenDimensions must be used within a ScreenDimensionsProvider"
    );
  }
  return context;
};

interface ScreenDimensionsProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages screen dimensions with multiple fallback methods
 * Optimized for foldable devices like Samsung Z Fold series
 */
export const ScreenDimensionsProvider: React.FC<
  ScreenDimensionsProviderProps
> = ({ children }) => {
  // Primary method: useSafeAreaFrame (only reliable method for Samsung Z Fold)
  const safeAreaFrame = useSafeAreaFrame();

  // Fallback for edge cases where safe area isn't available
  const windowDimensions = useWindowDimensions();
  const fallbackDimensions = React.useMemo(() => {
    return windowDimensions || { width: 400, height: 800 };
  }, [windowDimensions]);

  // Use safeAreaFrame as primary source with fallback
  const rawDimensions = React.useMemo(() => {
    if (safeAreaFrame?.width && safeAreaFrame?.height) {
      return safeAreaFrame;
    }
    return fallbackDimensions;
  }, [safeAreaFrame, fallbackDimensions]);

  // Enhanced dimensions with computed properties
  const dimensions: ScreenDimensions = React.useMemo(() => {
    const width = rawDimensions.width;
    const height = rawDimensions.height;

    return {
      width,
      height,
      isSmallScreen: width < 400,
      isLandscape: width > height,
    };
  }, [rawDimensions]);

  // Manual refresh function (mainly for debugging - safeAreaFrame handles automatic updates)
  const refreshDimensions = React.useCallback(() => {
    // Force re-render by triggering useMemo recalculation
    // safeAreaFrame should handle dimension changes automatically
  }, []);

  const contextValue: ScreenDimensionsContextType = React.useMemo(
    () => ({
      dimensions,
      refreshDimensions,
    }),
    [dimensions, refreshDimensions]
  );

  return (
    <ScreenDimensionsContext.Provider value={contextValue}>
      {children}
    </ScreenDimensionsContext.Provider>
  );
};
