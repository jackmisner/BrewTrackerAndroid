/**
 * syncUtils Test Suite
 *
 * Comprehensive tests for sync utility functions including:
 * - Sync status message generation with proper pluralization
 * - Pull-to-refresh sync handling with network awareness
 * - Error handling and non-blocking behavior
 */

import {
  getSyncStatusMessage,
  handlePullToRefreshSync,
} from "@src/utils/syncUtils";

describe("syncUtils", () => {
  describe("getSyncStatusMessage", () => {
    describe("syncing state", () => {
      it("should return 'Syncing...' when syncing is true", () => {
        expect(getSyncStatusMessage(0, true)).toBe("Syncing...");
        expect(getSyncStatusMessage(5, true)).toBe("Syncing...");
        expect(getSyncStatusMessage(100, true)).toBe("Syncing...");
      });
    });

    describe("all synced state", () => {
      it("should return 'All synced' when no pending operations", () => {
        expect(getSyncStatusMessage(0, false)).toBe("All synced");
      });
    });

    describe("pending operations state", () => {
      it("should handle singular pending operation correctly", () => {
        expect(getSyncStatusMessage(1, false)).toBe("1 change needs sync");
      });

      it("should handle plural pending operations correctly", () => {
        expect(getSyncStatusMessage(2, false)).toBe("2 changes need sync");
        expect(getSyncStatusMessage(5, false)).toBe("5 changes need sync");
        expect(getSyncStatusMessage(10, false)).toBe("10 changes need sync");
        expect(getSyncStatusMessage(100, false)).toBe("100 changes need sync");
      });

      it("should handle large numbers of pending operations", () => {
        expect(getSyncStatusMessage(999, false)).toBe("999 changes need sync");
        expect(getSyncStatusMessage(1000, false)).toBe(
          "1000 changes need sync"
        );
      });
    });

    describe("edge cases", () => {
      it("should handle negative numbers gracefully", () => {
        // Even though this shouldn't happen, test defensive behavior
        // Negative numbers are treated as non-zero, so they get plural form
        expect(getSyncStatusMessage(-1, false)).toBe("-1 changes need sync");
        expect(getSyncStatusMessage(-5, false)).toBe("-5 changes need sync");
      });

      it("should prioritize syncing state over pending count", () => {
        // When syncing is true, message should be "Syncing..." regardless of count
        expect(getSyncStatusMessage(0, true)).toBe("Syncing...");
        expect(getSyncStatusMessage(1, true)).toBe("Syncing...");
        expect(getSyncStatusMessage(10, true)).toBe("Syncing...");
      });
    });
  });

  describe("handlePullToRefreshSync", () => {
    let mockSyncFn: jest.Mock;
    let consoleLogSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      mockSyncFn = jest.fn().mockResolvedValue(undefined);
      consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    describe("should trigger sync when conditions are met", () => {
      it("should call sync function when online with pending operations", async () => {
        await handlePullToRefreshSync(true, 5, mockSyncFn);

        expect(mockSyncFn).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "🔄 Pull-to-refresh triggering sync..."
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "✅ Pull-to-refresh sync completed"
        );
      });

      it("should call sync function when online with single pending operation", async () => {
        await handlePullToRefreshSync(true, 1, mockSyncFn);

        expect(mockSyncFn).toHaveBeenCalledTimes(1);
      });

      it("should call sync function when online with many pending operations", async () => {
        await handlePullToRefreshSync(true, 100, mockSyncFn);

        expect(mockSyncFn).toHaveBeenCalledTimes(1);
      });
    });

    describe("should NOT trigger sync when conditions are not met", () => {
      it("should not call sync when offline", async () => {
        await handlePullToRefreshSync(false, 5, mockSyncFn);

        expect(mockSyncFn).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });

      it("should not call sync when no pending operations", async () => {
        await handlePullToRefreshSync(true, 0, mockSyncFn);

        expect(mockSyncFn).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });

      it("should not call sync when offline AND no pending operations", async () => {
        await handlePullToRefreshSync(false, 0, mockSyncFn);

        expect(mockSyncFn).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });
    });

    describe("error handling", () => {
      it("should handle sync errors gracefully without throwing", async () => {
        const error = new Error("Network timeout");
        mockSyncFn.mockRejectedValueOnce(error);

        // Should not throw
        await expect(
          handlePullToRefreshSync(true, 5, mockSyncFn)
        ).resolves.toBeUndefined();

        expect(mockSyncFn).toHaveBeenCalledTimes(1);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Pull-to-refresh sync failed:",
          error
        );
      });

      it("should log warning but not rethrow error", async () => {
        const error = new Error("Sync service unavailable");
        mockSyncFn.mockRejectedValueOnce(error);

        await handlePullToRefreshSync(true, 3, mockSyncFn);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Pull-to-refresh sync failed:",
          error
        );
        // Verify function completed without throwing
      });

      it("should handle sync function throwing string error", async () => {
        mockSyncFn.mockRejectedValueOnce("String error message");

        await expect(
          handlePullToRefreshSync(true, 5, mockSyncFn)
        ).resolves.toBeUndefined();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Pull-to-refresh sync failed:",
          "String error message"
        );
      });

      it("should handle sync function throwing null", async () => {
        mockSyncFn.mockRejectedValueOnce(null);

        await expect(
          handlePullToRefreshSync(true, 5, mockSyncFn)
        ).resolves.toBeUndefined();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Pull-to-refresh sync failed:",
          null
        );
      });

      it("should handle sync function throwing undefined", async () => {
        mockSyncFn.mockRejectedValueOnce(undefined);

        await expect(
          handlePullToRefreshSync(true, 5, mockSyncFn)
        ).resolves.toBeUndefined();
      });
    });

    describe("edge cases", () => {
      it("should handle negative pending operations count", async () => {
        // Defensive test - shouldn't happen but should be safe
        await handlePullToRefreshSync(true, -1, mockSyncFn);

        // Should not sync with negative count
        expect(mockSyncFn).not.toHaveBeenCalled();
      });

      it("should handle zero pending operations correctly", async () => {
        await handlePullToRefreshSync(true, 0, mockSyncFn);

        expect(mockSyncFn).not.toHaveBeenCalled();
      });

      it("should complete successfully with resolved sync function", async () => {
        mockSyncFn.mockResolvedValueOnce({ success: true, synced: 5 });

        await handlePullToRefreshSync(true, 5, mockSyncFn);

        expect(mockSyncFn).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "✅ Pull-to-refresh sync completed"
        );
      });

      it("should handle sync function that returns void", async () => {
        mockSyncFn.mockResolvedValueOnce(undefined);

        await handlePullToRefreshSync(true, 5, mockSyncFn);

        expect(mockSyncFn).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "✅ Pull-to-refresh sync completed"
        );
      });
    });

    describe("async behavior", () => {
      it("should wait for sync to complete before resolving", async () => {
        let syncStarted = false;
        let syncCompleted = false;

        mockSyncFn.mockImplementation(async () => {
          syncStarted = true;
          await new Promise(resolve => setTimeout(resolve, 10));
          syncCompleted = true;
        });

        await handlePullToRefreshSync(true, 5, mockSyncFn);

        expect(syncStarted).toBe(true);
        expect(syncCompleted).toBe(true);
      });

      it("should handle slow sync operations", async () => {
        mockSyncFn.mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 50))
        );

        const start = Date.now();
        await handlePullToRefreshSync(true, 5, mockSyncFn);
        const duration = Date.now() - start;

        // Use a lower threshold to avoid flaky tests (test runs can be slow)
        expect(duration).toBeGreaterThanOrEqual(40);
        expect(mockSyncFn).toHaveBeenCalledTimes(1);
      });
    });

    describe("console logging behavior", () => {
      it("should log start and completion messages for successful sync", async () => {
        await handlePullToRefreshSync(true, 5, mockSyncFn);

        expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        expect(consoleLogSpy).toHaveBeenNthCalledWith(
          1,
          "🔄 Pull-to-refresh triggering sync..."
        );
        expect(consoleLogSpy).toHaveBeenNthCalledWith(
          2,
          "✅ Pull-to-refresh sync completed"
        );
      });

      it("should not log anything when sync is not triggered", async () => {
        await handlePullToRefreshSync(false, 5, mockSyncFn);

        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it("should log warning on sync error", async () => {
        const error = new Error("Test error");
        mockSyncFn.mockRejectedValueOnce(error);

        await handlePullToRefreshSync(true, 5, mockSyncFn);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          "🔄 Pull-to-refresh triggering sync..."
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Pull-to-refresh sync failed:",
          error
        );
        // Should NOT log completion message on error
        expect(consoleLogSpy).not.toHaveBeenCalledWith(
          "✅ Pull-to-refresh sync completed"
        );
      });
    });
  });
});
