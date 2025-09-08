/**
 * Recipe-Aware Boil Timer Calculator
 *
 * A comprehensive boil timer that integrates with recipes to automatically
 * schedule hop additions and provide real-time alerts during the boil process.
 */

import React, { useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  Dimensions,
  AppState,
  AppStateStatus,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";
import { BoilTimerCalculator } from "@services/calculators/BoilTimerCalculator";
import { NotificationService } from "@services/NotificationService";
import { CalculatorCard } from "@components/calculators/CalculatorCard";
import { CalculatorHeader } from "@components/calculators/CalculatorHeader";
import { NumberInput } from "@components/calculators/NumberInput";
import { RecipeSelector } from "@components/boilTimer/RecipeSelector";
import { TimerPersistenceService } from "@services/TimerPersistenceService";
import { useTheme } from "@contexts/ThemeContext";
import { Recipe } from "@src/types";
import * as Notifications from "expo-notifications";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import ApiService from "@services/api/apiService";
import { TEST_IDS } from "@constants/testIDs";
import {
  useCalculators,
  CalculatorAction,
  BoilTimerState,
} from "@contexts/CalculatorsContext";

const { width } = Dimensions.get("window");

/**
 * Helper function to restore boil timer state from persistence
 * Dispatches each non-undefined state value to the reducer
 */
const restoreBoilTimerState = (
  restoredState: Partial<BoilTimerState>,
  dispatch: React.Dispatch<CalculatorAction>
) => {
  (Object.entries(restoredState) as [keyof BoilTimerState, unknown][]).forEach(
    ([key, value]) => {
      if (restoredState.hasOwnProperty(key) && value !== undefined) {
        dispatch({
          type: "SET_BOIL_TIMER",
          payload: {
            [key]: value,
          },
        });
      }
    }
  );
};

interface TimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
  theme: any;
}

const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onStop,
  onReset,
  disabled = false,
  theme,
}) => (
  <View style={styles.timerControls}>
    {!isRunning ? (
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: theme.colors.success },
          disabled && styles.disabledButton,
        ]}
        onPress={onStart}
        disabled={disabled}
        testID={TEST_IDS.patterns.touchableOpacityAction("start-timer")}
      >
        <MaterialIcons name="play-arrow" size={32} color="white" />
        <Text style={styles.buttonText}>Start</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[
          styles.primaryButton,
          {
            backgroundColor: isPaused
              ? theme.colors.success
              : theme.colors.warning,
          },
        ]}
        onPress={isPaused ? onStart : onPause}
        testID={
          isPaused
            ? TEST_IDS.patterns.touchableOpacityAction("resume-timer")
            : TEST_IDS.patterns.touchableOpacityAction("pause-timer")
        }
      >
        <MaterialIcons
          name={isPaused ? "play-arrow" : "pause"}
          size={32}
          color="white"
        />
        <Text style={styles.buttonText}>{isPaused ? "Resume" : "Pause"}</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      style={[styles.secondaryButton, { backgroundColor: theme.colors.error }]}
      onPress={onStop}
      testID={TEST_IDS.patterns.touchableOpacityAction("stop-timer")}
    >
      <MaterialIcons name="stop" size={24} color="white" />
      <Text style={styles.secondaryButtonText}>Stop</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.secondaryButton,
        { backgroundColor: theme.colors.textSecondary },
      ]}
      onPress={onReset}
      testID={TEST_IDS.patterns.touchableOpacityAction("reset-timer")}
    >
      <MaterialIcons name="refresh" size={24} color="white" />
      <Text style={styles.secondaryButtonText}>Reset</Text>
    </TouchableOpacity>
  </View>
);

interface HopAdditionCardProps {
  hop: {
    time: number;
    name: string;
    amount: number;
    unit: string;
    added: boolean;
  };
  index: number;
  onMarkAdded: (index: number) => void;
  currentTimeMinutes: number;
  theme: any;
}

const HopAdditionCard: React.FC<HopAdditionCardProps> = ({
  hop,
  index,
  onMarkAdded,
  currentTimeMinutes,
  theme,
}) => {
  const isPending = currentTimeMinutes > hop.time && !hop.added;
  const isUpcoming =
    currentTimeMinutes <= hop.time + 1 && currentTimeMinutes > hop.time - 1;

  return (
    <View
      style={[
        styles.hopCard,
        {
          backgroundColor: hop.added
            ? theme.colors.success + "20"
            : isPending
              ? theme.colors.warning + "20"
              : isUpcoming
                ? theme.colors.primary + "20"
                : theme.colors.backgroundSecondary,
          borderColor: hop.added
            ? theme.colors.success
            : isPending
              ? theme.colors.warning
              : isUpcoming
                ? theme.colors.primary
                : theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.hopCardContent}>
        <View style={styles.hopInfo}>
          <Text style={[styles.hopTime, { color: theme.colors.primary }]}>
            {hop.time} min
          </Text>
          <Text style={[styles.hopName, { color: theme.colors.text }]}>
            {hop.name}
          </Text>
          <Text
            style={[styles.hopAmount, { color: theme.colors.textSecondary }]}
          >
            {hop.amount} {hop.unit}
          </Text>
        </View>

        {hop.added ? (
          <View style={styles.addedIndicator}>
            <MaterialIcons
              name="check-circle"
              size={24}
              color={theme.colors.success}
            />
            <Text style={[styles.addedText, { color: theme.colors.success }]}>
              Added
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: isPending
                  ? theme.colors.warning
                  : isUpcoming
                    ? theme.colors.primary
                    : theme.colors.primary + "40",
              },
            ]}
            onPress={() => onMarkAdded(index)}
            testID={TEST_IDS.boilTimer.hopAddition(index)}
          >
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Mark Added</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function BoilTimerCalculatorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useCalculators();
  const { boilTimer } = state;
  const params = useLocalSearchParams();
  const recipeId = params.recipeId as string;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const scheduledHopAlertsRef = useRef<Set<number>>(new Set());
  const notificationListenersRef = useRef<{
    foreground?: Notifications.Subscription;
    response?: Notifications.Subscription;
  }>({});

  // Fetch recipe if recipeId is provided in params
  const { data: recipeResponse, isLoading: isLoadingRecipe } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => ApiService.recipes.getById(recipeId),
    enabled: !!recipeId && !boilTimer.selectedRecipe,
  });

  const paramRecipe = recipeResponse?.data;

  // Recipe selection handler
  const handleRecipeSelect = useCallback(
    async (recipe: Recipe | null) => {
      if (recipe) {
        try {
          const recipeData = BoilTimerCalculator.createFromRecipe(recipe);

          dispatch({
            type: "LOAD_RECIPE_FOR_TIMER",
            payload: {
              recipeId: recipe.id,
              recipeData: {
                id: recipe.id,
                name: recipe.name,
                style: recipe.style,
                boil_time: recipe.boil_time,
              },
            },
          });

          dispatch({
            type: "START_RECIPE_TIMER",
            payload: {
              duration: recipeData.boilTime,
              hopAlerts: recipeData.hopAlerts,
            },
          });

          Alert.alert(
            "Recipe Loaded",
            `Loaded ${recipe.name} with ${recipeData.hopAlerts.length} hop additions for ${recipeData.boilTime} minute boil.`
          );
        } catch (error) {
          console.error("Error loading recipe:", error);
          Alert.alert("Error", "Failed to load recipe for timer.");
        }
      } else {
        // Manual mode - reset to basic timer
        dispatch({ type: "RESET_TIMER_STATE" });
        dispatch({
          type: "SET_BOIL_TIMER",
          payload: { duration: 60, timeRemaining: 60 * 60 },
        });
      }
    },
    [dispatch]
  );

  // Auto-load recipe from URL params if provided
  useEffect(() => {
    if (paramRecipe && !boilTimer.selectedRecipe && !isLoadingRecipe) {
      // console.log("Auto-loading recipe from URL params:", paramRecipe.name);
      handleRecipeSelect(paramRecipe);
    }
  }, [
    paramRecipe,
    isLoadingRecipe,
    boilTimer.selectedRecipe,
    handleRecipeSelect,
  ]);

  // Load persisted timer state on mount
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const restoredState = await TimerPersistenceService.loadTimerState();
        if (restoredState) {
          // console.log("Restored timer state from storage");

          // Update context with restored state
          restoreBoilTimerState(restoredState, dispatch);

          // If timer completed while app was closed, show completion alert
          if (
            restoredState.timeRemaining === 0 &&
            restoredState.isRunning === false
          ) {
            Alert.alert(
              "Boil Completed",
              "Your boil finished while the app was closed.",
              [{ text: "OK" }]
            );
          }
        }
      } catch (error) {
        console.error("Failed to load persisted timer state:", error);
      }
    };

    loadPersistedState();
  }, [dispatch]);

  // Handle app state changes for background/foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground
        // console.log("App came to foreground");
        const restoredState =
          await TimerPersistenceService.handleAppForeground();

        if (restoredState) {
          // Update timer with time that passed in background
          restoreBoilTimerState(restoredState, dispatch);

          // Show completion alert if timer finished in background
          if (
            restoredState.timeRemaining === 0 &&
            restoredState.isRunning === false
          ) {
            Alert.alert(
              "Boil Completed",
              "Your boil finished while the app was in the background!",
              [{ text: "OK" }]
            );
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background
        // console.log("App going to background");
        await TimerPersistenceService.handleAppBackground(boilTimer);
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, [boilTimer, dispatch]);

  // Start/stop persistence checkpointing based on timer state
  useEffect(() => {
    if (boilTimer.isRunning && !boilTimer.isPaused) {
      TimerPersistenceService.startCheckpointing(() => boilTimer);
    } else {
      TimerPersistenceService.stopCheckpointing();

      // Save final state when timer stops
      if (!boilTimer.isRunning) {
        TimerPersistenceService.saveTimerState(boilTimer);
      }
    }

    return () => {
      TimerPersistenceService.stopCheckpointing();
    };
  }, [boilTimer.isRunning, boilTimer.isPaused, boilTimer]);

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      await NotificationService.initialize();

      // Set up notification listeners
      const foregroundListener = NotificationService.setupForegroundListener(
        notification => {
          // console.log("Foreground notification received:", notification);
          NotificationService.triggerHapticFeedback("heavy");
        }
      );

      const responseListener = NotificationService.setupResponseListener(
        response => {
          // console.log("Notification response:", response);
          // Handle notification tap - could navigate to timer or show alert
        }
      );

      notificationListenersRef.current = {
        foreground: foregroundListener,
        response: responseListener,
      };
    };

    initializeNotifications();

    return () => {
      // Clean up listeners
      if (notificationListenersRef.current.foreground) {
        notificationListenersRef.current.foreground.remove();
      }
      if (notificationListenersRef.current.response) {
        notificationListenersRef.current.response.remove();
      }
    };
  }, []);

  // Timer logic
  // Keep latest state in refs for stable interval tick
  const timeRemainingRef = useRef(boilTimer.timeRemaining);
  const hopAlertsRef = useRef(boilTimer.hopAlerts);
  useEffect(() => {
    timeRemainingRef.current = boilTimer.timeRemaining;
  }, [boilTimer.timeRemaining]);
  useEffect(() => {
    hopAlertsRef.current = boilTimer.hopAlerts;
  }, [boilTimer.hopAlerts]);
  useEffect(() => {
    // If not running or paused, clear any existing interval
    if (!boilTimer.isRunning || boilTimer.isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    // Single stable tick function
    const tick = () => {
      const newTimeRemaining = Math.max(0, timeRemainingRef.current - 1);
      // Update timeRemaining both in state and ref
      dispatch({
        type: "SET_BOIL_TIMER",
        payload: { timeRemaining: newTimeRemaining },
      });
      timeRemainingRef.current = newTimeRemaining;
      // Check for hop additions
      const currentMinutes = Math.ceil(newTimeRemaining / 60);
      const alertsToUpdate = hopAlertsRef.current
        .map((hop, index) => ({ hop, index }))
        .filter(
          ({ hop, index }) =>
            hop.time === currentMinutes &&
            !hop.added &&
            !scheduledHopAlertsRef.current.has(index)
        );
      if (alertsToUpdate.length > 0) {
        alertsToUpdate.forEach(({ hop, index }) => {
          scheduledHopAlertsRef.current.add(index);
          NotificationService.sendImmediateNotification(
            "🍺 Hop Addition Time!",
            `Add ${hop.amount} ${hop.unit} of ${hop.name}`,
            { hopIndex: index }
          );
        });

        const updatedAlerts = hopAlertsRef.current.map((h, i) =>
          alertsToUpdate.some(({ index }) => index === i)
            ? { ...h, alertScheduled: true }
            : h
        );
        hopAlertsRef.current = updatedAlerts;
        dispatch({
          type: "SET_BOIL_TIMER",
          payload: { hopAlerts: updatedAlerts },
        });
      }
      // When timer hits zero, stop and notify
      if (newTimeRemaining === 0) {
        dispatch({
          type: "SET_BOIL_TIMER",
          payload: { isRunning: false, isPaused: false },
        });
        NotificationService.sendImmediateNotification(
          "✅ Boil Complete!",
          "Your boil has finished. Time to cool and transfer!"
        );
        Alert.alert(
          "Boil Complete!",
          "Your boil has finished. Time to cool and transfer!",
          [{ text: "OK" }]
        );
      }
    };
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [boilTimer.isRunning, boilTimer.isPaused, dispatch]);

  const handleManualDurationChange = (value: string) => {
    const duration = parseInt(value) || 60;
    dispatch({
      type: "SET_BOIL_TIMER",
      payload: {
        duration,
        timeRemaining: duration * 60,
        isRecipeMode: false,
      },
    });
  };

  const handleStart = async () => {
    if (boilTimer.timeRemaining <= 0) return;

    // NOTIFICATION BUG FIX NOTES:
    // ===========================
    // If notifications are firing immediately instead of at scheduled times:
    // 1. This could be due to Expo Go limitations (use development build)
    // 2. Check that timeRemaining is calculated correctly
    // 3. Comprehensive debugging has been added below to identify issues
    // 4. Special handling added for hop additions equal to boil duration

    const startTime = Date.now();
    // if (__DEV__) {
    //   console.log(`🚀 Starting boil timer:`);
    //   console.log(`  - Duration: ${boilTimer.duration} minutes`);
    //   console.log(
    //     `  - Time remaining: ${boilTimer.timeRemaining}s (${boilTimer.timeRemaining / 60} min)`
    //   );
    //   console.log(`  - Recipe mode: ${boilTimer.isRecipeMode}`);
    //   console.log(`  - Hop alerts: ${boilTimer.hopAlerts.length}`);
    //   console.log(`  - Start time: ${new Date(startTime).toISOString()}`);
    // }

    // Reset dedupe and ensure a clean schedule on (re)start
    scheduledHopAlertsRef.current.clear();
    await NotificationService.cancelAllAlerts();

    dispatch({
      type: "SET_BOIL_TIMER",
      payload: {
        isRunning: true,
        isPaused: false,
        timerStartedAt: startTime,
      },
    });

    // Schedule notifications for hop additions if in recipe mode
    if (boilTimer.isRecipeMode && boilTimer.hopAlerts.length > 0) {
      // if (__DEV__) {
      //   console.log(
      //     `🍺 Scheduling ${boilTimer.hopAlerts.length} hop alerts for recipe mode`
      //   );
      // }
      await NotificationService.scheduleHopAlertsForRecipe(
        boilTimer.hopAlerts,
        boilTimer.timeRemaining
      );
    }

    // Schedule milestone notifications
    // if (__DEV__) {
    //   console.log(`📅 Scheduling milestone notifications`);
    // }
    await NotificationService.scheduleMilestoneNotifications(
      boilTimer.timeRemaining
    );

    // Schedule boil complete notification
    // if (__DEV__) {
    //   console.log(`✅ Scheduling boil completion notification`);
    // }
    await NotificationService.scheduleBoilCompleteNotification(
      boilTimer.timeRemaining
    );

    if (__DEV__) {
      // console.log(
      //   `🚀 Timer started successfully in ${Date.now() - startTime}ms`
      // );

      // Log all scheduled notifications for debugging
      await NotificationService.logScheduledNotifications();
    }

    NotificationService.triggerHapticFeedback("medium");
  };

  const handlePause = () => {
    dispatch({
      type: "SET_BOIL_TIMER",
      payload: { isPaused: true },
    });
    // Prevent stale notifications from firing while paused
    NotificationService.cancelAllAlerts();
    NotificationService.triggerHapticFeedback("light");
  };

  const handleStop = () => {
    Alert.alert("Stop Timer", "Are you sure you want to stop the timer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop",
        style: "destructive",
        onPress: () => {
          dispatch({
            type: "SET_BOIL_TIMER",
            payload: {
              isRunning: false,
              isPaused: false,
              timerStartedAt: undefined,
            },
          });
          NotificationService.cancelAllAlerts();
          NotificationService.triggerHapticFeedback("heavy");
        },
      },
    ]);
  };

  const handleReset = () => {
    const resetDuration =
      boilTimer.selectedRecipe?.boil_time || boilTimer.duration;

    // Clear scheduled hop alerts ref when resetting timer
    scheduledHopAlertsRef.current.clear();

    dispatch({
      type: "SET_BOIL_TIMER",
      payload: {
        isRunning: false,
        isPaused: false,
        timeRemaining: resetDuration * 60,
        timerStartedAt: undefined,
        hopAlerts: boilTimer.hopAlerts.map(hop => ({
          ...hop,
          added: false,
          alertScheduled: false,
        })),
      },
    });
    NotificationService.cancelAllAlerts();
    NotificationService.triggerHapticFeedback("light");
  };

  const handleMarkHopAdded = (index: number) => {
    dispatch({ type: "MARK_HOP_ADDED", payload: index });
    NotificationService.triggerHapticFeedback("medium");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentMinutes = Math.ceil(boilTimer.timeRemaining / 60);
  const progressPercentage =
    boilTimer.duration > 0
      ? ((boilTimer.duration * 60 - boilTimer.timeRemaining) /
          (boilTimer.duration * 60)) *
        100
      : 0;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID={TEST_IDS.boilTimer.screen}
    >
      <CalculatorHeader title="Boil Timer" />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recipe Selection */}
        <CalculatorCard title="Recipe Selection">
          <RecipeSelector
            selectedRecipe={boilTimer.selectedRecipe || null}
            onRecipeSelect={handleRecipeSelect}
            onManualMode={() => handleRecipeSelect(null)}
            disabled={boilTimer.isRunning}
            testID={TEST_IDS.boilTimer.recipeSelector}
          />

          {!boilTimer.isRecipeMode && (
            <NumberInput
              label="Boil Duration"
              value={boilTimer.duration.toString()}
              onChangeText={handleManualDurationChange}
              placeholder="60"
              unit="minutes"
              min={1}
              max={240}
              step={5}
              precision={0}
              testID={TEST_IDS.boilTimer.durationInput}
              disabled={boilTimer.isRunning}
            />
          )}
        </CalculatorCard>

        {/* Timer Display */}
        <View
          style={[
            styles.timerDisplay,
            { backgroundColor: theme.colors.backgroundSecondary },
          ]}
          testID={TEST_IDS.boilTimer.timerDisplay}
        >
          <View style={styles.timerHeader}>
            <Text
              style={[styles.timerLabel, { color: theme.colors.textSecondary }]}
            >
              {boilTimer.selectedRecipe
                ? boilTimer.selectedRecipe.name
                : "Manual Timer"}
            </Text>
            {boilTimer.selectedRecipe && (
              <Text
                style={[
                  styles.timerStyle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {boilTimer.selectedRecipe.style}
              </Text>
            )}
          </View>

          <Text style={[styles.timerText, { color: theme.colors.text }]}>
            {formatTime(boilTimer.timeRemaining)}
          </Text>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.colors.borderLight },
            ]}
            testID={TEST_IDS.boilTimer.progressBar}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: boilTimer.isRunning
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                  width: `${progressPercentage}%`,
                },
              ]}
            />
          </View>

          <Text
            style={[styles.progressText, { color: theme.colors.textSecondary }]}
          >
            {Math.round(progressPercentage)}% complete
          </Text>
        </View>

        {/* Timer Controls */}
        <TimerControls
          isRunning={boilTimer.isRunning}
          isPaused={boilTimer.isPaused}
          onStart={handleStart}
          onPause={handlePause}
          onStop={handleStop}
          onReset={handleReset}
          disabled={boilTimer.timeRemaining <= 0}
          theme={theme}
        />

        {/* Hop Additions */}
        {boilTimer.hopAlerts.length > 0 && (
          <CalculatorCard title="Hop Additions">
            <Text
              style={[
                styles.hopScheduleSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {boilTimer.hopAlerts.length} hop addition
              {boilTimer.hopAlerts.length !== 1 ? "s" : ""} scheduled
            </Text>

            <View style={styles.hopList}>
              {boilTimer.hopAlerts.map((hop, index) => (
                <HopAdditionCard
                  key={index}
                  hop={hop}
                  index={index}
                  onMarkAdded={handleMarkHopAdded}
                  currentTimeMinutes={currentMinutes}
                  theme={theme}
                />
              ))}
            </View>
          </CalculatorCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  timerDisplay: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  timerHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  timerStyle: {
    fontSize: 14,
    marginTop: 4,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 16,
  },
  progressBar: {
    width: width - 80,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
  },
  timerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: "center",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  hopScheduleSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  hopList: {
    gap: 12,
  },
  hopCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  hopCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hopInfo: {
    flex: 1,
  },
  hopTime: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  hopName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  hopAmount: {
    fontSize: 14,
  },
  addedIndicator: {
    alignItems: "center",
  },
  addedText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
});
