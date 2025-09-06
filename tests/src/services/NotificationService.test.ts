/**
 * Tests for NotificationService
 *
 * Tests notification scheduling, permissions, haptic feedback, and hop alerts
 */

import {
  NotificationService,
  HopAlert,
} from "@src/services/NotificationService";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: {
    HIGH: "HIGH",
  },
  AndroidNotificationPriority: {
    HIGH: "HIGH",
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: "timeInterval",
  },
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "Light",
    Medium: "Medium",
    Heavy: "Heavy",
  },
}));

// Mock Platform - Android only
jest.mock("react-native", () => ({
  Platform: {
    OS: "android", // Android-only development
  },
}));

describe("NotificationService", () => {
  const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
  const mockRequestPermissions =
    Notifications.requestPermissionsAsync as jest.Mock;
  const mockScheduleNotification =
    Notifications.scheduleNotificationAsync as jest.Mock;
  const mockSetNotificationHandler =
    Notifications.setNotificationHandler as jest.Mock;
  const mockSetNotificationChannel =
    Notifications.setNotificationChannelAsync as jest.Mock;
  const mockCancelAll =
    Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
  const mockCancelSpecific =
    Notifications.cancelScheduledNotificationAsync as jest.Mock;
  const mockGetScheduled =
    Notifications.getAllScheduledNotificationsAsync as jest.Mock;
  const mockHapticImpact = Haptics.impactAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static state
    (NotificationService as any).isInitialized = false;
    (NotificationService as any).notificationIdentifiers = [];

    // Default mock returns
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockScheduleNotification.mockResolvedValue("mock-notification-id");
    mockSetNotificationHandler.mockImplementation(() => {});
    mockSetNotificationChannel.mockResolvedValue(undefined);
    mockCancelAll.mockResolvedValue(undefined);
    mockCancelSpecific.mockResolvedValue(undefined);
    mockGetScheduled.mockResolvedValue([]);
    mockHapticImpact.mockResolvedValue(undefined);
  });

  describe("initialize", () => {
    it("should initialize successfully with granted permissions", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });

      const result = await NotificationService.initialize();

      expect(result).toBe(true);
      expect(mockSetNotificationHandler).toHaveBeenCalled();
      expect(mockGetPermissions).toHaveBeenCalled();
    });

    it("should request permissions if not granted", async () => {
      mockGetPermissions.mockResolvedValue({ status: "denied" });
      mockRequestPermissions.mockResolvedValue({ status: "granted" });

      const result = await NotificationService.initialize();

      expect(result).toBe(true);
      expect(mockGetPermissions).toHaveBeenCalled();
      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it("should return false if permissions denied", async () => {
      mockGetPermissions.mockResolvedValue({ status: "denied" });
      mockRequestPermissions.mockResolvedValue({ status: "denied" });

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const result = await NotificationService.initialize();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Notification permissions not granted"
      );
      consoleSpy.mockRestore();
    });

    it("should set up Android notification channel", async () => {
      (Platform as any).OS = "android";
      mockGetPermissions.mockResolvedValue({ status: "granted" });

      const result = await NotificationService.initialize();

      expect(result).toBe(true);
      expect(mockSetNotificationChannel).toHaveBeenCalledWith("boil-timer", {
        name: "Boil Timer",
        importance: "HIGH",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#f4511e",
        sound: "default",
        description: "Notifications for hop additions and boil timer events",
      });
    });

    it("should return true if already initialized", async () => {
      // First initialization
      await NotificationService.initialize();
      jest.clearAllMocks();

      // Second initialization
      const result = await NotificationService.initialize();

      expect(result).toBe(true);
      expect(mockGetPermissions).not.toHaveBeenCalled();
      expect(mockSetNotificationHandler).not.toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      mockGetPermissions.mockRejectedValue(new Error("Permission error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await NotificationService.initialize();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to initialize notifications:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("scheduleHopAlert", () => {
    it("should schedule hop alert successfully", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue("hop-alert-123");

      const identifier = await NotificationService.scheduleHopAlert(
        "Cascade",
        1.5,
        "oz",
        1800 // 30 minutes
      );

      expect(identifier).toBe("hop-alert-123");
      expect(mockScheduleNotification).toHaveBeenCalledWith({
        content: {
          title: "🍺 Hop Addition Time!",
          body: "Add 1.5 oz of Cascade",
          sound: "default",
          priority: "HIGH",
          data: {
            type: "hop_addition",
            hopName: "Cascade",
            amount: 1.5,
            unit: "oz",
          },
        },
        trigger: {
          type: expect.any(String),
          seconds: 1800,
          channelId: "boil-timer",
        },
      });
    });

    it("should return null if initialization fails", async () => {
      mockGetPermissions.mockResolvedValue({ status: "denied" });
      mockRequestPermissions.mockResolvedValue({ status: "denied" });

      const identifier = await NotificationService.scheduleHopAlert(
        "Cascade",
        1,
        "oz",
        1800
      );

      expect(identifier).toBeNull();
      expect(mockScheduleNotification).not.toHaveBeenCalled();
    });

    it("should handle scheduling errors", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockRejectedValue(new Error("Scheduling error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const identifier = await NotificationService.scheduleHopAlert(
        "Cascade",
        1,
        "oz",
        1800
      );

      expect(identifier).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to schedule hop alert:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("scheduleTimerAlert", () => {
    it("should schedule timer alert successfully", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue("timer-alert-456");

      const identifier = await NotificationService.scheduleTimerAlert(
        "Boil Complete",
        "Time to cool!",
        3600,
        { milestone: "end" }
      );

      expect(identifier).toBe("timer-alert-456");
      expect(mockScheduleNotification).toHaveBeenCalledWith({
        content: {
          title: "Boil Complete",
          body: "Time to cool!",
          sound: "default",
          priority: "HIGH",
          vibrate: [0, 250, 250, 250],
          data: {
            type: "timer_alert",
            milestone: "end",
          },
        },
        trigger: {
          type: expect.any(String),
          seconds: 3600,
          channelId: "boil-timer",
        },
      });
    });

    it("should use empty data object by default", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue("timer-alert-789");

      await NotificationService.scheduleTimerAlert(
        "Test Title",
        "Test Body",
        1800
      );

      expect(mockScheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            data: {
              type: "timer_alert",
            },
          }),
        })
      );
    });
  });

  describe("scheduleMilestoneNotifications", () => {
    it("should schedule milestone notifications for 60 minute boil", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue("milestone-id");

      await NotificationService.scheduleMilestoneNotifications(3600); // 60 minutes

      // Should schedule 5 milestones: 30min, 15min, 10min, 5min, 1min
      expect(mockScheduleNotification).toHaveBeenCalledTimes(5);

      // Check 30-minute milestone
      expect(mockScheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: "⏰ Boil Timer Update",
            body: "30 minutes remaining in boil",
            data: { type: "timer_alert", milestone: 1800 },
          }),
          trigger: expect.objectContaining({
            seconds: 1800, // 60min - 30min = 30min
          }),
        })
      );
    });

    it("should only schedule applicable milestones for short boils", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue("milestone-id");

      await NotificationService.scheduleMilestoneNotifications(600); // 10 minutes

      // Should only schedule 5min and 1min milestones
      expect(mockScheduleNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe("scheduleBoilCompleteNotification", () => {
    it("should schedule boil completion notification", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue("boil-complete-id");

      const identifier =
        await NotificationService.scheduleBoilCompleteNotification(3600);

      expect(identifier).toBe("boil-complete-id");
      expect(mockScheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: "✅ Boil Complete!",
            body: "Your boil has finished. Time to cool and transfer!",
            data: { type: "boil_complete" },
          }),
          trigger: expect.objectContaining({
            seconds: 3600,
          }),
        })
      );
    });
  });

  describe("cancelAllAlerts", () => {
    it("should cancel all notifications", async () => {
      await NotificationService.cancelAllAlerts();

      expect(mockCancelAll).toHaveBeenCalled();
    });

    it("should clear notification identifiers", async () => {
      // Add some identifiers first
      (NotificationService as any).notificationIdentifiers = ["id1", "id2"];

      await NotificationService.cancelAllAlerts();

      expect((NotificationService as any).notificationIdentifiers).toEqual([]);
    });

    it("should handle cancellation errors", async () => {
      mockCancelAll.mockRejectedValue(new Error("Cancel error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await NotificationService.cancelAllAlerts();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to cancel notifications:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("cancelAlert", () => {
    it("should cancel specific notification", async () => {
      const identifier = "test-id-123";
      (NotificationService as any).notificationIdentifiers = [
        identifier,
        "other-id",
      ];

      await NotificationService.cancelAlert(identifier);

      expect(mockCancelSpecific).toHaveBeenCalledWith(identifier);
      expect((NotificationService as any).notificationIdentifiers).toEqual([
        "other-id",
      ]);
    });

    it("should handle cancellation errors", async () => {
      mockCancelSpecific.mockRejectedValue(new Error("Cancel specific error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await NotificationService.cancelAlert("test-id");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to cancel notification:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("triggerHapticFeedback", () => {
    it("should trigger light haptic feedback", async () => {
      await NotificationService.triggerHapticFeedback("light");

      expect(mockHapticImpact).toHaveBeenCalledWith("Light");
    });

    it("should trigger medium haptic feedback by default", async () => {
      await NotificationService.triggerHapticFeedback();

      expect(mockHapticImpact).toHaveBeenCalledWith("Medium");
    });

    it("should trigger heavy haptic feedback", async () => {
      await NotificationService.triggerHapticFeedback("heavy");

      expect(mockHapticImpact).toHaveBeenCalledWith("Heavy");
    });

    it("should handle haptic feedback errors", async () => {
      mockHapticImpact.mockRejectedValue(new Error("Haptic error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await NotificationService.triggerHapticFeedback("medium");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to trigger haptic feedback:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("sendImmediateNotification", () => {
    it("should send immediate notification", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });

      await NotificationService.sendImmediateNotification(
        "Test Title",
        "Test Body",
        { custom: "data" }
      );

      expect(mockScheduleNotification).toHaveBeenCalledWith({
        content: {
          title: "Test Title",
          body: "Test Body",
          sound: "default",
          priority: "HIGH",
          vibrate: [0, 250, 250, 250],
          data: { custom: "data" },
        },
        trigger: null,
      });
      expect(mockHapticImpact).toHaveBeenCalledWith("Medium");
    });

    it("should use empty data by default", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });

      await NotificationService.sendImmediateNotification("Title", "Body");

      expect(mockScheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            data: {},
          }),
        })
      );
    });

    it("should not send if initialization fails", async () => {
      mockGetPermissions.mockResolvedValue({ status: "denied" });
      mockRequestPermissions.mockResolvedValue({ status: "denied" });

      await NotificationService.sendImmediateNotification("Title", "Body");

      expect(mockScheduleNotification).not.toHaveBeenCalled();
    });
  });

  describe("areNotificationsEnabled", () => {
    it("should return true when permissions granted", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });

      const result = await NotificationService.areNotificationsEnabled();

      expect(result).toBe(true);
    });

    it("should return false when permissions denied", async () => {
      mockGetPermissions.mockResolvedValue({ status: "denied" });

      const result = await NotificationService.areNotificationsEnabled();

      expect(result).toBe(false);
    });

    it("should handle permission check errors", async () => {
      mockGetPermissions.mockRejectedValue(new Error("Permission check error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await NotificationService.areNotificationsEnabled();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to check notification permissions:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getScheduledNotifications", () => {
    it("should return scheduled notifications", async () => {
      const mockNotifications = [
        { identifier: "test1", content: { title: "Test 1" } },
        { identifier: "test2", content: { title: "Test 2" } },
      ];
      mockGetScheduled.mockResolvedValue(mockNotifications);

      const result = await NotificationService.getScheduledNotifications();

      expect(result).toEqual(mockNotifications);
      expect(mockGetScheduled).toHaveBeenCalled();
    });

    it("should return empty array on error", async () => {
      mockGetScheduled.mockRejectedValue(new Error("Get scheduled error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await NotificationService.getScheduledNotifications();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get scheduled notifications:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("scheduleHopAlertsForRecipe", () => {
    const mockHopAlerts: HopAlert[] = [
      { time: 60, name: "Bittering", amount: 1, unit: "oz" },
      { time: 15, name: "Aroma", amount: 0.5, unit: "oz" },
      { time: 0, name: "Whirlpool", amount: 1, unit: "oz" },
    ];

    it("should schedule hop alerts for recipe", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue("hop-id");

      const result = await NotificationService.scheduleHopAlertsForRecipe(
        mockHopAlerts,
        3600 // 60 minute boil
      );

      // The algorithm has been updated to handle special cases:
      // For 60min hop in 60min boil: Special case - immediate notification (1s delay)
      // For 15min hop: 3600 - 15*60 - 30 = 2670s (valid)
      // For 0min hop: 3600 - 0*60 - 30 = 3570s (valid)
      expect(result.size).toBe(3); // Now includes 60-minute hop (immediate notification)
      expect(result.has(60)).toBe(true); // 60-minute hop gets immediate notification
      expect(result.has(15)).toBe(true);
      expect(result.has(0)).toBe(true);

      // Should be called three times (all hops scheduled)
      expect(mockScheduleNotification).toHaveBeenCalledTimes(3);
    });

    it("should skip hops with small alert times", async () => {
      const shortBoilHops: HopAlert[] = [
        { time: 5, name: "Late Addition", amount: 1, unit: "oz" },
      ];

      const result = await NotificationService.scheduleHopAlertsForRecipe(
        shortBoilHops,
        360 // 6 minute boil
      );

      // 6min boil (360s) - 5min hop (300s) - 30s buffer = 30s alert time
      // 30s > 10s minimum, so this should actually be scheduled
      expect(result.size).toBe(1);
      expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    });

    it("should handle scheduling failures gracefully", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockScheduleNotification.mockResolvedValue(null); // Simulate failure

      const result = await NotificationService.scheduleHopAlertsForRecipe(
        [{ time: 30, name: "Test Hop", amount: 1, unit: "oz" }],
        3600
      );

      expect(result.size).toBe(0); // No successful schedules
    });

    it("should log debug information in development", async () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await NotificationService.scheduleHopAlertsForRecipe(
        [{ time: 3, name: "Very Late Hop", amount: 0.5, unit: "oz" }],
        90 // 1.5 minute boil (90s)
      );

      // 90s boil - 3min hop (180s) - 30s = -120s (negative, so skipped with warning)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Skipping hop alert for "Very Late Hop"')
      );

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      (global as any).__DEV__ = originalDev;
    });
  });

  describe("listener setup", () => {
    it("should set up foreground listener", () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      const mockAddListener =
        Notifications.addNotificationReceivedListener as jest.Mock;
      mockAddListener.mockReturnValue(mockSubscription);

      const subscription =
        NotificationService.setupForegroundListener(mockCallback);

      expect(subscription).toBe(mockSubscription);
      expect(mockAddListener).toHaveBeenCalledWith(mockCallback);
    });

    it("should set up response listener", () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      const mockAddResponseListener =
        Notifications.addNotificationResponseReceivedListener as jest.Mock;
      mockAddResponseListener.mockReturnValue(mockSubscription);

      const subscription =
        NotificationService.setupResponseListener(mockCallback);

      expect(subscription).toBe(mockSubscription);
      expect(mockAddResponseListener).toHaveBeenCalledWith(mockCallback);
    });
  });
});
