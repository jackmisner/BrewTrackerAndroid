/**
 * Tests for VersionHistoryScreen
 *
 * Tests the version history modal including API integration, UI states,
 * navigation, and user interactions using testID patterns.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import VersionHistoryScreen from "../../../../app/(modals)/(recipes)/versionHistory";
import { TEST_IDS } from "@constants/testIDs";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      text: "#000",
      background: "#FFF",
      error: "#FF3B30",
      textSecondary: "#666",
    },
    fonts: { regular: "System" },
  }),
}));

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({
    recipe_id: "recipe-123",
  })),
}));

// Mock React Query
const mockVersionHistoryQuery: {
  data: any;
  isLoading: boolean;
  error: any;
  refetch: jest.Mock;
} = {
  data: null,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

const mockCurrentRecipeQuery: {
  data: any;
  isLoading: boolean;
  error: any;
  refetch: jest.Mock;
} = {
  data: null,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn().mockImplementation(config => {
    // Return version history query for version history requests
    if (config.queryKey[0] === "versionHistory") {
      return mockVersionHistoryQuery;
    }
    // Return current recipe query for recipe requests
    if (config.queryKey[0] === "recipe") {
      return mockCurrentRecipeQuery;
    }
    // Default fallback
    return mockVersionHistoryQuery;
  }),
}));

// Mock API Service
const mockApiService = {
  recipes: {
    getVersionHistory: jest.fn(),
    getById: jest.fn(),
  },
};

jest.mock("@services/api/apiService", () => ({
  default: mockApiService,
}));

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});

describe("VersionHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset query mocks to default state
    Object.assign(mockVersionHistoryQuery, {
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    Object.assign(mockCurrentRecipeQuery, {
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      expect(() => render(<VersionHistoryScreen />)).not.toThrow();
    });

    it("should display proper header elements", () => {
      const { getByText, getByTestId } = render(<VersionHistoryScreen />);

      expect(getByText("Version History")).toBeTruthy();
      expect(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("version-history-back")
        )
      ).toBeTruthy();
    });

    it("should have scrollable content area when data exists", () => {
      // Set up proper version history data
      Object.assign(mockVersionHistoryQuery, {
        data: {
          current_version: 1,
          all_versions: [
            {
              recipe_id: "v1",
              name: "Version 1",
              version: 1,
              unit_system: "imperial",
              is_current: true,
              is_root: true,
              is_available: true,
            },
          ],
          total_versions: 1,
        },
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<VersionHistoryScreen />);

      expect(
        getByTestId(TEST_IDS.patterns.scrollAction("version-history"))
      ).toBeTruthy();
    });
  });

  describe("Loading States", () => {
    it("should show loading indicator when fetching data", () => {
      mockVersionHistoryQuery.isLoading = true;

      const { getByText } = render(<VersionHistoryScreen />);

      expect(getByText("Loading version history...")).toBeTruthy();
    });

    it("should show loading for current recipe query", () => {
      mockCurrentRecipeQuery.isLoading = true;

      const { getByText } = render(<VersionHistoryScreen />);

      expect(getByText("Loading version history...")).toBeTruthy();
    });
  });

  describe("Error States", () => {
    it("should display error state when version history fails to load", () => {
      mockVersionHistoryQuery.error = new Error("Failed to load versions");

      const { getByText, getByTestId } = render(<VersionHistoryScreen />);

      expect(getByText("Version History")).toBeTruthy();
      expect(
        getByText(
          "Version history is not yet available for this recipe. This feature may not be implemented on the backend yet."
        )
      ).toBeTruthy();
      expect(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("version-history-go-back")
        )
      ).toBeTruthy();
    });

    it("should show empty state when no versions exist", () => {
      mockVersionHistoryQuery.data = { versions: [], recipe_id: "recipe-123" };

      const { getByText, getByTestId } = render(<VersionHistoryScreen />);

      expect(
        getByText("This recipe doesn't have any version history available.")
      ).toBeTruthy();
      expect(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("version-history-go-back")
        )
      ).toBeTruthy();
    });

    it("should handle back navigation from error state", () => {
      const mockRouter = require("expo-router").router;
      mockVersionHistoryQuery.error = new Error("API Error");

      const { getByTestId } = render(<VersionHistoryScreen />);

      fireEvent.press(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("version-history-go-back")
        )
      );

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe("Version History Display", () => {
    it("should render version list with proper testIDs", () => {
      // Set up proper mock data
      Object.assign(mockVersionHistoryQuery, {
        data: {
          current_version: 2,
          all_versions: [
            {
              recipe_id: "v1",
              name: "Original Recipe",
              version: 1,
              unit_system: "imperial",
              is_current: false,
              is_root: true,
              is_available: true,
            },
            {
              recipe_id: "v2",
              name: "Updated Recipe",
              version: 2,
              unit_system: "imperial",
              is_current: true,
              is_root: false,
              is_available: true,
            },
          ],
          total_versions: 2,
        },
        isLoading: false,
        error: null,
      });

      const { getByTestId, getByText } = render(<VersionHistoryScreen />);

      // Check for version items with dynamic testIDs
      expect(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("version-item-v1"))
      ).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("version-item-v2"))
      ).toBeTruthy();

      // Check version content
      expect(getByText("Original Recipe")).toBeTruthy();
      expect(getByText("Updated Recipe")).toBeTruthy();
    });

    it("should handle enhanced version history response format", () => {
      mockVersionHistoryQuery.data = {
        current_version: 3,
        root_recipe: {
          recipe_id: "root",
          name: "Root",
          version: 1,
          unit_system: "imperial",
        },
        immediate_parent: {
          recipe_id: "v1",
          name: "Parent",
          version: 2,
          unit_system: "imperial",
        },
        all_versions: [
          {
            recipe_id: "root",
            name: "Root",
            is_current: false,
            version: 1,
            unit_system: "imperial",
            is_root: true,
            is_available: true,
          },
          {
            recipe_id: "v1",
            name: "Parent",
            is_current: false,
            version: 2,
            unit_system: "imperial",
            is_root: false,
            is_available: true,
          },
          {
            recipe_id: "v2",
            name: "Current",
            is_current: true,
            version: 3,
            unit_system: "imperial",
            is_root: false,
            is_available: true,
          },
          {
            recipe_id: "v3",
            name: "Child",
            is_current: false,
            version: 4,
            unit_system: "imperial",
            is_root: false,
            is_available: true,
          },
        ],
        total_versions: 4,
      };

      const { getAllByText } = render(<VersionHistoryScreen />);

      // Check that all versions render without error
      expect(getAllByText("Root").length).toBeGreaterThan(0);
      expect(getAllByText("Parent").length).toBeGreaterThan(0);
      expect(getAllByText("Current").length).toBeGreaterThan(0);
      expect(getAllByText("Child").length).toBeGreaterThan(0);
    });

    it("should handle legacy version history response format", () => {
      mockVersionHistoryQuery.data = {
        current_version: 2,
        parent_recipe: {
          recipe_id: "v1",
          name: "Version 1",
          version: 1,
          unit_system: "imperial",
        },
        child_versions: [],
      };

      const { getAllByText } = render(<VersionHistoryScreen />);

      expect(getAllByText("Version 1").length).toBeGreaterThan(0);
      expect(getAllByText("Current Version").length).toBeGreaterThan(0);
    });
  });

  describe("User Interactions", () => {
    it("should handle back button navigation", () => {
      const mockRouter = require("expo-router").router;

      const { getByTestId } = render(<VersionHistoryScreen />);

      fireEvent.press(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("version-history-back")
        )
      );

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it("should handle version item tap for navigation", () => {
      const mockRouter = require("expo-router").router;
      mockVersionHistoryQuery.data = {
        current_version: 1,
        all_versions: [
          {
            recipe_id: "v1",
            name: "Version 1",
            is_current: false,
            is_available: true,
            version: 1,
            unit_system: "imperial",
            is_root: true,
          },
        ],
        total_versions: 1,
      };

      const { getByTestId } = render(<VersionHistoryScreen />);

      fireEvent.press(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("version-item-v1"))
      );

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(modals)/(recipes)/viewRecipe",
        params: { recipe_id: "v1" },
      });
    });

    it("should disable tap on current version item", () => {
      const mockRouter = require("expo-router").router;
      mockVersionHistoryQuery.data = {
        current_version: 2,
        all_versions: [
          {
            recipe_id: "v2",
            name: "Current Version",
            is_current: true,
            is_available: true,
            version: 2,
            unit_system: "imperial",
            is_root: false,
          },
        ],
        total_versions: 1,
      };

      const { getByTestId } = render(<VersionHistoryScreen />);

      fireEvent.press(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("version-item-v2"))
      );

      // Should not navigate when tapping current version
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe("Pull-to-Refresh", () => {
    it("should support pull-to-refresh functionality", async () => {
      mockVersionHistoryQuery.data = {
        current_version: 1,
        all_versions: [
          {
            recipe_id: "v1",
            name: "Version 1",
            version: 1,
            unit_system: "imperial",
            is_current: true,
            is_root: true,
            is_available: true,
          },
        ],
        total_versions: 1,
      };

      const { getByTestId } = render(<VersionHistoryScreen />);

      const scrollView = getByTestId(
        TEST_IDS.patterns.scrollAction("version-history")
      );
      const refreshControl = scrollView.props.refreshControl;

      expect(refreshControl).toBeTruthy();
      expect(refreshControl.props.refreshing).toBe(false);

      // Simulate pull-to-refresh by calling onRefresh directly
      await refreshControl.props.onRefresh();

      expect(mockVersionHistoryQuery.refetch).toHaveBeenCalled();
      expect(mockCurrentRecipeQuery.refetch).toHaveBeenCalled();
    });

    it("should handle refresh errors gracefully", async () => {
      mockVersionHistoryQuery.data = {
        current_version: 1,
        all_versions: [
          {
            recipe_id: "v1",
            name: "Version 1",
            version: 1,
            unit_system: "imperial",
            is_current: true,
            is_root: true,
            is_available: true,
          },
        ],
        total_versions: 1,
      };
      mockVersionHistoryQuery.refetch.mockRejectedValueOnce(
        new Error("Refresh failed")
      );

      const { getByTestId } = render(<VersionHistoryScreen />);

      const scrollView = getByTestId(
        TEST_IDS.patterns.scrollAction("version-history")
      );
      const refreshControl = scrollView.props.refreshControl;

      // Should not throw when refresh fails
      await expect(refreshControl.props.onRefresh()).resolves.toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing recipe_id parameter", () => {
      require("expo-router").useLocalSearchParams.mockReturnValueOnce({});

      expect(() => render(<VersionHistoryScreen />)).not.toThrow();
    });

    it("should handle malformed version data", () => {
      mockVersionHistoryQuery.data = {
        current_version: 1,
        all_versions: [
          {
            recipe_id: "v1",
            name: "Missing fields",
            version: 1,
            unit_system: "imperial",
            is_current: false,
            is_root: true,
            is_available: true,
          },
        ],
        total_versions: 1,
      };

      expect(() => render(<VersionHistoryScreen />)).not.toThrow();
    });

    it("should handle undefined version history data", () => {
      mockVersionHistoryQuery.data = undefined;

      const { getByText } = render(<VersionHistoryScreen />);

      expect(
        getByText("This recipe doesn't have any version history available.")
      ).toBeTruthy();
    });
  });

  describe("Theme Integration", () => {
    it("should use theme colors for styling", () => {
      const { getByText } = render(<VersionHistoryScreen />);

      // Component should render with theme-styled elements
      expect(getByText("Version History")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should provide proper accessibility labels", () => {
      mockVersionHistoryQuery.data = {
        current_version: 1,
        all_versions: [
          {
            recipe_id: "v1",
            name: "Test Version",
            is_current: false,
            is_available: true,
            version: 1,
            unit_system: "imperial",
            is_root: true,
          },
        ],
        total_versions: 1,
      };

      const { getByTestId } = render(<VersionHistoryScreen />);

      // Check that buttons are accessible
      expect(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("version-history-back")
        )
      ).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("version-item-v1"))
      ).toBeTruthy();
    });
  });
});
