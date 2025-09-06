/**
 * NotificationService for BrewTracker Boil Timer
 *
 * Handles local notifications for hop additions and timer events.
 * Provides audio alerts, vibration, and background notifications.
 */

import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export interface HopAlert {
  time: number;
  name: string;
  amount: number;
  unit: string;
}

export class NotificationService {
  private static notificationIdentifiers: string[] = [];
  private static isInitialized = false;

  /**
   * Initialize notification service and request permissions
   */
  public static async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Notification permissions not granted");
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("boil-timer", {
          name: "Boil Timer",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#f4511e",
          sound: "default",
          description: "Notifications for hop additions and boil timer events",
        });
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize notifications:", error);
      return false;
    }
  }

  /**
   * Schedule a hop addition alert
   */
  public static async scheduleHopAlert(
    hopName: string,
    amount: number,
    unit: string,
    timeInSeconds: number
  ): Promise<string | null> {
    try {
      const isInitialized = await this.initialize();
      if (!isInitialized) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🍺 Hop Addition Time!",
          body: `Add ${amount} ${unit} of ${hopName}`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: "hop_addition",
            hopName,
            amount,
            unit,
          },
        },
        trigger: {
          seconds: timeInSeconds,
          channelId: "boil-timer",
        } as any,
      });

      this.notificationIdentifiers.push(identifier);
      return identifier;
    } catch (error) {
      console.error("Failed to schedule hop alert:", error);
      return null;
    }
  }

  /**
   * Schedule a general boil timer notification
   */
  public static async scheduleTimerAlert(
    title: string,
    body: string,
    timeInSeconds: number,
    data: any = {}
  ): Promise<string | null> {
    try {
      const isInitialized = await this.initialize();
      if (!isInitialized) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: {
            type: "timer_alert",
            ...data,
          },
        },
        trigger: {
          seconds: timeInSeconds,
          channelId: "boil-timer",
        } as any,
      });

      this.notificationIdentifiers.push(identifier);
      return identifier;
    } catch (error) {
      console.error("Failed to schedule timer alert:", error);
      return null;
    }
  }

  /**
   * Schedule milestone notifications (30min, 15min, 10min, 5min remaining)
   */
  public static async scheduleMilestoneNotifications(
    boilDurationSeconds: number
  ): Promise<void> {
    const milestones = [
      { time: 30 * 60, message: "30 minutes remaining in boil" },
      { time: 15 * 60, message: "15 minutes remaining in boil" },
      { time: 10 * 60, message: "10 minutes remaining in boil" },
      { time: 5 * 60, message: "5 minutes remaining in boil" },
      { time: 60, message: "1 minute remaining in boil" },
    ];

    for (const milestone of milestones) {
      if (boilDurationSeconds > milestone.time) {
        const notifyTime = boilDurationSeconds - milestone.time;
        await this.scheduleTimerAlert(
          "⏰ Boil Timer Update",
          milestone.message,
          notifyTime,
          { milestone: milestone.time }
        );
      }
    }
  }

  /**
   * Schedule boil completion notification
   */
  public static async scheduleBoilCompleteNotification(
    boilDurationSeconds: number
  ): Promise<string | null> {
    return await this.scheduleTimerAlert(
      "✅ Boil Complete!",
      "Your boil has finished. Time to cool and transfer!",
      boilDurationSeconds,
      { type: "boil_complete" }
    );
  }

  /**
   * Cancel all scheduled notifications
   */
  public static async cancelAllAlerts(): Promise<void> {
    try {
      // Cancel all notifications for this app
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.notificationIdentifiers = [];
    } catch (error) {
      console.error("Failed to cancel notifications:", error);
    }
  }

  /**
   * Cancel a specific notification by identifier
   */
  public static async cancelAlert(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      this.notificationIdentifiers = this.notificationIdentifiers.filter(
        (id: string) => id !== identifier
      );
    } catch (error) {
      console.error("Failed to cancel notification:", error);
    }
  }

  /**
   * Trigger immediate haptic feedback
   */
  public static async triggerHapticFeedback(
    type: "light" | "medium" | "heavy" = "medium"
  ): Promise<void> {
    try {
      switch (type) {
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch (error) {
      console.error("Failed to trigger haptic feedback:", error);
    }
  }

  /**
   * Send an immediate local notification (for testing or immediate alerts)
   */
  public static async sendImmediateNotification(
    title: string,
    body: string,
    data: any = {}
  ): Promise<void> {
    try {
      const isInitialized = await this.initialize();
      if (!isInitialized) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data,
        },
        trigger: null, // Send immediately
      });

      // Also trigger haptic feedback
      await this.triggerHapticFeedback("medium");
    } catch (error) {
      console.error("Failed to send immediate notification:", error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  public static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Failed to check notification permissions:", error);
      return false;
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  public static async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Failed to get scheduled notifications:", error);
      return [];
    }
  }

  /**
   * Schedule all hop alerts for a recipe
   */
  public static async scheduleHopAlertsForRecipe(
    hopAlerts: HopAlert[],
    boilDurationSeconds: number
  ): Promise<Map<number, string>> {
    const scheduledAlerts = new Map<number, string>();

    for (const hop of hopAlerts) {
      // Calculate when to send the alert (30 seconds before hop addition)
      const hopAdditionTime = hop.time * 60; // Convert minutes to seconds
      const alertTime = boilDurationSeconds - hopAdditionTime - 30; // 30 seconds before

      // Only schedule alerts with a meaningful time buffer (>= 10 seconds)
      if (alertTime >= 10) {
        const identifier = await this.scheduleHopAlert(
          hop.name,
          hop.amount,
          hop.unit,
          alertTime
        );

        if (identifier) {
          scheduledAlerts.set(hop.time, identifier);
        }
      } else if (__DEV__) {
        // Debug logging for skipped hop alerts
        console.log(
          `Skipping hop alert for "${hop.name}" at ${hop.time}min - alertTime too small (${alertTime}s)`
        );
      }
    }

    return scheduledAlerts;
  }

  /**
   * Set up notification listener for when app is in foreground
   */
  public static setupForegroundListener(
    onNotificationReceived: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );
  }

  /**
   * Set up notification response listener (when user taps notification)
   */
  public static setupResponseListener(
    onNotificationResponse: (
      response: Notifications.NotificationResponse
    ) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );
  }
}
