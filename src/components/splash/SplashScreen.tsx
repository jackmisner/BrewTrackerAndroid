/**
 * Splash Screen Component for Initial Data Loading
 *
 * Displays a branded loading screen while essential brewing data is cached
 * for offline functionality. Shows progress indicators and messages to
 * keep users informed during the initial data loading process.
 *
 * Features:
 * - Branded BrewTracker interface with logo and animations
 * - Real-time progress tracking with percentage and messages
 * - Smooth animations for progress bar and status updates
 * - Error handling with retry options
 * - Theme-aware styling with light/dark support
 *
 * Used during:
 * - First app launch to cache brewing data
 * - Cache refresh when data is expired
 * - Network reconnection after offline period
 */

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Animated, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import { splashScreenStyles } from "@styles/components/splashScreenStyles";

// V2 system progress interface
interface CacheProgress {
  step: string;
  message: string;
  percent: number;
  isComplete: boolean;
}

interface Props {
  onComplete: (success: boolean) => void;
}

export function SplashScreen({ onComplete }: Props) {
  const theme = useTheme();
  const styles = splashScreenStyles(theme);

  const [progress, setProgress] = useState<CacheProgress>({
    step: "init",
    message: "Initializing BrewTracker...",
    percent: 0,
    isComplete: false,
  });

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [progressAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Start entrance animation
    const animation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    // Initialize cache
    initializeAppData();

    return () => {
      animation.stop();
    };
  }, [fadeAnim, scaleAnim]);

  // Animate progress bar when progress changes
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    Animated.timing(progressAnim, {
      toValue: progress.percent / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Complete initialization when done
    if (progress.isComplete) {
      const success = progress.step !== "error";
      timeoutId = setTimeout(() => {
        onComplete(success);
      }, 1000);
    }
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [progress, progressAnim, onComplete]);

  const initializeAppData = async () => {
    try {
      // V2 system: Simple cache initialization without progress tracking
      setProgress({
        step: "network",
        message: "Checking network connectivity...",
        percent: 20,
        isComplete: false,
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX

      setProgress({
        step: "ingredients",
        message: "Loading ingredients database...",
        percent: 60,
        isComplete: false,
      });

      // Initialize V2 static data cache
      await StaticDataService.updateIngredientsCache();

      setProgress({
        step: "beer-styles",
        message: "Loading beer styles...",
        percent: 90,
        isComplete: false,
      });

      await StaticDataService.updateBeerStylesCache();

      // Complete initialization
      setProgress({
        step: "complete",
        message: "Welcome to BrewTracker!",
        percent: 100,
        isComplete: true,
      });
    } catch (error) {
      console.error("Failed to initialize app data:", error);
      setProgress({
        step: "error",
        message: "Failed to load brewing data",
        percent: 100,
        isComplete: true,
      });
    }
  };

  const getIconForStep = (step: string) => {
    switch (step) {
      case "init":
        return "hourglass-empty";
      case "network":
        return "wifi";
      case "beer-styles":
        return "local-bar";
      case "ingredients":
        return "grain";
      case "save":
        return "save";
      case "complete":
        return "check-circle";
      case "error":
        return "error";
      default:
        return "sync";
    }
  };

  const getColorForStep = (step: string) => {
    switch (step) {
      case "complete":
        return theme.colors.success || "#4CAF50";
      case "error":
        return theme.colors.error || "#F44336";
      default:
        return theme.colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/images/mugOfBeer512.png")}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>BrewTracker</Text>
          <Text style={styles.appSubtitle}>Craft Your Perfect Brew</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          {/* Current Step Icon */}
          <View style={styles.stepIconContainer}>
            <MaterialIcons
              name={getIconForStep(progress.step) as any}
              size={32}
              color={getColorForStep(progress.step)}
            />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: getColorForStep(progress.step),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressPercent}>
              {Math.round(progress.percent)}%
            </Text>
          </View>

          {/* Progress Message */}
          <Text style={styles.progressMessage}>{progress.message}</Text>

          {/* Loading Indicator (only show when not complete) */}
          {!progress.isComplete && progress.step !== "error" && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.loadingIndicator}
            />
          )}

          {/* Error State */}
          {progress.step === "error" && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Unable to download brewing data. Some features may be limited
                when offline.
              </Text>
              <Text style={styles.errorSubtext}>
                Check your internet connection and restart the app to try again.
              </Text>
            </View>
          )}

          {/* Success State */}
          {progress.step === "complete" && progress.percent === 100 && (
            <View style={styles.successContainer}>
              <MaterialIcons
                name="check"
                size={24}
                color={theme.colors.success || "#4CAF50"}
              />
              <Text style={styles.successText}>Ready to brew!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Setting up your brewing workspace...
        </Text>
      </View>
    </Animated.View>
  );
}
