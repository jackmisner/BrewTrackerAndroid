import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Directory, Paths } from "expo-file-system";
import type { LogLevel } from "@src/types";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

/**
 * File-based Logger for React Native with Expo
 * Logs to external files for better debugging and persistence
 */
export class Logger {
  private static readonly LOG_DIR_NAME = "logs";
  private static readonly MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_LOG_FILES = 5;
  private static readonly STORAGE_KEY = "@logger_settings";

  private static logLevel: LogLevel = "INFO";
  private static enabled: boolean = true;
  private static initialized: boolean = false;
  private static logDirectory: Directory | null = null;
  private static writePromise: Promise<void> = Promise.resolve();

  /**
   * Initialize the logger - creates log directory and loads settings
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Debug: Show available paths
      console.log("📍 Logger: Available paths:");
      console.log("  - Paths.document =", Paths.document);
      console.log("  - Paths.cache =", Paths.cache);

      // Try to create logs directory in document directory first
      try {
        this.logDirectory = new Directory(Paths.document, this.LOG_DIR_NAME);
        console.log(
          "📍 Logger: Attempting log directory at",
          this.logDirectory.uri
        );

        if (!this.logDirectory.exists) {
          await this.logDirectory.create();
          console.log(
            "📍 Logger: Created log directory at",
            this.logDirectory.uri
          );
        } else {
          console.log(
            "📍 Logger: Log directory already exists at",
            this.logDirectory.uri
          );
        }
      } catch (documentError) {
        console.warn(
          "📍 Logger: Failed to create in document directory, trying cache directory"
        );
        console.warn("Document directory error:", documentError);

        // Fallback to cache directory
        this.logDirectory = new Directory(Paths.cache, this.LOG_DIR_NAME);
        console.log(
          "📍 Logger: Fallback log directory at",
          this.logDirectory.uri
        );

        if (!this.logDirectory.exists) {
          await this.logDirectory.create();
          console.log(
            "📍 Logger: Created fallback log directory at",
            this.logDirectory.uri
          );
        }
      }

      // Load settings from AsyncStorage
      await this.loadSettings();

      this.initialized = true;
      console.log(
        `[Logger] Logger initialized successfully at: ${this.logDirectory?.uri || "unknown"}`
      );
    } catch (error) {
      console.error("Failed to initialize Logger:", error);
      // Mark as not initialized and disable file logging
      this.initialized = false;
      this.enabled = false;
      // Optionally throw to notify callers of initialization failure
      throw error;
    }
  }

  /**
   * Load logger settings from AsyncStorage
   */
  private static async loadSettings(): Promise<void> {
    try {
      const settings = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (settings) {
        const parsed = JSON.parse(settings);
        this.logLevel = parsed.logLevel || "INFO";
        this.enabled = parsed.enabled !== false; // Default to true
      }
    } catch (error) {
      console.warn("Failed to load logger settings:", error);
    }
  }

  /**
   * Save logger settings to AsyncStorage
   */
  private static async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          logLevel: this.logLevel,
          enabled: this.enabled,
        })
      );
    } catch (error) {
      console.warn("Failed to save logger settings:", error);
    }
  }

  /**
   * Set log level
   */
  static async setLogLevel(level: LogLevel): Promise<void> {
    const validLevels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.logLevel = level;
    await this.saveSettings();
  }

  /**
   * Enable/disable logging
   */
  static async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    await this.saveSettings();
  }

  /**
   * Get current log level
   */
  static getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Check if logging is enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log a debug message
   */
  static async debug(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    await this.log("DEBUG", category, message, data);
  }

  /**
   * Log an info message
   */
  static async info(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    await this.log("INFO", category, message, data);
  }

  /**
   * Log a warning message
   */
  static async warn(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    await this.log("WARN", category, message, data);
  }

  /**
   * Log an error message
   */
  static async error(
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    await this.log("ERROR", category, message, data);
  }

  /**
   * Core logging method
   */
  private static async log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    if (!this.enabled || !this.shouldLog(level)) {
      return;
    }

    // Always log to console for immediate feedback
    const consoleMessage = `[${category}] ${message}`;
    switch (level) {
      case "DEBUG":
        console.log(consoleMessage, data);
        break;
      case "INFO":
        console.log(consoleMessage, data);
        break;
      case "WARN":
        console.warn(consoleMessage, data);
        break;
      case "ERROR":
        console.error(consoleMessage, data);
        break;
    }

    // Write to file (fire and forget)
    void this.writeToFile(level, category, message, data);
  }

  /**
   * Check if we should log at the given level
   */
  private static shouldLog(level: LogLevel): boolean {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Write log entry to file
   */
  private static async writeToFile(
    level: LogLevel,
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      let dataField: string | undefined;
      if (data !== undefined) {
        try {
          dataField = typeof data === "string" ? data : JSON.stringify(data);
        } catch {
          dataField = String(data);
        }
      }
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        ...(dataField !== undefined && { data: dataField }),
      };

      const logLine = this.formatLogLine(logEntry);
      const logFile = this.getCurrentLogFile();

      // Serialize writes by chaining onto the write promise
      this.writePromise = this.writePromise.then(async () => {
        try {
          let existingContent = "";

          // Read existing content if file exists, otherwise create it
          if (logFile.exists) {
            existingContent = await logFile.text();
          } else {
            await logFile.create();
          }

          // Write combined content atomically
          await logFile.write(existingContent + logLine);
        } catch (fileError) {
          console.warn("Failed to append to log file:", fileError);
          throw fileError;
        }
      });

      // Wait for the write to complete
      await this.writePromise;

      // Check if we need to rotate logs
      await this.rotateLogsIfNeeded();
    } catch (error) {
      console.warn("Failed to write to log file:", error);
    }
  }

  /**
   * Format log entry as a single line
   */
  private static formatLogLine(entry: LogEntry): string {
    const parts = [
      entry.timestamp,
      `[${entry.level}]`,
      `[${entry.category}]`,
      entry.message,
    ];

    if (entry.data) {
      parts.push(`DATA: ${entry.data}`);
    }

    return parts.join(" ") + "\n";
  }

  /**
   * Get current log file
   */
  private static getCurrentLogFile(): File {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    if (!this.logDirectory) {
      throw new Error("Logger not initialized: logDirectory is null");
    }
    return new File(this.logDirectory!, `brewtracker-${today}.log`);
  }

  /**
   * Rotate logs if current file is too large
   */
  private static async rotateLogsIfNeeded(): Promise<void> {
    try {
      const currentFile = this.getCurrentLogFile();

      // Check if file exists first
      if (!currentFile.exists) {
        return;
      }

      // Get current file size, handling potential undefined values
      let currentSize = 0;
      try {
        currentSize = currentFile.size || 0;
      } catch (sizeError) {
        console.warn("Failed to get file size for rotation check:", sizeError);
        return; // Skip rotation if we can't determine size
      }

      if (currentSize > this.MAX_LOG_SIZE) {
        // Rename current file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        if (!this.logDirectory) {
          return;
        }
        const rotatedFile = new File(
          this.logDirectory,
          `brewtracker-${timestamp}.log`
        );

        try {
          await currentFile.move(rotatedFile);
        } catch (moveError) {
          console.warn("Failed to rotate log file:", moveError);
        }

        // Clean up old log files
        await this.cleanupOldLogs();
      }
    } catch (error) {
      console.warn("Failed to rotate logs:", error);
    }
  }

  /**
   * Clean up old log files, keeping only MAX_LOG_FILES
   */
  private static async cleanupOldLogs(): Promise<void> {
    try {
      if (!this.logDirectory) {
        return;
      }

      const files = await this.logDirectory.list();
      const logFiles = files
        .filter(file => file.name.endsWith(".log"))
        .filter(file => file instanceof File) as File[];
      if (logFiles.length <= this.MAX_LOG_FILES) {
        return;
      }
      // Sort by creation time (newest first, so we delete oldest)
      logFiles.sort((a, b) => {
        // Use filename as a proxy for creation time since it includes date
        return b.name.localeCompare(a.name);
      });
      // Delete oldest files
      const filesToDelete = logFiles.slice(this.MAX_LOG_FILES);
      await Promise.all(filesToDelete.map(file => file.delete()));
    } catch (error) {
      console.warn("Failed to cleanup old logs:", error);
    }
  }

  /**
   * Get all log files
   */
  static async getLogFiles(): Promise<string[]> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.logDirectory) {
        return [];
      }

      const files = await this.logDirectory.list();
      return files
        .filter(file => file.name.endsWith(".log"))
        .map(file => file.name)
        .sort()
        .reverse(); // Newest first
    } catch (error) {
      console.warn("Failed to get log files:", error);
      return [];
    }
  }

  /**
   * Read a specific log file
   */
  static async readLogFile(filename: string): Promise<string> {
    try {
      if (!this.logDirectory) {
        return "";
      }

      const file = new File(this.logDirectory, filename);
      if (!file.exists) {
        return "";
      }

      return await file.text();
    } catch (error) {
      console.warn(`Failed to read log file ${filename}:`, error);
      return "";
    }
  }

  /**
   * Clear all log files
   */
  static async clearLogs(): Promise<void> {
    try {
      if (!this.logDirectory) {
        return;
      }

      const files = await this.logDirectory.list();
      const logFiles = files.filter(
        file => file.name.endsWith(".log") && file instanceof File
      ) as File[];
      await Promise.all(logFiles.map(file => file.delete()));

      this.info("Logger", "All log files cleared");
    } catch (error) {
      console.warn("Failed to clear logs:", error);
    }
  }

  /**
   * Get log directory info
   */
  static async getLogInfo(): Promise<{
    logDir: string;
    files: string[];
    totalSize: number;
    settings: { logLevel: LogLevel; enabled: boolean };
  }> {
    try {
      const files = await this.getLogFiles();
      let totalSize = 0;

      if (this.logDirectory) {
        const fileObjects = await this.logDirectory.list();
        const logFiles = fileObjects.filter(
          file => file.name.endsWith(".log") && file instanceof File
        ) as File[];
        totalSize = logFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      }

      return {
        logDir: this.logDirectory?.uri || "Not initialized",
        files,
        totalSize,
        settings: {
          logLevel: this.logLevel,
          enabled: this.enabled,
        },
      };
    } catch (error) {
      console.warn("Failed to get log info:", error);
      return {
        logDir: "Error",
        files: [],
        totalSize: 0,
        settings: {
          logLevel: this.logLevel,
          enabled: this.enabled,
        },
      };
    }
  }
}

// Initialize logger on app start
Logger.initialize().catch(console.error);

// Export singleton instance
export default Logger;
