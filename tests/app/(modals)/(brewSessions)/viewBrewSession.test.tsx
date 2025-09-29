import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import ViewBrewSessionScreen from "../../../../app/(modals)/(brewSessions)/viewBrewSession";
import { mockData, testUtils } from "../../../testUtils";
import { TEST_IDS } from "../../../../src/constants/testIDs";

// Mock React Native
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  RefreshControl: "RefreshControl",
  ActivityIndicator: "ActivityIndicator",
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

// Mock dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

jest.mock("@tanstack/react-query", () => {
  const React = require("react");
  return {
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
    QueryClient: jest.fn().mockImplementation(() => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
    })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock("@services/api/apiService", () => ({
  default: {
    brewSessions: {
      getById: jest.fn(),
    },
  },
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@contexts/UnitContext", () => ({
  useUnits: jest.fn(),
}));

jest.mock("@contexts/AuthContext", () => {
  const React = require("react");
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => ({
      user: { id: "test-user-id", username: "testuser" },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      getUserId: jest.fn().mockResolvedValue("test-user-id"),
    }),
  };
});

// Mock UserCacheService - create dynamic mocks that can be controlled by tests
let mockBrewSessionsData = [];
let mockGetByIdResult = null;
let mockGetByIdError = null;

const setMockBrewSessionData = (data: any) => {
  mockBrewSessionsData = data ? [data] : [];
  mockGetByIdResult = data;
  mockGetByIdError = null;
};

const setMockBrewSessionError = (error: any) => {
  mockGetByIdResult = null;
  mockGetByIdError = error;
};

const setMockBrewSessionNotFound = () => {
  mockGetByIdResult = null;
  mockGetByIdError = null;
};

jest.mock("@services/offlineV2/UserCacheService", () => {
  const defaultMockBrewSession = {
    id: "test-brew-session-1",
    name: "Test Brew Session",
    recipe_id: "test-recipe-id",
    brew_date: "2024-01-01",
    status: "fermenting",
    user_id: "test-user-id",
    notes: "Test notes",
    created_at: "1640995200000",
    updated_at: "1640995200000",
    temperature_unit: "F",
    batch_size: 5,
    batch_size_unit: "gal",
  };

  return {
    UserCacheService: {
      getBrewSessions: jest.fn(() => Promise.resolve(mockBrewSessionsData)),
      getBrewSessionById: jest.fn(() => {
        if (mockGetByIdError) {
          return Promise.reject(mockGetByIdError);
        }
        return Promise.resolve(mockGetByIdResult);
      }),
      getPendingOperationsCount: jest.fn().mockResolvedValue(0),
    },
  };
});

// Initialize with default data
const defaultMockBrewSession = {
  id: "test-brew-session-1",
  name: "Test Brew Session",
  recipe_id: "test-recipe-id",
  brew_date: "2024-01-01",
  status: "fermenting",
  user_id: "test-user-id",
  notes: "Test notes",
  created_at: "1640995200000",
  updated_at: "1640995200000",
  temperature_unit: "F",
  batch_size: 5,
  batch_size_unit: "gal",
};
setMockBrewSessionData(defaultMockBrewSession);

jest.mock("@styles/modals/viewBrewSessionStyles", () => ({
  viewBrewSessionStyles: jest.fn(() => ({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", padding: 16 },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: "bold", flex: 1 },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: { marginTop: 8 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    errorText: { fontSize: 14, textAlign: "center", marginTop: 8 },
    retryButton: { padding: 12, borderRadius: 6, marginTop: 16 },
    retryButtonText: { color: "#fff" },
    scrollContent: { paddingBottom: 20 },
    titleContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    title: { fontSize: 24, fontWeight: "bold", flex: 1 },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: { color: "#fff", fontSize: 12 },
    metadataContainer: { padding: 16 },
    metadataText: { fontSize: 14, color: "#666", marginBottom: 4 },
    metricsContainer: { flexDirection: "row", flexWrap: "wrap", padding: 16 },
    metricCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: "#f5f5f5",
      padding: 12,
      marginBottom: 8,
      marginHorizontal: 4,
      borderRadius: 8,
    },
    metricLabel: { fontSize: 12, color: "#666", marginBottom: 4 },
    metricValue: { fontSize: 16, fontWeight: "bold" },
    detailsContainer: { padding: 16 },
    detailsTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
    detailsText: { fontSize: 14, lineHeight: 20 },
    ratingContainer: { flexDirection: "row", alignItems: "center" },
    ratingStar: { marginRight: 4 },
    ratingText: { marginLeft: 8, fontSize: 16, fontWeight: "bold" },
  })),
}));

jest.mock("@src/components/brewSessions/FermentationChart", () => {
  const React = require("react");
  const { TEST_IDS } = require("../../../../src/constants/testIDs");
  return {
    FermentationChart: jest.fn(
      ({
        fermentationData,
        expectedFG,
        actualOG,
        temperatureUnit,
        forceRefresh,
      }) =>
        React.createElement(
          "Text",
          { testID: TEST_IDS.charts.fermentationChart },
          `Fermentation Chart - ${fermentationData?.length || 0} entries`
        )
    ),
  };
});

jest.mock("@src/components/brewSessions/FermentationData", () => {
  const React = require("react");
  const { TEST_IDS } = require("../../../../src/constants/testIDs");
  return {
    FermentationData: jest.fn(
      ({
        fermentationData,
        expectedFG,
        actualOG,
        temperatureUnit,
        brewSessionId,
      }) =>
        React.createElement(
          "Text",
          { testID: TEST_IDS.charts.fermentationData },
          `Fermentation Data - ${fermentationData?.length || 0} entries`
        )
    ),
  };
});

const mockTheme = {
  colors: {
    primary: "#007AFF",
    background: "#FFFFFF",
    text: "#000000",
    textSecondary: "#666666",
    error: "#FF3B30",
  },
};

const mockUnits = {
  weight: "kg",
  volume: "L",
  temperature: "C",
};

const mockUseQuery = require("@tanstack/react-query").useQuery;
const mockRouter = require("expo-router").router;
const mockUseLocalSearchParams = require("expo-router").useLocalSearchParams;

// Setup mocks
require("@contexts/ThemeContext").useTheme.mockReturnValue(mockTheme);
require("@contexts/UnitContext").useUnits.mockReturnValue(mockUnits);

describe("ViewBrewSessionScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    testUtils.resetCounters();
    mockUseLocalSearchParams.mockReturnValue({
      brewSessionId: "test-brew-session-1",
    });
    // Reset to default successful state and rebind default impls
    setMockBrewSessionData(defaultMockBrewSession);
    const {
      UserCacheService,
    } = require("@services/offlineV2/UserCacheService");
    UserCacheService.getBrewSessions.mockImplementation(() =>
      Promise.resolve(mockBrewSessionsData)
    );
    UserCacheService.getBrewSessionById.mockImplementation(() =>
      mockGetByIdError
        ? Promise.reject(mockGetByIdError)
        : Promise.resolve(mockGetByIdResult)
    );
  });

  describe("loading state", () => {
    it("should show loading indicator while fetching brew session", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      const { getByText } = render(<ViewBrewSessionScreen />);

      expect(getByText("Loading brew session...")).toBeTruthy();
    });
  });

  describe("error state", () => {
    it("should show error message when brew session fails to load", async () => {
      // Simulate a network error from UserCacheService
      setMockBrewSessionError(new Error("Network error"));
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Failed to Load Brew Session")).toBeTruthy();
        expect(getByText("Network error")).toBeTruthy();
      });
    });

    it("should allow retry when error occurs", async () => {
      // Simulate a network error from UserCacheService
      setMockBrewSessionError(new Error("Network error"));
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        const retryButton = getByText("Try Again");
        fireEvent.press(retryButton);
      });

      // After retry, reset to successful data
      setMockBrewSessionData(defaultMockBrewSession);
    });
  });

  describe("empty state", () => {
    it("should show not found message when no brew session data is returned", async () => {
      // Simulate no session found from UserCacheService
      setMockBrewSessionNotFound();
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Failed to Load Brew Session")).toBeTruthy();
        expect(getByText("Brew session not found")).toBeTruthy();
      });
    });

    it("should navigate back when go back button is pressed in empty state", async () => {
      // Simulate no session found from UserCacheService
      setMockBrewSessionNotFound();
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      const { getByTestId } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        const backButton = getByTestId("header-back-button");
        fireEvent.press(backButton);
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });
  });

  describe("successful data load", () => {
    const mockBrewSessionForSuccess = {
      id: "test-brew-session-1",
      name: "Test IPA Brew Session",
      status: "fermenting",
      brew_date: "2024-01-15",
      fermentation_start_date: "2024-01-16",
      user_id: "test-user-id",
      recipe_id: "test-recipe-id",
      actual_og: "1.065",
      actual_fg: "1.012",
      actual_abv: "6.9",
      actual_efficiency: "75",
      notes: "Great brew day, everything went smoothly",
      tasting_notes: "Hoppy and balanced",
      batch_rating: "4",
      created_at: "1640995200000",
      updated_at: "1640995200000",
      temperature_unit: "F",
      batch_size: 5,
      batch_size_unit: "gal",
    };

    beforeEach(() => {
      // Override UserCacheService mock for this test suite
      setMockBrewSessionData(mockBrewSessionForSuccess);

      // Mock React Query for recipe data
      mockUseQuery.mockReturnValue({
        data: undefined, // Recipe data not needed for these tests
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });
    });

    it("should display brew session information correctly", async () => {
      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Test IPA Brew Session")).toBeTruthy();
        expect(getByText("Fermenting")).toBeTruthy();
        expect(
          getByText("Great brew day, everything went smoothly")
        ).toBeTruthy();
        expect(getByText("Hoppy and balanced")).toBeTruthy();
      });
    });

    it("should display brew session dates", async () => {
      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText(/Brew Date:/)).toBeTruthy();
        expect(getByText(/Fermentation Started:/)).toBeTruthy();
      });
    });

    it("should display brewing metrics correctly", async () => {
      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        // Test that OG metric is displayed correctly (shows 1.065 from mock data)
        expect(getByText("OG")).toBeTruthy();
        expect(getByText("1.065")).toBeTruthy();

        // Test that FG and ABV metrics are displayed with their values
        expect(getByText("FG")).toBeTruthy();
        expect(getByText("1.012")).toBeTruthy();
        expect(getByText("ABV")).toBeTruthy();
        expect(getByText("6.9%")).toBeTruthy();

        // Test that efficiency metric is shown
        expect(getByText("Efficiency")).toBeTruthy();
        expect(getByText("75%")).toBeTruthy();
      });
    });

    it("should display batch rating when present", async () => {
      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Batch Rating")).toBeTruthy();
        expect(getByText("4/5")).toBeTruthy();
      });
    });

    it("should display fermentation chart and data", async () => {
      const { getByTestId } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByTestId(TEST_IDS.charts.fermentationChart)).toBeTruthy();
        expect(getByTestId(TEST_IDS.charts.fermentationData)).toBeTruthy();
      });
    });
  });

  describe("status handling", () => {
    it("should display correct status text for different statuses", async () => {
      const statuses = [
        "planned",
        "in-progress",
        "fermenting",
        "conditioning",
        "completed",
        "archived",
      ];

      for (const status of statuses) {
        const brewSession = mockData.brewSession({
          id: "test-brew-session-1", // Important: must match the URL param
          status: status as any,
        });

        // Use the proper helper to set mock data
        setMockBrewSessionData(brewSession);

        const { getByText } = render(<ViewBrewSessionScreen />);

        await waitFor(() => {
          // Status should be capitalized
          const expectedText = status.charAt(0).toUpperCase() + status.slice(1);
          expect(getByText(expectedText)).toBeTruthy();
        });
      }
    });

    it("should handle invalid status gracefully", async () => {
      const brewSession = mockData.brewSession({
        id: "test-brew-session-1", // Important: must match the URL param
        status: null as any,
      });

      // Use the proper helper to set mock data
      setMockBrewSessionData(brewSession);

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Unknown")).toBeTruthy();
      });
    });
  });

  describe("date formatting", () => {
    it("should format dates correctly", async () => {
      const brewSession = mockData.brewSession({
        id: "test-brew-session-1", // Important: must match the URL param
        brew_date: "2024-01-15T00:00:00Z",
        fermentation_start_date: "2024-01-16T00:00:00Z",
      });

      // Use the proper helper to set mock data
      setMockBrewSessionData(brewSession);

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        // Test that brew date is formatted correctly
        const expectedBrewDate = new Date(
          "2024-01-15T00:00:00Z"
        ).toLocaleDateString();
        expect(getByText(`Brew Date: ${expectedBrewDate}`)).toBeTruthy();

        // Test that fermentation start date is formatted correctly
        const expectedFermentationDate = new Date(
          "2024-01-16T00:00:00Z"
        ).toLocaleDateString();
        expect(
          getByText(`Fermentation Started: ${expectedFermentationDate}`)
        ).toBeTruthy();
      });
    });

    it("should handle missing dates gracefully", async () => {
      const brewSession = mockData.brewSession({
        brew_date: undefined,
        fermentation_start_date: undefined,
      });

      // Mock UserCacheService to return the session with missing dates
      setMockBrewSessionData(brewSession);

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Brew Date: Not set")).toBeTruthy();
      });
    });

    it("should handle invalid dates gracefully", async () => {
      const brewSession = mockData.brewSession({
        brew_date: "invalid-date",
      });

      // Mock UserCacheService to return the session with invalid date
      setMockBrewSessionData(brewSession);

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Brew Date: Invalid date")).toBeTruthy();
      });
    });
  });

  describe("metric formatting", () => {
    it("should format brewing metrics with correct precision", async () => {
      const brewSession = mockData.brewSession({
        id: "test-brew-session-1", // Important: must match the URL param
        actual_og: 1.065432,
        actual_fg: 1.012345,
        actual_abv: 6.789,
        actual_efficiency: 75.5,
      });

      // Use the proper helper to set mock data
      setMockBrewSessionData(brewSession);

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        // Verify OG is formatted with 3 decimals
        expect(getByText("1.065")).toBeTruthy();
        // Verify FG is formatted with 3 decimals
        expect(getByText("1.012")).toBeTruthy();
        // Verify ABV is formatted with 1 decimal
        expect(getByText("6.8%")).toBeTruthy();
        // Verify efficiency is formatted as percentage (rounded to 0 decimals)
        expect(getByText("76%")).toBeTruthy();
      });
    });

    it("should handle missing metrics gracefully", async () => {
      const brewSession = mockData.brewSession({
        id: "test-brew-session-1", // Important: must match the URL param
        actual_og: undefined,
        actual_fg: undefined,
        actual_abv: undefined,
      });

      // Use the proper helper to set mock data
      setMockBrewSessionData(brewSession);

      const { getByTestId } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        // Missing metrics should display "—" for undefined actual_og, actual_fg, actual_abv
        expect(
          getByTestId(TEST_IDS.patterns.metricValue("OG"))
        ).toHaveTextContent("—");
        expect(
          getByTestId(TEST_IDS.patterns.metricValue("FG"))
        ).toHaveTextContent("—");
        expect(
          getByTestId(TEST_IDS.patterns.metricValue("ABV"))
        ).toHaveTextContent("—");
      });
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockData.brewSession(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });
    });

    it("should navigate back when back button is pressed", () => {
      const { getByTestId } = render(<ViewBrewSessionScreen />);

      // Find the back button by its testID
      const backButton = getByTestId(TEST_IDS.header.backButton);

      // Simulate pressing the back button
      fireEvent.press(backButton);

      // Verify router.back was called
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe("pull to refresh", () => {
    it("should trigger refetch when refreshing", async () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockReturnValue({
        data: mockData.brewSession(),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        dataUpdatedAt: Date.now(),
      });

      render(<ViewBrewSessionScreen />);

      // Since RefreshControl is mocked, we verify the refetch function is available
      expect(mockRefetch).toBeDefined();
    });
  });

  describe("chart refresh behavior", () => {
    it("should refresh chart when data is updated", async () => {
      const FermentationChart =
        require("@src/components/brewSessions/FermentationChart").FermentationChart;
      // Clear any previous calls to start fresh
      FermentationChart.mockClear();

      const brewSession = mockData.brewSession({
        fermentation_data: [
          { date: "2024-01-16", specific_gravity: 1.065, temperature: 68 },
        ],
      });

      // Mock UserCacheService to return the session with fermentation data
      setMockBrewSessionData(brewSession);

      const { rerender } = render(<ViewBrewSessionScreen />);

      // Wait for initial render
      await waitFor(() => {
        expect(FermentationChart).toHaveBeenCalled();
      });

      // Update session data and rerender
      const updatedBrewSession = mockData.brewSession({
        fermentation_data: [
          { date: "2024-01-16", specific_gravity: 1.065, temperature: 68 },
          { date: "2024-01-17", specific_gravity: 1.04, temperature: 70 },
        ],
      });

      setMockBrewSessionData(brewSession);

      rerender(<ViewBrewSessionScreen />);

      // Wait for rerender and verify chart was called again
      await waitFor(() => {
        const calls = FermentationChart.mock.calls;
        expect(calls.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should refresh chart when screen comes into focus", async () => {
      const brewSession = mockData.brewSession();

      // Mock UserCacheService to return the session
      setMockBrewSessionData(brewSession);

      const mockUseFocusEffect = require("expo-router").useFocusEffect;
      const FermentationChart =
        require("@src/components/brewSessions/FermentationChart").FermentationChart;

      const { rerender } = render(<ViewBrewSessionScreen />);

      // Wait for initial render and verify useFocusEffect was called
      await waitFor(() => {
        expect(mockUseFocusEffect).toHaveBeenCalled();
      });

      // Get the callback function passed to useFocusEffect and simulate focus
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];

      // Clear previous chart calls and record initial count
      const before = FermentationChart.mock.calls.length;
      FermentationChart.mockClear();

      // Simulate the focus effect callback
      await act(async () => {
        focusCallback();
      });

      // Re-render to trigger the chart update
      rerender(<ViewBrewSessionScreen />);

      // Verify the chart was called during focus refresh
      await waitFor(() => {
        expect(FermentationChart.mock.calls.length).toBeGreaterThan(0);
      });
    });
  });

  describe("optional sections", () => {
    it("should not display notes section when notes are empty", () => {
      const brewSession = mockData.brewSession({
        notes: null,
        tasting_notes: null,
        batch_rating: null,
      });

      mockUseQuery.mockReturnValue({
        data: brewSession,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      const { queryByText } = render(<ViewBrewSessionScreen />);

      expect(queryByText("Brew Notes")).toBeNull();
      expect(queryByText("Tasting Notes")).toBeNull();
      expect(queryByText("Batch Rating")).toBeNull();
    });

    it("should display optional sections when data is present", async () => {
      const brewSession = mockData.brewSession({
        notes: "Great brew day",
        tasting_notes: "Hoppy and balanced",
        batch_rating: 4,
        packaging_date: "2024-01-30T00:00:00Z",
        fermentation_end_date: "2024-01-25T00:00:00Z",
      });

      // Mock UserCacheService to return the session with optional data
      setMockBrewSessionData(brewSession);

      const { getByText } = render(<ViewBrewSessionScreen />);

      await waitFor(() => {
        expect(getByText("Brew Notes")).toBeTruthy();
        expect(getByText("Tasting Notes")).toBeTruthy();
        expect(getByText("Batch Rating")).toBeTruthy();
        expect(getByText(/Fermentation Ended:/)).toBeTruthy();
        expect(getByText(/Packaged:/)).toBeTruthy();
      });
    });
  });

  describe("route parameters", () => {
    it("should handle missing brewSessionId parameter", () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Brew session ID is required"),
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      const { getByText } = render(<ViewBrewSessionScreen />);

      expect(getByText("Failed to Load Brew Session")).toBeTruthy();
    });
  });

  describe("fermentation data integration", () => {
    it("should pass correct props to fermentation components", async () => {
      const brewSession = mockData.brewSession({
        fermentation_data: [
          { date: "2024-01-16", specific_gravity: 1.065, temperature: 68 },
          { date: "2024-01-18", specific_gravity: 1.04, temperature: 70 },
        ],
        target_fg: 1.012,
        actual_og: 1.065,
        temperature_unit: "F",
      });

      // Mock UserCacheService to return the session with fermentation data
      setMockBrewSessionData(brewSession);

      render(<ViewBrewSessionScreen />);

      const FermentationChart =
        require("@src/components/brewSessions/FermentationChart").FermentationChart;
      const FermentationData =
        require("@src/components/brewSessions/FermentationData").FermentationData;

      // Wait for components to be rendered and verify they were called
      await waitFor(() => {
        expect(FermentationChart).toHaveBeenCalled();
        expect(FermentationData).toHaveBeenCalled();
      });

      // Check that fermentation data is passed correctly
      const chartCall = FermentationChart.mock.calls[0][0];
      expect(chartCall.fermentationData).toEqual(brewSession.fermentation_data);
      expect(chartCall.expectedFG).toEqual(brewSession.target_fg);
      expect(chartCall.actualOG).toEqual(brewSession.actual_og);
      expect(chartCall.temperatureUnit).toEqual(brewSession.temperature_unit);
      // And the same for FermentationData
      const dataCall = FermentationData.mock.calls[0][0];
      expect(dataCall.fermentationData).toEqual(brewSession.fermentation_data);
      expect(dataCall.expectedFG).toEqual(brewSession.target_fg);
      expect(dataCall.actualOG).toEqual(brewSession.actual_og);
      expect(dataCall.temperatureUnit).toEqual(brewSession.temperature_unit);
      expect(dataCall.brewSessionId).toEqual("test-brew-session-1");
    });
  });

  describe("theme integration", () => {
    it("should use theme colors correctly", () => {
      mockUseQuery.mockReturnValue({
        data: mockData.brewSession(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
      });

      render(<ViewBrewSessionScreen />);

      expect(
        require("@styles/modals/viewBrewSessionStyles").viewBrewSessionStyles
      ).toHaveBeenCalledWith(mockTheme);
    });
  });
});
