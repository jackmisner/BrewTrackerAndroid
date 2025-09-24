import { Logger } from "./Logger";
import { DevLogger } from "./DevLogger";
import type { LogLevel } from "@src/types";

/**
 * Unified Logger that automatically chooses the best logging strategy
 * - Development: Sends logs to host computer via DevLogger
 * - Production: Stores logs on device via Logger
 */
export class UnifiedLogger {
  private static useDevLogger = __DEV__;
  private static originalConsoleError: typeof console.error;
  private static initialized = false;

  /**
   * Initialize console.error interception
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Store the original console.error
    this.originalConsoleError = console.error;

    // Override console.error to also write to dedicated error log file
    console.error = (...args: any[]) => {
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
   * Restore original console.error
   */
  static restoreConsoleError(): void {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.initialized = false;
    }
  }

  /**
   * Log console.error directly to log files (bypass console.error)
   */
  private static async logConsoleError(
    message: string,
    data?: any[]
  ): Promise<void> {
    try {
      // Format data for logging
      let formattedData: string | undefined;
      if (data && data.length > 0) {
        try {
          formattedData = data
            .map((item: any) =>
              typeof item === "string" ? item : JSON.stringify(item)
            )
            .join(" ");
        } catch {
          formattedData = data.map((item: any) => String(item)).join(" ");
        }
      }

      // Write directly to log files/servers without using logger methods
      // that would call console.error again
      if (this.useDevLogger) {
        // Send directly to dev server without using DevLogger.error
        await this.sendToDevServer(
          "ERROR",
          "CONSOLE_ERROR",
          message,
          formattedData
        );
      } else {
        // Write directly to device log without using Logger.error
        await this.writeToDeviceLog(
          "ERROR",
          "CONSOLE_ERROR",
          message,
          formattedData
        );
      }
    } catch (error) {
      // Use original console.error to avoid infinite recursion
      this.originalConsoleError?.("Failed to log console error:", error);
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
        deviceInfo: {
          platform: "android",
          buildTime: "2.0.11", // Could get from Constants if needed
        },
      };

      // Send directly to dev server (copied from DevLogger)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        await fetch("http://192.168.0.10:3001/dev-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logEntry),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // Silently fail if dev server isn't running
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
      // This would require importing Logger internals or duplicating file writing logic
      // For now, just write a simplified version that won't cause recursion
      const timestamp = new Date().toISOString();
      const _logLine = `${timestamp} [${level}] [${category}] ${message}${data ? ` DATA: ${data}` : ""}\n`;

      // We could write to a simple error log file here, but for now just skip
      // to avoid the complexity of duplicating Logger's file writing logic

      // Alternative: Just store in memory or AsyncStorage as a simple fallback
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
        logDir: "http://192.168.0.10:3001/logs",
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
