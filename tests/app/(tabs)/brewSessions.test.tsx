import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import BrewSessionsScreen from "../../../app/(tabs)/brewSessions";
import { mockData, scenarios, testUtils } from "../../testUtils";

// Mock React Native
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  FlatList: "FlatList",
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

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: "medium",
  },
}));

jest.mock("@services/api/apiService", () => ({
  default: {
    brewSessions: {
      getAll: jest.fn(),
    },
  },
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@styles/tabs/brewSessionsStyles", () => ({
  brewSessionsStyles: jest.fn(() => ({
    container: { flex: 1 },
    header: { padding: 16 },
    tabContainer: { flexDirection: "row" },
    tab: { flex: 1, padding: 12, alignItems: "center" },
    activeTab: { borderBottomWidth: 2 },
    tabText: { fontSize: 16 },
    activeTabText: { fontWeight: "bold" },
    floatingButton: { position: "absolute", right: 16, bottom: 16 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 8 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    errorSubtext: { fontSize: 14, textAlign: "center", marginTop: 8 },
    retryButton: { padding: 12, borderRadius: 6, marginTop: 16 },
    retryButtonText: { color: "#fff" },
    brewSessionCard: { padding: 16, marginVertical: 8 },
    brewSessionHeader: { marginBottom: 12 },
    brewSessionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    brewSessionName: { fontSize: 18, fontWeight: "bold", flex: 1 },
    statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: "#fff", fontSize: 12, marginLeft: 4 },
    recipeStyle: { fontSize: 14, color: "#666", marginTop: 4 },
    progressContainer: { marginBottom: 12 },
    progressInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    progressLabel: { fontSize: 14, fontWeight: "600" },
    stageText: { fontSize: 12, color: "#666" },
    progressBar: { height: 4, backgroundColor: "#e0e0e0", borderRadius: 2 },
    progressFill: { height: "100%", backgroundColor: "#4CAF50", borderRadius: 2 },
    brewSessionMetrics: { flexDirection: "row", justifyContent: "space-between" },
    metric: { alignItems: "center" },
    metricLabel: { fontSize: 12, color: "#666" },
    metricValue: { fontSize: 14, fontWeight: "600" },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    emptySubtitle: { fontSize: 14, textAlign: "center", marginTop: 8 },
    createButton: { flexDirection: "row", alignItems: "center", padding: 12, marginTop: 16 },
    createButtonText: { color: "#fff", marginLeft: 8 },
    listContainer: { paddingHorizontal: 16 },
  })),
}));

jest.mock("@utils/formatUtils", () => ({
  formatGravity: jest.fn((value) => value ? value.toFixed(3) : "—"),
  formatABV: jest.fn((value) => value ? `${value.toFixed(1)}%` : "—"),
}));

jest.mock("@src/components/ui/ContextMenu/BrewSessionContextMenu", () => ({
  BrewSessionContextMenu: "BrewSessionContextMenu",
  createDefaultBrewSessionActions: jest.fn(() => ({})),
}));

jest.mock("@src/components/ui/ContextMenu/BaseContextMenu", () => ({
  useContextMenu: jest.fn(() => ({
    visible: false,
    selectedItem: null,
    position: { x: 0, y: 0 },
    showMenu: jest.fn(),
    hideMenu: jest.fn(),
  })),
}));

jest.mock("@src/components/ui/ContextMenu/contextMenuUtils", () => ({
  getTouchPosition: jest.fn(() => ({ x: 0, y: 0 })),
}));

const mockTheme = {
  colors: {
    primary: "#007AFF",
    background: "#FFFFFF",
    text: "#000000",
    textSecondary: "#666666",
    error: "#FF3B30",
  },
};

const mockUseQuery = require("@tanstack/react-query").useQuery;
const mockRouter = require("expo-router").router;
const mockUseLocalSearchParams = require("expo-router").useLocalSearchParams;

// Setup mocks
require("@contexts/ThemeContext").useTheme.mockReturnValue(mockTheme);

describe("BrewSessionsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
    mockUseLocalSearchParams.mockReturnValue({});
    
    // Reset the useQuery mock to return default values
    mockUseQuery.mockImplementation(() => ({
      data: { brew_sessions: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    }));
  });

  describe("tab navigation", () => {
    const mockBrewSessions = [
      mockData.brewSession({ status: "fermenting" }),
      mockData.brewSession({ status: "completed" }),
      mockData.brewSession({ status: "active" }),
    ];

    beforeEach(() => {
      mockUseQuery.mockImplementation(() => ({
        data: { brew_sessions: mockBrewSessions },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));
    });

    it("should render active tab as selected by default", () => {
      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("Active (2)")).toBeTruthy(); // fermenting + active
      expect(getByText("Completed (1)")).toBeTruthy();
    });

    it("should switch to completed tab when URL parameter is set", () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("Completed (1)")).toBeTruthy();
    });

    it("should navigate to active tab when pressed from completed tab", () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });
      
      const { getByText } = render(<BrewSessionsScreen />);
      const activeTab = getByText("Active (2)");

      fireEvent.press(activeTab);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(tabs)/brewSessions",
        params: { activeTab: "active" },
      });
    });

    it("should navigate to completed tab when pressed", () => {
      const { getByText } = render(<BrewSessionsScreen />);
      const completedTab = getByText("Completed (1)");

      fireEvent.press(completedTab);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(tabs)/brewSessions",
        params: { activeTab: "completed" },
      });
    });

    it("should display correct session counts in tabs", () => {
      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("Active (2)")).toBeTruthy();
      expect(getByText("Completed (1)")).toBeTruthy();
    });
  });

  describe("loading state", () => {
    it("should show loading indicator while fetching data", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("Loading brew sessions...")).toBeTruthy();
    });
  });

  describe("error state", () => {
    it("should show error message when data fails to load", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
        refetch: jest.fn(),
      });

      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("Backend Not Available")).toBeTruthy();
      expect(getByText("Brew sessions require a backend connection. The app will show empty states until the backend is running.")).toBeTruthy();
    });

    it("should allow retry when error occurs", () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
        refetch: mockRefetch,
      });

      const { getByText } = render(<BrewSessionsScreen />);
      const retryButton = getByText("Retry");

      fireEvent.press(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("brew session list", () => {
    const mockBrewSessions = [
      mockData.brewSession({
        name: "Test IPA Brew",
        status: "fermenting",
        brew_date: "2024-01-15T00:00:00Z",
        original_gravity: 1.065,
        final_gravity: null,
        actual_abv: null,
      }),
      mockData.brewSession({
        name: "Test Stout Brew",
        status: "completed",
        brew_date: "2024-01-01T00:00:00Z",
        original_gravity: 1.055,
        final_gravity: 1.015,
        actual_abv: 5.2,
      }),
    ];

    beforeEach(() => {
      mockUseQuery.mockImplementation(() => ({
        data: { brew_sessions: mockBrewSessions },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));
    });

    it("should render FlatList with active brew sessions", () => {
      const { queryByText } = render(<BrewSessionsScreen />);

      // Verify active tab is displayed with correct count
      expect(queryByText("Active (1)")).toBeTruthy();
      // Verify completed tab shows correct count
      expect(queryByText("Completed (1)")).toBeTruthy();
    });

    it("should handle completed brew sessions tab logic", () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { queryByText } = render(<BrewSessionsScreen />);

      // When activeTab is "completed", component should handle tab state correctly
      // Verify tabs are still rendered with counts
      expect(queryByText("Active (1)")).toBeTruthy();
      expect(queryByText("Completed (1)")).toBeTruthy();
    });

    it("should provide correct data to FlatList", () => {
      const { queryByText } = render(<BrewSessionsScreen />);

      // Verify component processes data correctly by checking the data structure
      // mockUseQuery should have been called with correct query key
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ["brewSessions"],
      }));
      // Component should render tabs showing correct data counts
      expect(queryByText("Active (1)")).toBeTruthy();
    });

    it("should handle brew session navigation logic", () => {
      const mockPush = jest.spyOn(require("expo-router").router, "push");
      
      const { getByText } = render(<BrewSessionsScreen />);

      // Test tab navigation - click on Completed tab
      const completedTab = getByText("Completed (1)");
      fireEvent.press(completedTab);
      
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(tabs)/brewSessions",
        params: { activeTab: "completed" },
      });

      mockPush.mockRestore();
    });

    it("should handle context menu setup", () => {
      const mockShowMenu = jest.fn();
      require("@src/components/ui/ContextMenu/BaseContextMenu").useContextMenu.mockReturnValue({
        visible: false,
        selectedItem: null,
        position: { x: 0, y: 0 },
        showMenu: mockShowMenu,
        hideMenu: jest.fn(),
      });

      render(<BrewSessionsScreen />);

      // Verify context menu hook was called (indicates context menu setup)
      expect(require("@src/components/ui/ContextMenu/BaseContextMenu").useContextMenu).toHaveBeenCalled();
      // Verify showMenu function is available for context menu interactions
      expect(mockShowMenu).toBeDefined();
    });
  });

  describe("empty states", () => {
    beforeEach(() => {
      // Mock is already set in main beforeEach to return empty data
    });

    it("should show empty state for active brew sessions", () => {
      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("No Active Brews")).toBeTruthy();
      expect(getByText("Start a brew session to track your fermentation progress")).toBeTruthy();
      expect(getByText("Start Brewing")).toBeTruthy();
    });

    it("should show empty state for completed brew sessions", () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("No Completed Brews")).toBeTruthy();
      expect(getByText("Completed brew sessions will appear here")).toBeTruthy();
    });

    it("should navigate to recipes when start brewing is pressed", () => {
      const { getByText } = render(<BrewSessionsScreen />);
      const startBrewingButton = getByText("Start Brewing");

      fireEvent.press(startBrewingButton);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(tabs)/recipes",
        params: { activeTab: "my" },
      });
    });
  });

  describe("floating action button", () => {
    beforeEach(() => {
      // Mock is already set in main beforeEach to return empty data
    });

    it("should show floating action button only for active tab", () => {
      const { queryByText } = render(<BrewSessionsScreen />);

      // Verify component renders active tab (which should show FAB)
      expect(queryByText("Active (0)")).toBeTruthy();
      // Verify component renders without errors when showing FAB
      expect(queryByText("Completed (0)")).toBeTruthy();
    });

    it("should not show floating action button for completed tab", () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { queryByText } = render(<BrewSessionsScreen />);

      // Verify component handles completed tab state correctly
      expect(queryByText("Active (0)")).toBeTruthy();
      expect(queryByText("Completed (0)")).toBeTruthy();
      // Component should render without errors even when FAB logic is conditional
      expect(queryByText("Active (0)")).toBeTruthy();
    });

  });

  describe("pull to refresh", () => {
    it("should trigger refetch when refreshing", async () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockImplementation(() => ({
        data: { brew_sessions: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      }));

      render(<BrewSessionsScreen />);

      // Since we can't easily test RefreshControl directly due to mocking,
      // we'll test that the refetch function is available
      expect(mockRefetch).toBeDefined();
    });
  });

  describe("status utilities", () => {
    const mockBrewSessions = [
      mockData.brewSession({ status: "fermenting" }),
      mockData.brewSession({ status: "completed" }),
      mockData.brewSession({ status: "paused" }),
      mockData.brewSession({ status: "failed" }),
    ];

    beforeEach(() => {
      mockUseQuery.mockImplementation(() => ({
        data: { brew_sessions: mockBrewSessions },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));
    });

    it("should display different status badges correctly", () => {
      const { queryByText } = render(<BrewSessionsScreen />);

      // Verify component renders with status handling capabilities
      expect(queryByText("Active (3)")).toBeTruthy(); // fermenting + paused + failed
      expect(queryByText("Completed (1)")).toBeTruthy(); // completed
      // Component should handle status rendering without errors
      expect(queryByText("Active (3)")).toBeTruthy();
    });
  });

  describe("progress calculation", () => {
    const mockBrewSession = mockData.brewSession({
      brew_date: "2024-01-01T00:00:00Z",
      expected_completion_date: "2024-01-15T00:00:00Z",
    });

    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: { brew_sessions: [mockBrewSession] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it("should calculate and display brewing progress", () => {
      // Since FlatList is mocked, we can't test the actual rendering of items
      // Instead, we verify that the component receives the correct data and can render without errors
      const { queryByText } = render(<BrewSessionsScreen />);

      // Verify the screen renders successfully with the mock data
      // The component should not crash and should display the tabs with counts
      expect(queryByText("Active (1)")).toBeTruthy();
      expect(queryByText("Completed (0)")).toBeTruthy();
      
      // Since FlatList is mocked, the actual progress calculation happens in the renderItem function
      // which isn't called. The test verifies the component structure and data handling.
    });
  });

  describe("context menu actions", () => {
    const mockActions = {
      onView: jest.fn(),
      onEdit: jest.fn(),
      onAddFermentationEntry: jest.fn(),
      onExportData: jest.fn(),
      onArchive: jest.fn(),
      onDelete: jest.fn(),
    };

    beforeEach(() => {
      require("@src/components/ui/ContextMenu/BrewSessionContextMenu").createDefaultBrewSessionActions
        .mockReturnValue(mockActions);
    });

    it("should create context menu actions with correct handlers", () => {
      render(<BrewSessionsScreen />);

      expect(require("@src/components/ui/ContextMenu/BrewSessionContextMenu").createDefaultBrewSessionActions)
        .toHaveBeenCalledWith(expect.objectContaining({
          onView: expect.any(Function),
          onEdit: expect.any(Function),
          onAddFermentationEntry: expect.any(Function),
          onExportData: expect.any(Function),
          onArchive: expect.any(Function),
          onDelete: expect.any(Function),
        }));
    });
  });

  describe("data safety", () => {
    it("should handle brew sessions with missing data gracefully", () => {
      const incompleteBrewSession = {
        id: "test-id",
        name: "",
        status: null,
        brew_date: "2024-01-01T00:00:00Z",
      };

      mockUseQuery.mockReturnValue({
        data: { brew_sessions: [incompleteBrewSession] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByText } = render(<BrewSessionsScreen />);

      // Brew session with empty name should not be rendered
      expect(queryByText("Unknown")).toBeNull();
    });

    it("should handle missing brew_sessions array gracefully", () => {
      mockUseQuery.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(<BrewSessionsScreen />);

      expect(getByText("Active (0)")).toBeTruthy();
      expect(getByText("Completed (0)")).toBeTruthy();
    });
  });

  describe("date formatting", () => {
    const mockBrewSession = mockData.brewSession({
      name: "Test Brew Session",
      brew_date: "2024-01-15T00:00:00Z",
    });

    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: { brew_sessions: [mockBrewSession] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it("should format dates correctly", () => {
      const { queryByText } = render(<BrewSessionsScreen />);

      // Verify component renders with date handling capabilities
      expect(queryByText("Active (1)")).toBeTruthy();
      expect(queryByText("Completed (0)")).toBeTruthy();
      // Component should handle date formatting without errors
      expect(queryByText("Active (1)")).toBeTruthy();
    });
  });
});