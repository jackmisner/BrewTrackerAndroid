import { Logger } from "./Logger";
import { DevLogger } from "./DevLogger";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * Unified Logger that automatically chooses the best logging strategy
 * - Development: Sends logs to host computer via DevLogger
 * - Production: Stores logs on device via Logger
 */
export class UnifiedLogger {
  private static useDevLogger = __DEV__;

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

export default UnifiedLogger;
