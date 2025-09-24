import { UserCacheService } from "@services/offlineV2/UserCacheService";
import UnifiedLogger from "@services/logger/UnifiedLogger";
import { Logger } from "@services/logger/Logger";

/**
 * Debug helpers for troubleshooting offline sync issues
 * Exposed globally for console access during development
 */
export class DebugHelpers {
  /**
   * Debug a specific recipe by ID
   */
  static async debugRecipe(recipeId: string) {
    console.log(`🔍 Debugging recipe: ${recipeId}`);
    return await UserCacheService.getRecipeDebugInfo(recipeId);
  }

  /**
   * Debug sync system state
   */
  static async debugSyncState() {
    console.log(`🔄 Debugging sync system state`);

    try {
      // Get pending operations
      const pendingOps = await UserCacheService.getPendingOperationsCount();
      console.log(`📊 Pending operations: ${pendingOps}`);

      // Get detailed pending operations (access through debug method)
      const detailedOps = await this.getPendingOperationsDetailed();
      console.log(`📋 Detailed pending operations:`, detailedOps);

      // Get sync metadata
      const syncMetadata = await this.getSyncMetadata();
      console.log(`🕐 Last sync info:`, syncMetadata);

      // Check if sync is in progress
      const syncInProgress = UserCacheService.isSyncInProgress();
      console.log(`⚡ Sync in progress: ${syncInProgress}`);

      return {
        pendingOpsCount: pendingOps,
        detailedOps,
        syncMetadata,
        syncInProgress,
      };
    } catch (error) {
      console.error(`❌ Error debugging sync state:`, error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get detailed pending operations info
   */
  private static async getPendingOperationsDetailed() {
    // Access AsyncStorage directly to get raw pending operations
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const rawOps = await AsyncStorage.getItem(
      "brewtracker_v2_pending_operations"
    );
    return rawOps ? JSON.parse(rawOps) : [];
  }

  /**
   * Get sync metadata
   */
  private static async getSyncMetadata() {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const rawMetadata = await AsyncStorage.getItem(
      "brewtracker_v2_sync_metadata"
    );
    return rawMetadata ? JSON.parse(rawMetadata) : null;
  }

  /**
   * Force sync a specific recipe
   */
  static async forceSyncRecipe(recipeId: string) {
    console.log(`🔄 Force syncing recipe: ${recipeId}`);
    return await UserCacheService.forceSyncRecipe(recipeId);
  }

  /**
   * Get all pending operations
   */
  static async getPendingOperations() {
    console.log(`📋 Getting all pending operations`);
    // Access the private method through the public interface
    return await UserCacheService.getPendingOperationsCount();
  }

  /**
   * Get logger info
   */
  static async getLoggerInfo() {
    console.log(`📄 Getting logger info`);
    const info = await UnifiedLogger.getLogInfo();
    console.log(`📍 Logger type: ${info.loggerType}`);
    console.log(`📍 Log directory: ${info.logDir}`);
    if (info.files) {
      console.log(`📂 Files: ${info.files.length} files`);
      console.log(
        `💾 Total size: ${((info.totalSize || 0) / 1024).toFixed(2)} KB`
      );
    }
    return info;
  }

  /**
   * Show where logs are actually stored
   */
  static async showLogLocation() {
    console.log(`📍 Checking log file locations...`);
    const info = await UnifiedLogger.getLogInfo();
    console.log(`📁 Logger type: ${info.loggerType}`);
    console.log(`📁 Log directory: ${info.logDir}`);

    if (info.loggerType === "dev") {
      console.log(`💻 Development mode: Logs are being sent to your computer`);
      console.log(`🔗 View logs at: http://192.168.0.10:3001/logs`);
      console.log(`📁 Log files will be in: ./dev-logs/`);
    } else if (info.files && info.files.length > 0) {
      console.log(`📄 Recent log files:`);
      info.files.slice(0, 3).forEach(file => {
        console.log(`  - ${file}`);
      });

      // Try to show full path of the most recent file
      try {
        const fullPath = `${info.logDir}${info.files[0]}`;
        console.log(`📍 Full path example: ${fullPath}`);
      } catch {
        console.warn("Could not determine full path");
      }
    } else {
      console.log(`⚠️ No log files found`);
    }

    return info;
  }

  /**
   * List all log files
   */
  static async listLogFiles() {
    console.log(`📂 Listing log files`);
    return await Logger.getLogFiles();
  }

  /**
   * Read a specific log file
   */
  static async readLogFile(filename: string) {
    console.log(`📖 Reading log file: ${filename}`);
    return await Logger.readLogFile(filename);
  }

  /**
   * Clear all logs
   */
  static async clearLogs() {
    console.log(`🗑️ Clearing all logs`);
    return await UnifiedLogger.clearLogs();
  }

  /**
   * Set logger level
   */
  static async setLogLevel(level: "DEBUG" | "INFO" | "WARN" | "ERROR") {
    console.log(`📊 Setting log level to: ${level}`);
    return await UnifiedLogger.setLogLevel(level);
  }

  /**
   * Enable/disable logger
   */
  static async setLoggerEnabled(enabled: boolean) {
    console.log(
      `${enabled ? "✅" : "❌"} ${enabled ? "Enabling" : "Disabling"} logger`
    );
    return await UnifiedLogger.setEnabled(enabled);
  }
}

// Expose globally for console access during development
if (__DEV__) {
  // @ts-ignore
  global.DebugHelpers = DebugHelpers;

  // Also expose individual methods for easier access
  // @ts-ignore
  global.debugRecipe = DebugHelpers.debugRecipe;
  // @ts-ignore
  global.forceSyncRecipe = DebugHelpers.forceSyncRecipe;
  // @ts-ignore
  global.clearLogs = DebugHelpers.clearLogs;
  // @ts-ignore
  global.showLogLocation = DebugHelpers.showLogLocation;
  // @ts-ignore
  global.debugSyncState = DebugHelpers.debugSyncState;

  console.log("🛠️ Debug helpers loaded! Available methods:");
  console.log("  - debugRecipe(id) - Debug specific recipe sync state");
  console.log("  - debugSyncState() - Debug overall sync system state");
  console.log("  - forceSyncRecipe(id) - Force sync a specific recipe");
  console.log("  - showLogLocation() - Show where logs are stored");
  console.log("  - clearLogs() - Clear all logs");
  console.log(
    "  - DebugHelpers.getPendingOperations() - Get pending operations"
  );
  console.log("  - DebugHelpers.getLoggerInfo() - Get logger information");
}

export default DebugHelpers;
