/**
 * Timer Persistence Service
 *
 * Handles saving and restoring timer state across app sessions,
 * background/foreground transitions, and app restarts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BoilTimerState } from "@contexts/CalculatorsContext";

const TIMER_STORAGE_KEY = "brewtracker_boil_timer_state";
const TIMER_CHECKPOINT_INTERVAL = 5000; // Save every 5 seconds when running

export interface TimerCheckpoint {
  timerState: BoilTimerState;
  savedAt: number;
  appVersion: string;
}

export class TimerPersistenceService {
  private static checkpointInterval: ReturnType<typeof setInterval> | null =
    null;
  private static lastSavedState: BoilTimerState | null = null;

  /**
   * Extract only serializable properties from timer state
   */
  private static getSerializableTimerState(
    timerState: BoilTimerState
  ): BoilTimerState {
    return {
      duration: timerState.duration,
      isRunning: timerState.isRunning,
      timeRemaining: timerState.timeRemaining,
      additions: timerState.additions,
      recipeId: timerState.recipeId,
      selectedRecipe: timerState.selectedRecipe,
      hopAlerts: timerState.hopAlerts.map(alert => ({
        time: alert.time,
        name: alert.name,
        amount: alert.amount,
        unit: alert.unit,
        added: alert.added,
        alertScheduled: alert.alertScheduled,
      })),
      isRecipeMode: timerState.isRecipeMode,
      preTimerCountdown: timerState.preTimerCountdown,
      isPaused: timerState.isPaused,
      timerStartedAt: timerState.timerStartedAt,
    };
  }

  /**
   * Save timer state to persistent storage
   */
  public static async saveTimerState(
    timerState: BoilTimerState
  ): Promise<boolean> {
    try {
      const checkpoint: TimerCheckpoint = {
        timerState: this.getSerializableTimerState(timerState),
        savedAt: Date.now(),
        appVersion: "0.15.1", // Could be dynamically imported from package.json
      };

      await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(checkpoint));
      this.lastSavedState = timerState;
      return true;
    } catch (error) {
      console.error("Failed to save timer state:", error);
      return false;
    }
  }

  /**
   * Load timer state from persistent storage
   */
  public static async loadTimerState(): Promise<BoilTimerState | null> {
    try {
      const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const checkpoint: TimerCheckpoint = JSON.parse(stored);

      // Check if stored state is too old (more than 24 hours)
      const ageHours = (Date.now() - checkpoint.savedAt) / (1000 * 60 * 60);
      if (ageHours > 24) {
        console.log("Timer state too old, ignoring");
        await this.clearTimerState();
        return null;
      }

      // If timer was running, calculate how much time has passed
      let restoredState = checkpoint.timerState;

      if (checkpoint.timerState.isRunning && !checkpoint.timerState.isPaused) {
        const elapsedSeconds = Math.floor(
          (Date.now() - checkpoint.savedAt) / 1000
        );
        const newTimeRemaining = Math.max(
          0,
          checkpoint.timerState.timeRemaining - elapsedSeconds
        );

        restoredState = {
          ...checkpoint.timerState,
          timeRemaining: newTimeRemaining,
          // Stop timer if time has run out
          isRunning: newTimeRemaining > 0,
          isPaused: false,
        };

        console.log(
          `Timer restored: ${elapsedSeconds}s elapsed, ${newTimeRemaining}s remaining`
        );
      }

      return restoredState;
    } catch (error) {
      console.error("Failed to load timer state:", error);
      return null;
    }
  }

  /**
   * Clear persisted timer state
   */
  public static async clearTimerState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
      this.lastSavedState = null;
    } catch (error) {
      console.error("Failed to clear timer state:", error);
    }
  }

  /**
   * Start automatic checkpointing when timer is running
   */
  public static startCheckpointing(
    getCurrentState: () => BoilTimerState,
    onStateChanged?: (state: BoilTimerState) => void
  ): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
    }

    this.checkpointInterval = setInterval(async () => {
      const currentState = getCurrentState();

      // Only save if timer is running and state has changed
      if (currentState.isRunning && this.hasStateChanged(currentState)) {
        const saved = await this.saveTimerState(currentState);
        if (saved && onStateChanged) {
          onStateChanged(currentState);
        }
      }
    }, TIMER_CHECKPOINT_INTERVAL);
  }

  /**
   * Stop automatic checkpointing
   */
  public static stopCheckpointing(): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = null;
    }
  }

  /**
   * Check if timer state has meaningfully changed since last save
   */
  private static hasStateChanged(currentState: BoilTimerState): boolean {
    if (!this.lastSavedState) {
      return true;
    }

    // Check key properties that indicate meaningful change
    return (
      this.lastSavedState.timeRemaining !== currentState.timeRemaining ||
      this.lastSavedState.isRunning !== currentState.isRunning ||
      this.lastSavedState.isPaused !== currentState.isPaused ||
      JSON.stringify(this.lastSavedState.hopAlerts) !==
        JSON.stringify(currentState.hopAlerts)
    );
  }

  /**
   * Handle app going to background
   */
  public static async handleAppBackground(
    timerState: BoilTimerState
  ): Promise<void> {
    console.log("App going to background, saving timer state");

    if (timerState.isRunning) {
      const serializableState = this.getSerializableTimerState(timerState);
      await this.saveTimerState({
        ...serializableState,
        // Mark the exact time when app went to background
        timerStartedAt:
          Date.now() -
          (timerState.duration * 60 - timerState.timeRemaining) * 1000,
      });
    }
  }

  /**
   * Handle app returning to foreground
   */
  public static async handleAppForeground(): Promise<BoilTimerState | null> {
    console.log("App returning to foreground, checking timer state");

    const restoredState = await this.loadTimerState();

    if (restoredState && restoredState.isRunning) {
      console.log("Timer was running, restored with updated time");

      // If timer completed while in background, mark as completed
      if (restoredState.timeRemaining <= 0) {
        return {
          ...restoredState,
          isRunning: false,
          isPaused: false,
          timeRemaining: 0,
        };
      }
    }

    return restoredState;
  }

  /**
   * Get storage usage information for debugging
   */
  public static async getStorageInfo(): Promise<{
    hasStoredState: boolean;
    stateSize: number;
    lastSaved: Date | null;
  }> {
    try {
      const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);

      if (!stored) {
        return {
          hasStoredState: false,
          stateSize: 0,
          lastSaved: null,
        };
      }

      const checkpoint: TimerCheckpoint = JSON.parse(stored);

      return {
        hasStoredState: true,
        stateSize: stored.length,
        lastSaved: new Date(checkpoint.savedAt),
      };
    } catch (error) {
      console.error("Failed to get storage info:", error);
      return {
        hasStoredState: false,
        stateSize: 0,
        lastSaved: null,
      };
    }
  }

  /**
   * Migrate old timer state format if needed
   */
  public static async migrateOldState(): Promise<void> {
    try {
      // Check for any old timer state keys and migrate if necessary
      // This would be used if we change the state format in the future
      const keys = await AsyncStorage.getAllKeys();
      const timerKeys = keys.filter(
        key =>
          key.startsWith("brewtracker_") &&
          key.includes("timer") &&
          key !== TIMER_STORAGE_KEY
      );

      if (timerKeys.length > 0) {
        console.log("Found old timer state keys, cleaning up:", timerKeys);
        await AsyncStorage.multiRemove(timerKeys);
      }
    } catch (error) {
      console.error("Failed to migrate old state:", error);
    }
  }

  /**
   * Export timer state for debugging or backup
   */
  public static async exportTimerState(): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      return stored;
    } catch (error) {
      console.error("Failed to export timer state:", error);
      return null;
    }
  }

  /**
   * Import timer state from backup
   */
  public static async importTimerState(stateJson: string): Promise<boolean> {
    try {
      // Validate the JSON first
      const checkpoint: TimerCheckpoint = JSON.parse(stateJson);

      if (!checkpoint.timerState || !checkpoint.savedAt) {
        throw new Error("Invalid timer state format");
      }

      await AsyncStorage.setItem(TIMER_STORAGE_KEY, stateJson);
      console.log("Timer state imported successfully");
      return true;
    } catch (error) {
      console.error("Failed to import timer state:", error);
      return false;
    }
  }
}
