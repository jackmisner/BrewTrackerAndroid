import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders } from "../../testUtils";
import DebugLogsScreen from "../../../app/(modals)/debugLogs";
import { Logger } from "@services/logger/Logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Share } from "react-native";
import { TEST_IDS } from "@constants/testIDs";

// Mock dependencies
jest.mock("@services/logger/Logger", () => ({
  Logger: {
    getRecentLogs: jest.fn(),
    clearLogs: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
  },
}));

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

const mockRouter = require("expo-router").router;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Get references to mocked Alert and Share after they're loaded
const mockAlert = Alert;
const mockShare = Share;

describe("DebugLogsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockLogger.getRecentLogs.mockResolvedValue([
      "2024-01-01 10:00:00 [INFO] Test log 1",
      "2024-01-01 10:00:01 [ERROR] Test error log",
      "2024-01-01 10:00:02 [DEBUG] Test debug log",
    ]);

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);
  });

  describe("rendering", () => {
    it("should render the debug logs screen with header", async () => {
      const { getByText } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(getByText("Debug Logs")).toBeTruthy();
      });
    });

    it("should render both Logs and Storage tabs", async () => {
      const { getByText } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(getByText("Logs")).toBeTruthy();
        expect(getByText("Storage")).toBeTruthy();
      });
    });

    it("should show loading state initially", async () => {
      // Mock slow log loading to catch loading state
      mockLogger.getRecentLogs.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const { getByText } = renderWithProviders(<DebugLogsScreen />);

      // Check for loading text
      await waitFor(() => {
        expect(getByText(/Loading/i)).toBeTruthy();
      });
    });
  });

  describe("logs tab", () => {
    it("should load and display recent logs", async () => {
      const { getByText } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(mockLogger.getRecentLogs).toHaveBeenCalledWith(100);
      });

      await waitFor(() => {
        expect(getByText(/Test log 1/)).toBeTruthy();
      });
    });

    it("should display error message when logs fail to load", async () => {
      mockLogger.getRecentLogs.mockRejectedValue(
        new Error("Failed to load logs")
      );

      const { getByText } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(getByText(/Error loading logs/)).toBeTruthy();
      });
    });

    it("should display 'No logs available' when logs are empty", async () => {
      mockLogger.getRecentLogs.mockResolvedValue([]);

      const { getByText } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(getByText("No logs available")).toBeTruthy();
      });
    });

    it("should refresh logs when refresh button is pressed", async () => {
      const { getByTestId } = renderWithProviders(<DebugLogsScreen />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockLogger.getRecentLogs).toHaveBeenCalledTimes(1);
      });

      // Find and press refresh button
      const refreshButton = getByTestId(TEST_IDS.debugLogs.refreshButton);

      await act(async () => {
        fireEvent.press(refreshButton);
      });

      await waitFor(() => {
        expect(mockLogger.getRecentLogs).toHaveBeenCalledTimes(2);
      });
    });

    it("should clear logs when delete button is pressed", async () => {
      mockLogger.clearLogs.mockResolvedValue(undefined);

      const { getByTestId } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(mockLogger.getRecentLogs).toHaveBeenCalled();
      });

      const deleteButton = getByTestId(TEST_IDS.debugLogs.deleteButton);

      await act(async () => {
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        expect(mockLogger.clearLogs).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith("Success", expect.any(String));
      });
    });

    it("should show error alert when clearing logs fails", async () => {
      mockLogger.clearLogs.mockRejectedValue(new Error("Clear failed"));

      const { getByTestId } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(mockLogger.getRecentLogs).toHaveBeenCalled();
      });

      const deleteButton = getByTestId(TEST_IDS.debugLogs.deleteButton);

      await act(async () => {
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith("Error", expect.any(String));
      });
    });
  });

  describe("storage tab", () => {
    beforeEach(() => {
      // Mock AsyncStorage data
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        const mockData: Record<string, string> = {
          offline_v2_pending_operations: JSON.stringify([
            {
              id: "op1",
              type: "create",
              entityType: "recipe",
              tempId: "temp_123",
              status: "pending",
              retryCount: 0,
            },
          ]),
          offline_v2_recipes: JSON.stringify([
            {
              id: "recipe1",
              name: "Test Recipe",
              tempId: "temp_123",
              lastModified: Date.now(),
            },
          ]),
          offline_v2_ingredients_cache: JSON.stringify({
            version: "1.0",
            cached_at: Date.now(),
            data: [{ id: "ing1", name: "Malt" }],
          }),
        };
        return Promise.resolve(mockData[key] || null);
      });

      mockAsyncStorage.getAllKeys.mockResolvedValue([
        "offline_v2_pending_operations",
        "offline_v2_recipes",
        "offline_v2_ingredients_cache",
        "other_key",
      ]);
    });

    it("should switch to storage tab when tapped", async () => {
      const { getByText } = renderWithProviders(<DebugLogsScreen />);

      await waitFor(() => {
        expect(getByText("Logs")).toBeTruthy();
      });

      const storageTab = getByText("Storage");

      await act(async () => {
        fireEvent.press(storageTab);
      });

      await waitFor(() => {
        expect(getByText(/AsyncStorage Contents/)).toBeTruthy();
      });
    });

    it("should display pending operations count", async () => {
      const { findByText } = renderWithProviders(<DebugLogsScreen />);

      const storageTab = await findByText("Storage");

      await act(async () => {
        fireEvent.press(storageTab);
      });

      await waitFor(async () => {
        await expect(findByText(/Count: 1/)).resolves.toBeTruthy();
        await expect(findByText(/create recipe/i)).resolves.toBeTruthy();
      });
    });

    it("should display cache information with version", async () => {
      const { findByText } = renderWithProviders(<DebugLogsScreen />);

      const storageTab = await findByText("Storage");

      await act(async () => {
        fireEvent.press(storageTab);
      });

      expect(await findByText(/Version: 1\.0/)).toBeTruthy();
      expect(await findByText(/Item count: 1/)).toBeTruthy();
    });

    it("should display recipe information", async () => {
      const { findByText } = renderWithProviders(<DebugLogsScreen />);

      const storageTab = await findByText("Storage");

      await act(async () => {
        fireEvent.press(storageTab);
      });

      expect(await findByText(/Test Recipe/)).toBeTruthy();
      expect(await findByText(/Temp: YES/)).toBeTruthy();
    });

    it("should display total AsyncStorage keys count", async () => {
      const { findByText } = renderWithProviders(<DebugLogsScreen />);

      const storageTab = await findByText("Storage");

      await act(async () => {
        fireEvent.press(storageTab);
      });

      expect(await findByText(/Total AsyncStorage Keys: 4/)).toBeTruthy();
    });

    it("should show empty state for missing keys", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { findByText } = renderWithProviders(<DebugLogsScreen />);

      const storageTab = await findByText("Storage");

      await act(async () => {
        fireEvent.press(storageTab);
      });

      expect(await findByText(/\(empty\)/)).toBeTruthy();
    });
  });

  describe("clear storage functionality", () => {
    beforeEach(() => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    });

    it("should show confirmation dialog when deleting storage in storage tab", async () => {
      const { findByText, findByTestId } = renderWithProviders(
        <DebugLogsScreen />
      );

      // Switch to storage tab
      const storageTab = await findByText("Storage");
      await act(async () => {
        fireEvent.press(storageTab);
      });

      await findByText(/AsyncStorage Contents/);

      // Press delete button
      const deleteButton = await findByTestId(TEST_IDS.debugLogs.deleteButton);
      await act(async () => {
        fireEvent.press(deleteButton);
      });

      // Verify alert was called with proper options
      expect(Alert.alert).toHaveBeenCalledWith(
        "Clear User Data?",
        expect.stringContaining("offline recipes"),
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancel" }),
          expect.objectContaining({ text: "Clear User Data" }),
          expect.objectContaining({ text: "Clear Everything" }),
        ])
      );
    });

    it("should clear user data when 'Clear User Data' is selected", async () => {
      const { findByText, findByTestId } = renderWithProviders(
        <DebugLogsScreen />
      );

      // Switch to storage tab
      const storageTab = await findByText("Storage");
      await act(async () => {
        fireEvent.press(storageTab);
      });

      await findByText(/AsyncStorage Contents/);

      // Press delete button
      const deleteButton = await findByTestId(TEST_IDS.debugLogs.deleteButton);
      await act(async () => {
        fireEvent.press(deleteButton);
      });

      // Get the alert call and execute the "Clear User Data" callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const clearUserDataButton = alertCall[2].find(
        (btn: any) => btn.text === "Clear User Data"
      );

      await act(async () => {
        await clearUserDataButton.onPress();
      });

      // Verify only user data keys were removed (not cache)
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "offline_v2_pending_operations"
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "offline_v2_recipes"
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "offline_v2_brew_sessions"
      );
      expect(mockAsyncStorage.removeItem).not.toHaveBeenCalledWith(
        "offline_v2_ingredients_cache"
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Success",
          "User data cleared. Cache preserved."
        );
      });
    });

    it("should clear everything when 'Clear Everything' is selected", async () => {
      const { findByText, findByTestId } = renderWithProviders(
        <DebugLogsScreen />
      );

      // Switch to storage tab
      const storageTab = await findByText("Storage");
      await act(async () => {
        fireEvent.press(storageTab);
      });

      await findByText(/AsyncStorage Contents/);

      // Press delete button
      const deleteButton = await findByTestId(TEST_IDS.debugLogs.deleteButton);
      await act(async () => {
        fireEvent.press(deleteButton);
      });

      // Get the alert call and execute the "Clear Everything" callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const clearEverythingButton = alertCall[2].find(
        (btn: any) => btn.text === "Clear Everything"
      );

      await act(async () => {
        await clearEverythingButton.onPress();
      });

      // Verify all keys including cache were removed
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "offline_v2_pending_operations"
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "offline_v2_ingredients_cache"
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "offline_v2_beer_styles_cache"
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Success",
          "All offline data cleared"
        );
      });
    });
  });

  describe("navigation", () => {
    it("should navigate back when back button is pressed", async () => {
      const { findByTestId } = renderWithProviders(<DebugLogsScreen />);

      const backButton = await findByTestId(TEST_IDS.debugLogs.backButton);

      fireEvent.press(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});
