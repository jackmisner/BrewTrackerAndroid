import { Logger } from "./Logger";
import { DevLogger } from "./DevLogger";
import type { LogLevel } from "@src/types";
import Constants from "expo-constants";

/**
 * Unified Logger that automatically chooses the best logging strategy
 * - Development: Sends logs to host computer via DevLogger
 * - Production: Stores logs on device via Logger
 */
export class UnifiedLogger {
  private static useDevLogger = __DEV__;
  private static originalConsoleError: typeof console.error;
  private static initialized = false;
  private static suppressForward = false;
  private static hostUri: string | null = null;

  /**
   * Initialize console.error interception
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Always intercept console.error in both dev and production modes
    // Store the original console.error
    this.originalConsoleError = console.error;

    // Override console.error to also write to unified logger
    console.error = (...args: any[]) => {
      // Allow callers to suppress forwarding (prevents recursion/duplication)
      if (this.suppressForward) {
        this.originalConsoleError.apply(console, args);
        return;
      }
      // Call the original console.error first
      this.originalConsoleError.apply(console, args);

      // Extract message and data for logging
      const message = args.length > 0 ? String(args[0]) : "Unknown error";
      const data = args.length > 1 ? args.slice(1) : undefined;

      // Log to appropriate error system (fire and forget)
      void this.logConsoleError(message, data);
    };

    this.initialized = true;
  }

  /**
   * Resolve the development server host URI dynamically
   */
  private static resolveHostUri(): string {
    // Check environment variable first
    const envHost = process.env.DEV_LOG_HOST;
    if (envHost) {
      return envHost;
    }

    try {
      // Try to get from Expo Constants
      const debuggerHost = (Constants.manifest2 as any)?.debuggerHost;
      if (debuggerHost) {
        return debuggerHost;
      }

      const packagerHost = (Constants.expoConfig as any)?.packagerOpts?.hostUri;
      if (packagerHost) {
        return packagerHost;
      }

      // Fallback to window.location.host if available (web)
      if (typeof window !== "undefined" && window.location?.host) {
        return window.location.host;
      }
    } catch {
      // Silently ignore resolution errors
    }

    // Final fallback
    return "192.168.0.10:3001";
  }

  /**
   * Get the resolved host URI, with caching
   */
  private static getHostUri(): string {
    if (this.hostUri === null) {
      this.hostUri = this.resolveHostUri();
    }
    return this.hostUri;
  }

  /**
   * Get device info dynamically from Constants
   */
  private static getDeviceInfo(): { platform: string; buildTime: string } {
    try {
      const platform =
        Constants.platform?.os || Constants.platform?.name || "android";
      const version =
        Constants.expoConfig?.version ||
        (Constants.manifest as any)?.version ||
        "unknown";
      const buildTime = process.env.BUILD_TIME || version;

      return {
        platform,
        buildTime,
      };
    } catch {
      return {
        platform: "android",
        buildTime: "unknown",
      };
    }
  }

  /**
   * Restore original console.error
   */
  static restoreConsoleError(): void {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.initialized = false;
    }
  }

  /**
   * Log console.error directly to unified logger (with recursive interception prevention)
   */
  private static async logConsoleError(
    message: string,
    data?: any[]
  ): Promise<void> {
    try {
      // Capture timestamp immediately
      const _timestamp = new Date().toISOString();

      // Format data for logging
      let formattedData: any = undefined;
      if (data && data.length > 0) {
        try {
          formattedData = data.length === 1 ? data[0] : data;
        } catch {
          formattedData = data.map((item: any) => String(item)).join(" ");
        }
      }

      // Construct log payload
      const _level: LogLevel = "ERROR";
      const category = "device";

      // Temporarily disable interception to prevent recursive calls
      const wasInterceptionSuppressed = this.suppressForward;
      this.suppressForward = true;

      try {
        // Call the unified logger's core method while interception is disabled
        if (this.useDevLogger) {
          await DevLogger.error(category, message, formattedData);
        } else {
          await Logger.error(category, message, formattedData);
        }
      } finally {
        // Atomically restore the interception flag
        this.suppressForward = wasInterceptionSuppressed;
      }
    } catch (internalError) {
      // Swallow internal failures to avoid throwing from device logging
      // Use original console.error to avoid infinite recursion
      try {
        this.originalConsoleError?.(
          "Failed to forward console error to unified logger:",
          internalError
        );
      } catch {
        // Even the original console.error failed - completely swallow
      }
    }
  }

  /**
   * Send log directly to dev server (bypasses DevLogger to avoid recursion)
   */
  private static async sendToDevServer(
    level: LogLevel,
    category: string,
    message: string,
    data?: string
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        data,
        deviceInfo: this.getDeviceInfo(),
      };

      // Send directly to dev server (copied from DevLogger)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const hostUri = this.getHostUri();
        await fetch(`http://${hostUri}/dev-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logEntry),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // In development, show connection issues for ERROR level logs
      if (__DEV__ && level === "ERROR") {
        this.originalConsoleError?.(
          `[UnifiedLogger] Failed to send ${level} to dev server:`,
          error instanceof Error ? error.message : error
        );
      }
      // For other levels, silently fail to avoid spam
    }
  }

  /**
   * Write directly to device log (bypasses Logger to avoid recursion)
   */
  private static async writeToDeviceLog(
    level: LogLevel,
    category: string,
    message: string,
    data?: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logLine = `${timestamp} [${level}] [${category}] ${message}${data ? ` DATA: ${data}` : ""}\n`;

      // Simple AsyncStorage fallback for console errors
      const AsyncStorage = await import(
        "@react-native-async-storage/async-storage"
      );
      const existingLogs =
        (await AsyncStorage.default.getItem("console_errors")) || "";
      await AsyncStorage.default.setItem(
        "console_errors",
        existingLogs + logLine
      );
    } catch {
      // Silently fail
    }
  }

  /**
   * Debug log
   */
  static async debug(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    if (this.useDevLogger) {
      await DevLogger.debug(category, message, data);
    } else {
      await Logger.debug(category, message, data);
    }
  }

  /**
   * Info log
   */
  static async info(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    if (this.useDevLogger) {
      await DevLogger.info(category, message, data);
    } else {
      await Logger.info(category, message, data);
    }
  }

  /**
   * Warning log
   */
  static async warn(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    if (this.useDevLogger) {
      await DevLogger.warn(category, message, data);
    } else {
      await Logger.warn(category, message, data);
    }
  }

  /**
   * Error log
   */
  static async error(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    if (this.useDevLogger) {
      await DevLogger.error(category, message, data);
    } else {
      await Logger.error(category, message, data);
    }
  }

  /**
   * Set log level (device logger only)
   */
  static async setLogLevel(level: LogLevel): Promise<void> {
    await Logger.setLogLevel(level);
  }

  /**
   * Enable/disable logging
   */
  static async setEnabled(enabled: boolean): Promise<void> {
    if (this.useDevLogger) {
      DevLogger.setEnabled(enabled);
    } else {
      await Logger.setEnabled(enabled);
    }
  }

  /**
   * Check if logging is enabled
   */
  static isEnabled(): boolean {
    if (this.useDevLogger) {
      return DevLogger.isEnabled();
    } else {
      return Logger.isEnabled();
    }
  }

  /**
   * Get logger info
   */
  static async getLogInfo(): Promise<{
    loggerType: "dev" | "device";
    logDir?: string;
    files?: string[];
    totalSize?: number;
    settings: { enabled: boolean; devMode: boolean };
  }> {
    if (this.useDevLogger) {
      return {
        loggerType: "dev",
        logDir: `http://${this.getHostUri()}/logs`,
        settings: {
          enabled: DevLogger.isEnabled(),
          devMode: true,
        },
      };
    } else {
      const info = await Logger.getLogInfo();
      return {
        loggerType: "device",
        logDir: info.logDir,
        files: info.files,
        totalSize: info.totalSize,
        settings: {
          enabled: info.settings.enabled,
          devMode: false,
        },
      };
    }
  }

  /**
   * Clear logs
   */
  static async clearLogs(): Promise<void> {
    if (!this.useDevLogger) {
      await Logger.clearLogs();
    }
    // For dev logger, logs are on host computer - user can delete them manually
  }

  /**
   * Force use device logger (for testing)
   */
  static forceDeviceLogger(): void {
    this.useDevLogger = false;
  }

  /**
   * Force use dev logger (for testing)
   */
  static forceDevLogger(): void {
    this.useDevLogger = true;
  }

  /**
   * Get current logger type
   */
  static getCurrentLoggerType(): "dev" | "device" {
    return this.useDevLogger ? "dev" : "device";
  }
}

// Initialize console.error interception on module load
UnifiedLogger.initialize();

export default UnifiedLogger;
