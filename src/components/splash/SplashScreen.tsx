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
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import {
  OfflineCacheService,
  CacheProgress,
} from "@services/offline/OfflineCacheService";

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
      await OfflineCacheService.initializeCache(progressUpdate => {
        setProgress(progressUpdate);
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

const splashScreenStyles = (theme: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      maxWidth: 400,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 80,
    },
    appLogo: {
      width: 80,
      height: 80,
    },
    appTitle: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    appSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    progressSection: {
      width: "100%",
      alignItems: "center",
    },
    stepIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },
    progressBarContainer: {
      width: "100%",
      alignItems: "center",
      marginBottom: 16,
    },
    progressBarBackground: {
      width: "100%",
      height: 8,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressPercent: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    progressMessage: {
      fontSize: 16,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 24,
      minHeight: 24, // Prevent layout jumps
    },
    loadingIndicator: {
      marginBottom: 16,
    },
    errorContainer: {
      alignItems: "center",
      paddingHorizontal: 16,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.error,
      textAlign: "center",
      marginBottom: 8,
    },
    errorSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    successContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    successText: {
      fontSize: 16,
      color: theme.colors.success || "#4CAF50",
      marginLeft: 8,
      fontWeight: "600",
    },
    footer: {
      paddingBottom: 40,
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
  });
};
