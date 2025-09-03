import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ThemeProvider,
  useTheme,
  ThemeMode,
  ThemeContextValue,
} from "@contexts/ThemeContext";

// Mock React Native modules
jest.mock("react-native", () => ({
  Appearance: {
    getColorScheme: jest.fn(),
    addChangeListener: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock color imports
jest.mock("@styles/common/colors", () => ({
  lightColors: {
    primary: "#007AFF",
    primaryText: "#FFFFFF",
    background: "#FFFFFF",
    backgroundSecondary: "#F2F2F7",
    text: "#000000",
    textSecondary: "#3C3C43",
    textMuted: "#8E8E93",
    border: "#C6C6C8",
    borderLight: "#E5E5EA",
    error: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
    info: "#007AFF",
    inputBackground: "#FFFFFF",
    shadow: "#000000",
    gravityLine: "#FF6B6B",
    temperatureLine: "#4ECDC4",
  },
  darkColors: {
    primary: "#0A84FF",
    primaryText: "#FFFFFF",
    background: "#000000",
    backgroundSecondary: "#1C1C1E",
    text: "#FFFFFF",
    textSecondary: "#AEAEB2",
    textMuted: "#8E8E93",
    border: "#38383A",
    borderLight: "#2C2C2E",
    error: "#FF453A",
    success: "#32D74B",
    warning: "#FF9F0A",
    info: "#64D2FF",
    inputBackground: "#1C1C1E",
    shadow: "#000000",
    gravityLine: "#FF6B6B",
    temperatureLine: "#4ECDC4",
  },
}));

const mockAppearance = Appearance as jest.Mocked<typeof Appearance>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("ThemeContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppearance.getColorScheme.mockReturnValue("light");
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  const createWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(ThemeProvider, { children });

  describe("useTheme hook", () => {
    it("should throw error when used outside provider", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");

      consoleSpy.mockRestore();
    });

    it("should provide theme context when used within provider", () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.theme).toBe("system");
      expect(result.current.colors).toBeDefined();
      expect(typeof result.current.isDark).toBe("boolean");
      expect(typeof result.current.setTheme).toBe("function");
      expect(typeof result.current.toggleTheme).toBe("function");
    });
  });

  describe("ThemeProvider", () => {
    it("should initialize with system theme and light colors when system is light", () => {
      mockAppearance.getColorScheme.mockReturnValue("light");

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe("system");
      expect(result.current.isDark).toBe(false);
      expect(result.current.colors.background).toBe("#FFFFFF");
    });

    it("should initialize with system theme and dark colors when system is dark", () => {
      mockAppearance.getColorScheme.mockReturnValue("dark");

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe("system");
      expect(result.current.isDark).toBe(true);
      expect(result.current.colors.background).toBe("#000000");
    });

    it("should load saved theme preference from storage", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("dark");

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Wait for effect to complete
      await act(async () => {
        await testUtils.waitForNextTick();
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("should ignore invalid saved theme preference", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid");

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await testUtils.waitForNextTick();
      });

      expect(result.current.theme).toBe("system");
    });

    it("should handle storage errors gracefully", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await testUtils.waitForNextTick();
      });

      expect(result.current.theme).toBe("system");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading theme preference:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should listen to system theme changes when theme is system", () => {
      const mockSubscription = { remove: jest.fn() };
      let changeListener: (event: { colorScheme: any }) => void;

      mockAppearance.addChangeListener.mockImplementation(callback => {
        changeListener = callback;
        return mockSubscription;
      });

      const wrapper = createWrapper;
      const { result, unmount } = renderHook(() => useTheme(), { wrapper });

      // Initially light
      expect(result.current.isDark).toBe(false);

      // System changes to dark
      act(() => {
        changeListener({ colorScheme: "dark" });
      });

      expect(result.current.isDark).toBe(true);

      // Cleanup
      unmount();
      expect(mockSubscription.remove).toHaveBeenCalled();
    });

    it("should not respond to system changes when theme is not system", async () => {
      const mockSubscription = { remove: jest.fn() };
      let changeListener: (event: { colorScheme: any }) => void;

      mockAppearance.addChangeListener.mockImplementation(callback => {
        changeListener = callback;
        return mockSubscription;
      });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Set to explicit light theme
      await act(async () => {
        await result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);

      // System changes to dark - should not affect theme
      act(() => {
        changeListener({ colorScheme: "dark" });
      });

      expect(result.current.isDark).toBe(false);
    });
  });

  describe("setTheme function", () => {
    it("should set theme to light", async () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setTheme("light");
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@brewtracker_theme_preference",
        "light"
      );
      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("should set theme to dark", async () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@brewtracker_theme_preference",
        "dark"
      );
      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("should set theme to system", async () => {
      mockAppearance.getColorScheme.mockReturnValue("dark");

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setTheme("system");
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@brewtracker_theme_preference",
        "system"
      );
      expect(result.current.theme).toBe("system");
      expect(result.current.isDark).toBe(true); // Should follow system (dark)
    });

    it("should handle storage errors gracefully", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage error"));

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error saving theme preference:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("toggleTheme function", () => {
    it("should toggle from light to dark", async () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Start with light theme
      await act(async () => {
        await result.current.setTheme("light");
      });

      expect(result.current.isDark).toBe(false);

      // Toggle to dark
      await act(async () => {
        await result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("should toggle from dark to light", async () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Start with dark theme
      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(result.current.isDark).toBe(true);

      // Toggle to light
      await act(async () => {
        await result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("should toggle system theme based on current effective theme", async () => {
      mockAppearance.getColorScheme.mockReturnValue("light");

      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Start with system theme (effective light)
      expect(result.current.theme).toBe("system");
      expect(result.current.isDark).toBe(false);

      // Toggle should set to dark
      await act(async () => {
        await result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });
  });

  describe("color themes", () => {
    it("should provide light colors when in light mode", async () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setTheme("light");
      });

      expect(result.current.colors.background).toBe("#FFFFFF");
      expect(result.current.colors.text).toBe("#000000");
      expect(result.current.colors.primary).toBe("#007AFF");
    });

    it("should provide dark colors when in dark mode", async () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(result.current.colors.background).toBe("#000000");
      expect(result.current.colors.text).toBe("#FFFFFF");
      expect(result.current.colors.primary).toBe("#0A84FF");
    });
  });
});
