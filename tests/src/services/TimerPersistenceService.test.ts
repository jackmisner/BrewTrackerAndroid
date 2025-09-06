/**
 * Tests for TimerPersistenceService
 *
 * Tests timer state persistence, checkpointing, and app lifecycle management
 */

import {
  TimerPersistenceService,
  TimerCheckpoint,
} from "@src/services/TimerPersistenceService";
import { BoilTimerState } from "@contexts/CalculatorsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe("TimerPersistenceService", () => {
  const mockSetItem = AsyncStorage.setItem as jest.Mock;
  const mockGetItem = AsyncStorage.getItem as jest.Mock;
  const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
  const mockGetAllKeys = AsyncStorage.getAllKeys as jest.Mock;
  const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;

  // Mock timer state data
  const mockTimerState: BoilTimerState = {
    duration: 60,
    isRunning: true,
    timeRemaining: 1800, // 30 minutes
    additions: [
      { time: 60, description: "Bittering hops", completed: false },
      { time: 15, description: "Aroma hops", completed: false },
    ],
    recipeId: "recipe-123",
    selectedRecipe: {
      id: "recipe-123",
      name: "Test IPA",
      style: "American IPA",
    } as any,
    hopAlerts: [
      {
        time: 60,
        name: "Cascade",
        amount: 1,
        unit: "oz",
        added: false,
        alertScheduled: true,
      },
      {
        time: 15,
        name: "Centennial",
        amount: 0.5,
        unit: "oz",
        added: false,
        alertScheduled: true,
      },
    ],
    isRecipeMode: true,
    preTimerCountdown: 0,
    isPaused: false,
    timerStartedAt: Date.now() - 30 * 60 * 1000, // Started 30 minutes ago
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset static state
    (TimerPersistenceService as any).checkpointInterval = null;
    (TimerPersistenceService as any).lastSavedState = null;

    // Default mock returns
    mockSetItem.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
    mockRemoveItem.mockResolvedValue(undefined);
    mockGetAllKeys.mockResolvedValue([]);
    mockMultiRemove.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    TimerPersistenceService.stopCheckpointing();
  });

  describe("saveTimerState", () => {
    it("should save timer state successfully", async () => {
      const result =
        await TimerPersistenceService.saveTimerState(mockTimerState);

      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        "brewtracker_boil_timer_state",
        expect.stringContaining('"duration":60')
      );

      // Verify the saved data structure
      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData).toHaveProperty("timerState");
      expect(savedData).toHaveProperty("savedAt");
      expect(savedData).toHaveProperty("appVersion");
      expect(savedData.timerState.duration).toBe(60);
    });

    it("should extract only serializable properties", async () => {
      await TimerPersistenceService.saveTimerState(mockTimerState);

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      const timerState = savedData.timerState;

      // Should include these properties
      expect(timerState).toHaveProperty("duration");
      expect(timerState).toHaveProperty("isRunning");
      expect(timerState).toHaveProperty("timeRemaining");
      expect(timerState).toHaveProperty("hopAlerts");
      expect(timerState.hopAlerts).toHaveLength(2);

      // Hop alerts should have required properties
      expect(timerState.hopAlerts[0]).toHaveProperty("time");
      expect(timerState.hopAlerts[0]).toHaveProperty("name");
      expect(timerState.hopAlerts[0]).toHaveProperty("added");
    });

    it("should handle save errors gracefully", async () => {
      mockSetItem.mockRejectedValue(new Error("Storage error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result =
        await TimerPersistenceService.saveTimerState(mockTimerState);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save timer state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should update last saved state", async () => {
      await TimerPersistenceService.saveTimerState(mockTimerState);

      expect((TimerPersistenceService as any).lastSavedState).toBe(
        mockTimerState
      );
    });
  });

  describe("loadTimerState", () => {
    it("should return null when no stored state", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await TimerPersistenceService.loadTimerState();

      expect(result).toBeNull();
      expect(mockGetItem).toHaveBeenCalledWith("brewtracker_boil_timer_state");
    });

    it("should load and return valid timer state", async () => {
      const checkpoint: TimerCheckpoint = {
        timerState: mockTimerState,
        savedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
        appVersion: "0.15.1",
      };
      mockGetItem.mockResolvedValue(JSON.stringify(checkpoint));

      const result = await TimerPersistenceService.loadTimerState();

      expect(result).toBeDefined();
      expect(result?.duration).toBe(60);
      expect(result?.recipeId).toBe("recipe-123");
    });

    it("should clear old timer state (>24 hours)", async () => {
      const oldCheckpoint: TimerCheckpoint = {
        timerState: mockTimerState,
        savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        appVersion: "0.15.1",
      };
      mockGetItem.mockResolvedValue(JSON.stringify(oldCheckpoint));

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const result = await TimerPersistenceService.loadTimerState();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Timer state too old, ignoring");
      expect(mockRemoveItem).toHaveBeenCalledWith(
        "brewtracker_boil_timer_state"
      );
      consoleSpy.mockRestore();
    });

    it("should update time remaining for running timer", async () => {
      const runningTimer = {
        ...mockTimerState,
        isRunning: true,
        isPaused: false,
        timeRemaining: 1800, // 30 minutes
      };
      const checkpoint: TimerCheckpoint = {
        timerState: runningTimer,
        savedAt: Date.now() - 5 * 60 * 1000, // Saved 5 minutes ago
        appVersion: "0.15.1",
      };
      mockGetItem.mockResolvedValue(JSON.stringify(checkpoint));

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const result = await TimerPersistenceService.loadTimerState();

      expect(result).toBeDefined();
      expect(result?.timeRemaining).toBe(1500); // 1800 - 300 (5 minutes elapsed)
      expect(result?.isRunning).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Timer restored: 300s elapsed, 1500s remaining")
      );
      consoleSpy.mockRestore();
    });

    it("should stop timer if time has run out", async () => {
      const runningTimer = {
        ...mockTimerState,
        isRunning: true,
        isPaused: false,
        timeRemaining: 180, // 3 minutes
      };
      const checkpoint: TimerCheckpoint = {
        timerState: runningTimer,
        savedAt: Date.now() - 5 * 60 * 1000, // Saved 5 minutes ago
        appVersion: "0.15.1",
      };
      mockGetItem.mockResolvedValue(JSON.stringify(checkpoint));

      const result = await TimerPersistenceService.loadTimerState();

      expect(result).toBeDefined();
      expect(result?.timeRemaining).toBe(0);
      expect(result?.isRunning).toBe(false); // Should stop timer
      expect(result?.isPaused).toBe(false);
    });

    it("should not update time for paused timer", async () => {
      const pausedTimer = {
        ...mockTimerState,
        isRunning: true,
        isPaused: true,
        timeRemaining: 1800,
      };
      const checkpoint: TimerCheckpoint = {
        timerState: pausedTimer,
        savedAt: Date.now() - 5 * 60 * 1000,
        appVersion: "0.15.1",
      };
      mockGetItem.mockResolvedValue(JSON.stringify(checkpoint));

      const result = await TimerPersistenceService.loadTimerState();

      expect(result?.timeRemaining).toBe(1800); // Should not change
      expect(result?.isPaused).toBe(true);
    });

    it("should handle load errors gracefully", async () => {
      mockGetItem.mockRejectedValue(new Error("Storage error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await TimerPersistenceService.loadTimerState();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load timer state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should handle invalid JSON gracefully", async () => {
      mockGetItem.mockResolvedValue("invalid json");

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await TimerPersistenceService.loadTimerState();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load timer state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("clearTimerState", () => {
    it("should clear stored timer state", async () => {
      await TimerPersistenceService.clearTimerState();

      expect(mockRemoveItem).toHaveBeenCalledWith(
        "brewtracker_boil_timer_state"
      );
      expect((TimerPersistenceService as any).lastSavedState).toBeNull();
    });

    it("should handle clear errors gracefully", async () => {
      mockRemoveItem.mockRejectedValue(new Error("Remove error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await TimerPersistenceService.clearTimerState();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to clear timer state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("checkpointing", () => {
    it("should start checkpointing with interval", () => {
      const getCurrentState = jest.fn().mockReturnValue(mockTimerState);
      const onStateChanged = jest.fn();

      TimerPersistenceService.startCheckpointing(
        getCurrentState,
        onStateChanged
      );

      expect((TimerPersistenceService as any).checkpointInterval).toBeDefined();
    });

    it("should clear existing interval before starting new one", () => {
      const getCurrentState = jest.fn().mockReturnValue(mockTimerState);

      // Start first checkpoint
      TimerPersistenceService.startCheckpointing(getCurrentState);
      const firstInterval = (TimerPersistenceService as any).checkpointInterval;

      // Start second checkpoint
      TimerPersistenceService.startCheckpointing(getCurrentState);
      const secondInterval = (TimerPersistenceService as any)
        .checkpointInterval;

      expect(firstInterval).not.toBe(secondInterval);
    });

    it("should save state during checkpoint if running and changed", done => {
      mockSetItem.mockImplementation(() => {
        // Call done when save is triggered
        done();
        return Promise.resolve();
      });

      const getCurrentState = jest.fn().mockReturnValue({
        ...mockTimerState,
        isRunning: true,
        timeRemaining: 1700, // Different from last saved
      });
      const onStateChanged = jest.fn();

      TimerPersistenceService.startCheckpointing(
        getCurrentState,
        onStateChanged
      );

      // Advance timer to trigger checkpoint
      jest.advanceTimersByTime(5000);
    });

    it("should not save state if timer is not running", () => {
      const getCurrentState = jest.fn().mockReturnValue({
        ...mockTimerState,
        isRunning: false,
      });

      TimerPersistenceService.startCheckpointing(getCurrentState);

      jest.advanceTimersByTime(5000);

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it("should stop checkpointing", () => {
      const getCurrentState = jest.fn().mockReturnValue(mockTimerState);

      TimerPersistenceService.startCheckpointing(getCurrentState);
      expect((TimerPersistenceService as any).checkpointInterval).toBeDefined();

      TimerPersistenceService.stopCheckpointing();
      expect((TimerPersistenceService as any).checkpointInterval).toBeNull();
    });
  });

  describe("hasStateChanged", () => {
    it("should return true when no previous state", () => {
      (TimerPersistenceService as any).lastSavedState = null;

      const hasChanged = (TimerPersistenceService as any).hasStateChanged(
        mockTimerState
      );

      expect(hasChanged).toBe(true);
    });

    it("should detect time remaining changes", () => {
      (TimerPersistenceService as any).lastSavedState = mockTimerState;

      const changedState = { ...mockTimerState, timeRemaining: 1700 };
      const hasChanged = (TimerPersistenceService as any).hasStateChanged(
        changedState
      );

      expect(hasChanged).toBe(true);
    });

    it("should detect running state changes", () => {
      (TimerPersistenceService as any).lastSavedState = mockTimerState;

      const changedState = { ...mockTimerState, isRunning: false };
      const hasChanged = (TimerPersistenceService as any).hasStateChanged(
        changedState
      );

      expect(hasChanged).toBe(true);
    });

    it("should detect pause state changes", () => {
      (TimerPersistenceService as any).lastSavedState = mockTimerState;

      const changedState = { ...mockTimerState, isPaused: true };
      const hasChanged = (TimerPersistenceService as any).hasStateChanged(
        changedState
      );

      expect(hasChanged).toBe(true);
    });

    it("should detect hop alert changes", () => {
      (TimerPersistenceService as any).lastSavedState = mockTimerState;

      const changedHopAlerts = [...mockTimerState.hopAlerts];
      changedHopAlerts[0] = { ...changedHopAlerts[0], added: true };

      const changedState = { ...mockTimerState, hopAlerts: changedHopAlerts };
      const hasChanged = (TimerPersistenceService as any).hasStateChanged(
        changedState
      );

      expect(hasChanged).toBe(true);
    });

    it("should return false when no meaningful changes", () => {
      (TimerPersistenceService as any).lastSavedState = mockTimerState;

      const unchangedState = { ...mockTimerState };
      const hasChanged = (TimerPersistenceService as any).hasStateChanged(
        unchangedState
      );

      expect(hasChanged).toBe(false);
    });
  });

  describe("app lifecycle", () => {
    it("should handle app background", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await TimerPersistenceService.handleAppBackground(mockTimerState);

      expect(consoleSpy).toHaveBeenCalledWith(
        "App going to background, saving timer state"
      );
      expect(mockSetItem).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should calculate correct timerStartedAt on background", async () => {
      await TimerPersistenceService.handleAppBackground(mockTimerState);

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.timerState).toHaveProperty("timerStartedAt");
      expect(typeof savedData.timerState.timerStartedAt).toBe("number");
    });

    it("should not save when timer is not running on background", async () => {
      const stoppedTimer = { ...mockTimerState, isRunning: false };

      await TimerPersistenceService.handleAppBackground(stoppedTimer);

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it("should handle app foreground", async () => {
      const checkpoint: TimerCheckpoint = {
        timerState: mockTimerState,
        savedAt: Date.now() - 60000,
        appVersion: "0.15.1",
      };
      mockGetItem.mockResolvedValue(JSON.stringify(checkpoint));

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const result = await TimerPersistenceService.handleAppForeground();

      expect(consoleSpy).toHaveBeenCalledWith(
        "App returning to foreground, checking timer state"
      );
      expect(result).toBeDefined();
      consoleSpy.mockRestore();
    });

    it("should mark completed timer on foreground return", async () => {
      const completedTimer = {
        ...mockTimerState,
        isRunning: true,
        timeRemaining: 0, // Timer completed
      };
      const checkpoint: TimerCheckpoint = {
        timerState: completedTimer,
        savedAt: Date.now() - 60000,
        appVersion: "0.15.1",
      };
      mockGetItem.mockResolvedValue(JSON.stringify(checkpoint));

      const result = await TimerPersistenceService.handleAppForeground();

      expect(result?.isRunning).toBe(false);
      expect(result?.isPaused).toBe(false);
      expect(result?.timeRemaining).toBe(0);
    });
  });

  describe("storage info", () => {
    it("should return info when state exists", async () => {
      const checkpoint: TimerCheckpoint = {
        timerState: mockTimerState,
        savedAt: 1640000000000, // Fixed timestamp
        appVersion: "0.15.1",
      };
      const storedData = JSON.stringify(checkpoint);
      mockGetItem.mockResolvedValue(storedData);

      const info = await TimerPersistenceService.getStorageInfo();

      expect(info.hasStoredState).toBe(true);
      expect(info.stateSize).toBe(storedData.length);
      expect(info.lastSaved).toEqual(new Date(1640000000000));
    });

    it("should return empty info when no state", async () => {
      mockGetItem.mockResolvedValue(null);

      const info = await TimerPersistenceService.getStorageInfo();

      expect(info.hasStoredState).toBe(false);
      expect(info.stateSize).toBe(0);
      expect(info.lastSaved).toBeNull();
    });

    it("should handle storage info errors", async () => {
      mockGetItem.mockRejectedValue(new Error("Storage error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const info = await TimerPersistenceService.getStorageInfo();

      expect(info.hasStoredState).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get storage info:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("migration", () => {
    it("should migrate old timer state keys", async () => {
      mockGetAllKeys.mockResolvedValue([
        "brewtracker_old_timer_key",
        "brewtracker_another_timer_old",
        "brewtracker_boil_timer_state", // Current key - should not be removed
        "other_app_key", // Other app key - should not be removed
      ]);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      await TimerPersistenceService.migrateOldState();

      expect(mockMultiRemove).toHaveBeenCalledWith([
        "brewtracker_old_timer_key",
        "brewtracker_another_timer_old",
      ]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Found old timer state keys, cleaning up:",
        ["brewtracker_old_timer_key", "brewtracker_another_timer_old"]
      );
      consoleSpy.mockRestore();
    });

    it("should not migrate when no old keys found", async () => {
      mockGetAllKeys.mockResolvedValue([
        "brewtracker_boil_timer_state",
        "other_key",
      ]);

      await TimerPersistenceService.migrateOldState();

      expect(mockMultiRemove).not.toHaveBeenCalled();
    });

    it("should handle migration errors", async () => {
      mockGetAllKeys.mockRejectedValue(new Error("Keys error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await TimerPersistenceService.migrateOldState();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to migrate old state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("import/export", () => {
    it("should export timer state", async () => {
      const stateData = JSON.stringify({ test: "data" });
      mockGetItem.mockResolvedValue(stateData);

      const result = await TimerPersistenceService.exportTimerState();

      expect(result).toBe(stateData);
      expect(mockGetItem).toHaveBeenCalledWith("brewtracker_boil_timer_state");
    });

    it("should handle export errors", async () => {
      mockGetItem.mockRejectedValue(new Error("Export error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await TimerPersistenceService.exportTimerState();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to export timer state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should import valid timer state", async () => {
      const checkpoint: TimerCheckpoint = {
        timerState: mockTimerState,
        savedAt: Date.now(),
        appVersion: "0.15.1",
      };
      const stateJson = JSON.stringify(checkpoint);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const result = await TimerPersistenceService.importTimerState(stateJson);

      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        "brewtracker_boil_timer_state",
        stateJson
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Timer state imported successfully"
      );
      consoleSpy.mockRestore();
    });

    it("should reject invalid import format", async () => {
      const invalidJson = JSON.stringify({ invalid: "format" });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result =
        await TimerPersistenceService.importTimerState(invalidJson);

      expect(result).toBe(false);
      expect(mockSetItem).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to import timer state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should handle invalid JSON on import", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result =
        await TimerPersistenceService.importTimerState("invalid json");

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to import timer state:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
