/**
 * NotificationService for BrewTracker Boil Timer
 *
 * Handles local notifications for hop additions and timer events.
 * Provides audio alerts, vibration, and background notifications.
 *
 * IMPORTANT: Expo Go Limitations
 * ===============================
 * As of SDK 53+, expo-notifications has limited functionality in Expo Go:
 * - Scheduled notifications may not work properly in Expo Go
 * - Push notifications are not supported in Expo Go
 * - For full notification functionality, use a development build instead
 *
 * This may cause notifications to fire immediately or not at all in Expo Go.
 * The code includes comprehensive debugging to help identify timing issues.
 *
 * Development Build Required:
 * - Use `npx expo run:android` instead of Expo Go for proper notification testing
 * - See: https://docs.expo.dev/develop/development-builds/introduction/
 */

import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";

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
   * Build a properly typed time trigger for notifications
   */
  private static buildTimeTrigger({
    seconds,
    minutes,
    hours,
  }: {
    seconds?: number;
    minutes?: number;
    hours?: number;
  }) {
    const trigger: {
      type: any;
      seconds?: number;
      minutes?: number;
      hours?: number;
      channelId?: string;
    } = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    };

    if (seconds !== undefined) trigger.seconds = seconds;
    if (minutes !== undefined) trigger.minutes = minutes;
    if (hours !== undefined) trigger.hours = hours;

    // Add channelId for Android (Android-only app)
    trigger.channelId = "boil-timer";

    return trigger;
  }

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
      await Notifications.setNotificationChannelAsync("boil-timer", {
        name: "Boil Timer",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#f4511e",
        sound: "default",
        description: "Notifications for hop additions and boil timer events",
      });

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
        trigger: this.buildTimeTrigger({ seconds: timeInSeconds }),
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

      // if (__DEV__) {
      //   console.log(
      //     `⏰ Scheduling notification "${title}" in ${timeInSeconds}s (${timeInSeconds / 60} min from now)`
      //   );
      // }

      // Validate notification time - must be at least 1 second in the future
      if (timeInSeconds < 1) {
        // if (__DEV__) {
        //   console.warn(
        //     `⚠️ Invalid notification time: ${timeInSeconds}s - must be >= 1s`
        //   );
        // }
        return null;
      }

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
        trigger: this.buildTimeTrigger({ seconds: timeInSeconds }),
      });

      this.notificationIdentifiers.push(identifier);

      // if (__DEV__) {
      //   console.log(
      //     `✅ Scheduled notification "${title}" with ID: ${identifier}`
      //   );
      // }

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

    // if (__DEV__) {
    //   console.log(
    //     `📅 Scheduling milestone notifications for ${boilDurationSeconds}s (${boilDurationSeconds / 60} min) boil`
    //   );
    // }

    for (const milestone of milestones) {
      if (boilDurationSeconds > milestone.time) {
        const notifyTime = boilDurationSeconds - milestone.time;

        // if (__DEV__) {
        //   console.log(
        //     `📅 Milestone ${milestone.time / 60}min: scheduling notification in ${notifyTime}s (${notifyTime / 60} min from now)`
        //   );
        // }

        // Only schedule if notification time is at least 5 seconds in the future
        if (notifyTime >= 5) {
          await this.scheduleTimerAlert(
            "⏰ Boil Timer Update",
            milestone.message,
            notifyTime,
            { milestone: milestone.time }
          );
        } else if (__DEV__) {
          // console.warn(
          //   `⚠️ Skipping milestone ${milestone.time / 60}min - notifyTime too small (${notifyTime}s)`
          // );
        }
      } else if (__DEV__) {
        // console.log(
        //   `📅 Skipping milestone ${milestone.time / 60}min - boil duration too short`
        // );
      }
    }
  }

  /**
   * Schedule boil completion notification
   */
  public static async scheduleBoilCompleteNotification(
    boilDurationSeconds: number
  ): Promise<string | null> {
    if (__DEV__) {
      // console.log(
      //   `✅ Scheduling boil completion notification in ${boilDurationSeconds}s (${boilDurationSeconds / 60} min from now)`
      // );
    }

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
   * Log all currently scheduled notifications for debugging
   */

  public static async logScheduledNotifications(): Promise<void> {
    if (!__DEV__) return;
    const notifications = await this.getScheduledNotifications();
    console.log(`📋 Scheduled notifications: ${notifications.length}`);
  }

  /**
   * Schedule all hop alerts for a recipe
   */
  public static async scheduleHopAlertsForRecipe(
    hopAlerts: HopAlert[],
    boilDurationSeconds: number
  ): Promise<Map<number, string>> {
    const scheduledAlerts = new Map<number, string>();
    const boilDurationMinutes = boilDurationSeconds / 60;

    // if (__DEV__) {
    //   console.log(
    //     `🍺 Scheduling hop alerts for ${hopAlerts.length} hops in ${boilDurationMinutes}min boil`
    //   );
    // }

    for (const hop of hopAlerts) {
      // Calculate when to send the alert
      const hopAdditionTime = hop.time * 60; // Convert minutes to seconds

      // Special case: if hop addition time equals boil duration, notify immediately
      if (hop.time === boilDurationMinutes) {
        // if (__DEV__) {
        //   console.log(
        //     `🍺 Hop "${hop.name}" at ${hop.time}min equals boil time - will notify immediately when timer starts`
        //   );
        // }

        // Schedule an immediate notification (1 second delay to ensure timer has started)
        const identifier = await this.scheduleHopAlert(
          hop.name,
          hop.amount,
          hop.unit,
          1 // 1 second delay
        );

        if (identifier) {
          scheduledAlerts.set(hop.time, identifier);
        }
        continue;
      }

      // Normal case: notify 30 seconds before hop addition
      const alertTime = boilDurationSeconds - hopAdditionTime - 30; // 30 seconds before

      // if (__DEV__) {
      //   console.log(
      //     `🍺 Hop "${hop.name}" at ${hop.time}min: scheduling alert in ${alertTime}s (${alertTime / 60} min from now)`
      //   );
      // }

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
        console.warn(
          `⚠️ Skipping hop alert for "${hop.name}" at ${hop.time}min - alertTime too small (${alertTime}s)`
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
