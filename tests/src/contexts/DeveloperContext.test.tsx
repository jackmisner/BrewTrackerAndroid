/**
 * Developer Context Test Suite
 */

import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DeveloperProvider,
  useDeveloper,
  NetworkSimulationMode,
} from "@contexts/DeveloperContext";
import { Text, TouchableOpacity } from "react-native";
import UnifiedLogger from "@services/logger/UnifiedLogger";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock STORAGE_KEYS
jest.mock("@services/config", () => ({
  STORAGE_KEYS: {
    USER_SETTINGS: "user_settings",
  },
}));

// Mock UnifiedLogger
jest.mock("@services/logger/UnifiedLogger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Test component that uses the developer context
const TestComponent: React.FC<{
  onStateChange?: (state: any) => void;
}> = ({ onStateChange }) => {
  const developer = useDeveloper();

  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(developer);
    }
  }, [developer, onStateChange]);

  return (
    <>
      <Text testID="developer-mode">
        {developer.isDeveloperMode ? "dev" : "prod"}
      </Text>
      <Text testID="network-mode">{developer.networkSimulationMode}</Text>
      <Text testID="offline-status">
        {developer.isSimulatedOffline ? "offline" : "online"}
      </Text>
      <Text testID="slow-status">
        {developer.isSimulatedSlow ? "slow" : "fast"}
      </Text>

      <TouchableOpacity
        testID="toggle-offline"
        onPress={developer.toggleSimulatedOffline}
      >
        <Text>Toggle Offline</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="set-slow"
        onPress={() => developer.setNetworkSimulationMode("slow")}
      >
        <Text>Set Slow</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="reset-settings"
        onPress={developer.resetDeveloperSettings}
      >
        <Text>Reset Settings</Text>
      </TouchableOpacity>
    </>
  );
};

describe("DeveloperContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  describe("Provider Initialization", () => {
    it("should provide default context values", async () => {
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("normal");
        expect(getByTestId("offline-status")).toHaveTextContent("online");
        expect(getByTestId("slow-status")).toHaveTextContent("fast");
      });
    });

    it("should detect developer mode correctly", async () => {
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await waitFor(() => {
        // In test environment, __DEV__ is true
        expect(getByTestId("developer-mode")).toHaveTextContent("dev");
      });
    });

    it("should load stored network simulation mode", async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('"offline"');

      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("offline");
        expect(getByTestId("offline-status")).toHaveTextContent("offline");
      });
    });

    it("should handle invalid stored data gracefully", async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('"invalid-mode"');

      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await waitFor(() => {
        // Should fallback to default "normal" mode
        expect(getByTestId("network-mode")).toHaveTextContent("normal");
      });
    });

    it("should handle storage errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(
        new Error("Storage error")
      );
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("normal");
        expect(UnifiedLogger.warn).toHaveBeenCalledWith(
          "developer",
          "Failed to load developer settings:",
          expect.any(Error)
        );
      });
    });
  });

  describe("Network Simulation Mode", () => {
    it("should set network simulation mode and persist it", async () => {
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await act(async () => {
        getByTestId("set-slow").props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("slow");
        expect(getByTestId("slow-status")).toHaveTextContent("slow");
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "user_settings_network_simulation",
          '"slow"'
        );
      });
    });

    it("should handle storage errors when setting mode", async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(
        new Error("Storage error")
      );
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await act(async () => {
        getByTestId("set-slow").props.onPress();
      });

      await waitFor(() => {
        expect(UnifiedLogger.error).toHaveBeenCalledWith(
          expect.any(String),
          "Failed to set network simulation mode:",
          expect.any(Error)
        );
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should toggle offline mode correctly", async () => {
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      // Toggle to offline
      await act(async () => {
        getByTestId("toggle-offline").props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("offline");
        expect(getByTestId("offline-status")).toHaveTextContent("offline");
      });

      // Toggle back to normal
      await act(async () => {
        getByTestId("toggle-offline").props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("normal");
        expect(getByTestId("offline-status")).toHaveTextContent("online");
      });
    });

    it("should maintain computed state consistency", async () => {
      let capturedState: any = null;

      render(
        <DeveloperProvider>
          <TestComponent onStateChange={state => (capturedState = state)} />
        </DeveloperProvider>
      );

      await waitFor(() => {
        expect(capturedState).not.toBeNull();
      });

      // Test all network modes
      const modes: NetworkSimulationMode[] = ["normal", "slow", "offline"];

      for (const mode of modes) {
        await act(async () => {
          await capturedState.setNetworkSimulationMode(mode);
        });

        await waitFor(() => {
          expect(capturedState.networkSimulationMode).toBe(mode);
          expect(capturedState.isSimulatedOffline).toBe(mode === "offline");
          expect(capturedState.isSimulatedSlow).toBe(mode === "slow");
        });
      }
    });
  });

  describe("Settings Reset", () => {
    it("should reset developer settings", async () => {
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      // First set to offline mode
      await act(async () => {
        getByTestId("toggle-offline").props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("offline");
      });

      // Reset settings
      await act(async () => {
        getByTestId("reset-settings").props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId("network-mode")).toHaveTextContent("normal");
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
          "user_settings_network_simulation"
        );
      });
    });

    it("should handle reset errors gracefully", async () => {
      mockAsyncStorage.removeItem.mockRejectedValueOnce(
        new Error("Reset error")
      );
      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await act(async () => {
        getByTestId("reset-settings").props.onPress();
      });

      await waitFor(() => {
        expect(UnifiedLogger.error).toHaveBeenCalledWith(
          expect.any(String),
          "Failed to reset developer settings:",
          expect.any(Error)
        );
      });
    });
  });

  describe("Hook Usage", () => {
    it("should throw error when used outside provider", () => {
      const TestComponentWithoutProvider = () => {
        useDeveloper();
        return <Text>Test</Text>;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow("useDeveloper must be used within a DeveloperProvider");
    });
  });

  describe("Console Logging", () => {
    it("should log network mode changes", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await act(async () => {
        getByTestId("set-slow").props.onPress();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Developer mode: Network simulation set to "slow"'
        );
      });

      consoleSpy.mockRestore();
    });

    it("should log settings reset", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const { getByTestId } = render(
        <DeveloperProvider>
          <TestComponent />
        </DeveloperProvider>
      );

      await act(async () => {
        getByTestId("reset-settings").props.onPress();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Developer settings reset to defaults"
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
