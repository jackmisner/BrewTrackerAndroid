import Constants from "expo-constants";
import type { LogLevel } from "./Logger";

/**
 * Development Logger that sends logs to the host computer
 * Uses network requests to write logs to the development server
 */
export class DevLogger {
  private static readonly HOST_LOG_ENDPOINT = process.env.HOST_LOG_ENDPOINT
    ? process.env.HOST_LOG_ENDPOINT
    : "http://192.168.0.10:3001/dev-logs";
  private static readonly FETCH_TIMEOUT = 3000; // 3 seconds
  private static enabled: boolean = __DEV__;

  /**
   * Safe JSON stringify that handles circular references
   */
  private static safeStringify(data: any): string {
    try {
      return JSON.stringify(data);
    } catch {
      // Fallback for circular references or other stringify errors
      return String(data);
    }
  }

  /**
   * Send log to development server for file writing
   */
  private static async sendLogToHost(
    level: LogLevel,
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    if (!this.enabled || !__DEV__) {
      return;
    }

    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        data: data
          ? typeof data === "string"
            ? data
            : this.safeStringify(data)
          : undefined,
        deviceInfo: {
          platform: "android",
          buildTime: Constants.expoConfig?.version || "unknown",
        },
      };

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.FETCH_TIMEOUT
      );

      try {
        // Try to send to development log server with timeout
        await fetch(this.HOST_LOG_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(logEntry),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // Silently fail if dev server isn't running or request times out - don't spam console
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
    console.log(`[${category}] ${message}`, data);
    await this.sendLogToHost("DEBUG", category, message, data);
  }

  /**
   * Info log
   */
  static async info(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    console.log(`[${category}] ${message}`, data);
    await this.sendLogToHost("INFO", category, message, data);
  }

  /**
   * Warning log
   */
  static async warn(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    console.warn(`[${category}] ${message}`, data);
    await this.sendLogToHost("WARN", category, message, data);
  }

  /**
   * Error log
   */
  static async error(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    console.error(`[${category}] ${message}`, data);
    await this.sendLogToHost("ERROR", category, message, data);
  }

  /**
   * Enable/disable dev logging
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled && __DEV__;
  }

  /**
   * Check if dev logging is enabled
   */
  static isEnabled(): boolean {
    return this.enabled && __DEV__;
  }
}

export default DevLogger;
