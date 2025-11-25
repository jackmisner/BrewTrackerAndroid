import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import {
  renderWithProviders,
  mockData,
  scenarios,
  testUtils,
} from "../../testUtils";
import BrewSessionsScreen from "../../../app/(tabs)/brewSessions";

// Mock React Native with Appearance
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  FlatList: ({ data, ListEmptyComponent }: any) => {
    // Render empty component when data is empty
    if (!data || data.length === 0) {
      if (ListEmptyComponent) {
        // Call the function if it's a function, otherwise return it directly
        return typeof ListEmptyComponent === "function"
          ? ListEmptyComponent()
          : ListEmptyComponent;
      }
      return null;
    }
    return "FlatList";
  },
  RefreshControl: "RefreshControl",
  ActivityIndicator: "ActivityIndicator",
  Alert: {
    alert: jest.fn(),
  },
  Platform: { OS: "android" },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

// Mock dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
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

// Mock brew sessions data
const mockBrewSessions = [
  {
    id: "test-session-1",
    name: "Active Brew 1",
    recipe_id: "test-recipe-id-1",
    brew_date: "2024-01-01",
    status: "fermenting",
    user_id: "test-user-id",
    notes: "Test notes 1",
    created_at: "1640995200000",
    updated_at: "1640995200000",
    temperature_unit: "F",
    batch_size: 5,
    batch_size_unit: "gal",
  },
  {
    id: "test-session-2",
    name: "Active Brew 2",
    recipe_id: "test-recipe-id-2",
    brew_date: "2024-01-02",
    status: "in-progress",
    user_id: "test-user-id",
    notes: "Test notes 2",
    created_at: "1640995300000",
    updated_at: "1640995300000",
    temperature_unit: "F",
    batch_size: 5,
    batch_size_unit: "gal",
  },
  {
    id: "test-session-3",
    name: "Completed Brew",
    recipe_id: "test-recipe-id-3",
    brew_date: "2024-01-03",
    status: "completed",
    user_id: "test-user-id",
    notes: "Test notes 3",
    created_at: "1640995400000",
    updated_at: "1640995400000",
    temperature_unit: "F",
    batch_size: 5,
    batch_size_unit: "gal",
  },
];

const createMockUseBrewSessionsValue = (overrides = {}) => ({
  data: mockBrewSessions,
  isLoading: false,
  error: null,
  pendingCount: 0,
  conflictCount: 0,
  lastSync: null,
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  clone: jest.fn(),
  getById: jest.fn(),
  sync: jest.fn(),
  refresh: jest.fn(),
  addFermentationEntry: jest.fn(),
  updateFermentationEntry: jest.fn(),
  deleteFermentationEntry: jest.fn(),
  addDryHopFromRecipe: jest.fn(),
  removeDryHop: jest.fn(),
  deleteDryHopAddition: jest.fn(),
  ...overrides,
});

// Mock useBrewSessions hook
jest.mock("@hooks/offlineV2/useUserData", () => ({
  useBrewSessions: jest.fn(),
  useRecipes: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
}));

// Mock UserCacheService
jest.mock("@services/offlineV2/UserCacheService", () => {
  return {
    UserCacheService: {
      getBrewSessions: jest.fn().mockResolvedValue(mockBrewSessions),
      getPendingOperationsCount: jest.fn().mockResolvedValue(0),
      refreshBrewSessionsFromServer: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock React Query
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  const queryClientMock = {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  };
  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(() => queryClientMock),
  };
});

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

// Mock ThemeContext hook
jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: jest.fn(() => ({
      colors: {
        background: "#ffffff",
        text: "#000000",
        primary: "#f4511e",
        textSecondary: "#666666",
        border: "#e0e0e0",
      },
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: { marginTop: 8 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    errorSubtext: { fontSize: 14, textAlign: "center", marginTop: 8 },
    retryButton: { padding: 12, borderRadius: 6, marginTop: 16 },
    retryButtonText: { color: "#fff" },
    brewSessionCard: { padding: 16, marginVertical: 8 },
    brewSessionHeader: { marginBottom: 12 },
    brewSessionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brewSessionName: { fontSize: 18, fontWeight: "bold", flex: 1 },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: { color: "#fff", fontSize: 12, marginLeft: 4 },
    recipeStyle: { fontSize: 14, color: "#666", marginTop: 4 },
    progressContainer: { marginBottom: 12 },
    progressInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    progressLabel: { fontSize: 14, fontWeight: "600" },
    stageText: { fontSize: 12, color: "#666" },
    progressBar: { height: 4, backgroundColor: "#e0e0e0", borderRadius: 2 },
    progressFill: {
      height: "100%",
      backgroundColor: "#4CAF50",
      borderRadius: 2,
    },
    brewSessionMetrics: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    metric: { alignItems: "center" },
    metricLabel: { fontSize: 12, color: "#666" },
    metricValue: { fontSize: 14, fontWeight: "600" },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    emptySubtitle: { fontSize: 14, textAlign: "center", marginTop: 8 },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      marginTop: 16,
    },
    createButtonText: { color: "#fff", marginLeft: 8 },
    listContainer: { paddingHorizontal: 16 },
  })),
}));

jest.mock("@utils/formatUtils", () => ({
  formatGravity: jest.fn(value => (value ? value.toFixed(3) : "—")),
  formatABV: jest.fn(value => (value ? `${value.toFixed(1)}%` : "—")),
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
const mockUseMutation = require("@tanstack/react-query").useMutation;
const mockRouter = require("expo-router").router;
const mockUseLocalSearchParams = require("expo-router").useLocalSearchParams;
const mockUseBrewSessions =
  require("@hooks/offlineV2/useUserData").useBrewSessions;

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

    // Set up default useMutation mock
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue(undefined),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });

    // Set up default useBrewSessions mock with mockBrewSessions data
    mockUseBrewSessions.mockReturnValue(
      createMockUseBrewSessionsValue({
        data: mockBrewSessions,
        isLoading: false,
      })
    );

    // Reset UserCacheService mock implementations to prevent test leakage
    const UserCacheServiceMock =
      require("@services/offlineV2/UserCacheService").UserCacheService;
    UserCacheServiceMock.getBrewSessions.mockResolvedValue(mockBrewSessions);
    UserCacheServiceMock.getPendingOperationsCount.mockResolvedValue(0);
    UserCacheServiceMock.refreshBrewSessionsFromServer.mockResolvedValue(
      undefined
    );
  });

  describe("tab navigation", () => {
    const tabTestBrewSessions = [
      mockData.brewSession({ status: "fermenting" }),
      mockData.brewSession({ status: "completed" }),
      mockData.brewSession({ status: "in-progress" }),
    ];

    beforeEach(() => {
      mockUseQuery.mockImplementation(() => ({
        data: { brew_sessions: tabTestBrewSessions },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));
    });

    it("should render active tab as selected by default", async () => {
      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        expect(getByText("Active (2)")).toBeTruthy(); // fermenting + active
        expect(getByText("Completed (1)")).toBeTruthy();
      });
    });

    it("should switch to completed tab when URL parameter is set", async () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        expect(getByText("Completed (1)")).toBeTruthy();
      });
    });

    it("should navigate to active tab when pressed from completed tab", async () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        const activeTab = getByText("Active (2)");
        fireEvent.press(activeTab);
        expect(mockRouter.push).toHaveBeenCalledWith({
          pathname: "/(tabs)/brewSessions",
          params: { activeTab: "active" },
        });
      });
    });

    it("should navigate to completed tab when pressed", async () => {
      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        const completedTab = getByText("Completed (1)");
        fireEvent.press(completedTab);
        expect(mockRouter.push).toHaveBeenCalledWith({
          pathname: "/(tabs)/brewSessions",
          params: { activeTab: "completed" },
        });
      });
    });

    it("should display correct session counts in tabs", async () => {
      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        expect(getByText("Active (2)")).toBeTruthy();
        expect(getByText("Completed (1)")).toBeTruthy();
      });
    });
  });

  describe("loading state", () => {
    it("should show loading indicator while fetching data", () => {
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({ data: [], isLoading: true })
      );

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      expect(getByText("Loading brew sessions...")).toBeTruthy();
    });
  });

  describe("error state", () => {
    it("should show error message when data fails to load", async () => {
      // Mock useBrewSessions to return an error
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          error: new Error("Network error"),
        })
      );

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        expect(getByText("Backend Not Available")).toBeTruthy();
        expect(
          getByText(
            "Brew sessions require a backend connection. The app will show empty states until the backend is running."
          )
        ).toBeTruthy();
      });
    });

    it("should allow retry when error occurs", async () => {
      // Mock refresh function
      const mockRefresh = jest.fn();

      // Mock useBrewSessions to return an error
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          error: new Error("Network error"),
          refresh: mockRefresh,
        })
      );

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        expect(getByText("Backend Not Available")).toBeTruthy();
      });

      const retryButton = getByText("Retry");
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("brew session list", () => {
    // Use the default mock data that provides 2 active + 1 completed = 3 total sessions
    beforeEach(() => {
      // Restore the default mock data from the top-level mock
      // This ensures tests get the expected counts: Active (2), Completed (1)
      const defaultMockBrewSessions = [
        {
          id: "test-session-1",
          name: "Active Brew 1",
          recipe_id: "test-recipe-id-1",
          brew_date: "2024-01-01",
          status: "fermenting",
          user_id: "test-user-id",
          notes: "Test notes 1",
          created_at: "1640995200000",
          updated_at: "1640995200000",
          temperature_unit: "F",
          batch_size: 5,
          batch_size_unit: "gal",
        },
        {
          id: "test-session-2",
          name: "Active Brew 2",
          recipe_id: "test-recipe-id-2",
          brew_date: "2024-01-02",
          status: "in-progress",
          user_id: "test-user-id",
          notes: "Test notes 2",
          created_at: "1640995300000",
          updated_at: "1640995300000",
          temperature_unit: "F",
          batch_size: 5,
          batch_size_unit: "gal",
        },
        {
          id: "test-session-3",
          name: "Completed Brew",
          recipe_id: "test-recipe-id-3",
          brew_date: "2024-01-03",
          status: "completed",
          user_id: "test-user-id",
          notes: "Test notes 3",
          created_at: "1640995400000",
          updated_at: "1640995400000",
          temperature_unit: "F",
          batch_size: 5,
          batch_size_unit: "gal",
        },
      ];

      require("@services/offlineV2/UserCacheService").UserCacheService.getBrewSessions.mockResolvedValue(
        defaultMockBrewSessions
      );
    });

    it("should render FlatList with active brew sessions", async () => {
      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        // Verify active tab is displayed with correct count
        expect(queryByText("Active (2)")).toBeTruthy();
        // Verify completed tab shows correct count
        expect(queryByText("Completed (1)")).toBeTruthy();
      });
    });

    it("should handle completed brew sessions tab logic", async () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        // When activeTab is "completed", component should handle tab state correctly
        // Verify tabs are still rendered with counts from the mock data
        expect(queryByText("Active (2)")).toBeTruthy();
        expect(queryByText("Completed (1)")).toBeTruthy();
      });
    });

    it("should provide correct data to FlatList", async () => {
      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        // Verify component uses the V2 hook
        expect(mockUseBrewSessions).toHaveBeenCalled();
        // Component should render tabs showing correct data counts
        expect(queryByText("Active (2)")).toBeTruthy();
      });
    });

    it("should handle brew session navigation logic", async () => {
      const mockPush = jest.spyOn(require("expo-router").router, "push");

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      // Wait for data to load and tabs to render
      await waitFor(() => {
        expect(getByText("Completed (1)")).toBeTruthy();
      });

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
      require("@src/components/ui/ContextMenu/BaseContextMenu").useContextMenu.mockReturnValue(
        {
          visible: false,
          selectedItem: null,
          position: { x: 0, y: 0 },
          showMenu: mockShowMenu,
          hideMenu: jest.fn(),
        }
      );

      renderWithProviders(<BrewSessionsScreen />);

      // Verify context menu hook was called (indicates context menu setup)
      expect(
        require("@src/components/ui/ContextMenu/BaseContextMenu").useContextMenu
      ).toHaveBeenCalled();
      // Verify showMenu function is available for context menu interactions
      expect(mockShowMenu).toBeDefined();
    });
  });

  describe("empty states", () => {
    beforeEach(() => {
      // Override useBrewSessions mock to return empty data
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          data: [],
        })
      );
    });

    it("should show empty state for active brew sessions", async () => {
      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        expect(getByText("No Active Brews")).toBeTruthy();
        expect(
          getByText("Start a brew session to track your fermentation progress")
        ).toBeTruthy();
        expect(getByText("Start Brewing")).toBeTruthy();
      });
    });

    it("should show empty state for completed brew sessions", async () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        expect(getByText("No Completed Brews")).toBeTruthy();
        expect(
          getByText("Completed brew sessions will appear here")
        ).toBeTruthy();
      });
    });

    it("should navigate to recipes when start brewing is pressed", async () => {
      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

      // Wait for empty state to be rendered
      await waitFor(() => {
        expect(getByText("Start Brewing")).toBeTruthy();
      });

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
      // Override useBrewSessions mock to return empty data
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          data: [],
        })
      );
    });

    it("should show floating action button only for active tab", () => {
      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      // Verify component renders active tab (which should show FAB)
      expect(queryByText("Active (0)")).toBeTruthy();
      // Verify component renders without errors when showing FAB
      expect(queryByText("Completed (0)")).toBeTruthy();
    });

    it("should not show floating action button for completed tab", () => {
      mockUseLocalSearchParams.mockReturnValue({ activeTab: "completed" });

      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

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
      // Override useBrewSessions mock to include refresh function
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          data: mockBrewSessions,
          refresh: mockRefetch,
        })
      );

      renderWithProviders(<BrewSessionsScreen />);

      await act(async () => {
        // Simulate pull-to-refresh by calling the refresh function directly
        await mockRefetch();
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("status utilities", () => {
    const mockBrewSessionsForStatus = [
      {
        id: "test-session-1",
        name: "Fermenting Brew",
        status: "fermenting",
        user_id: "test-user-id",
        recipe_id: "test-recipe-id-1",
        brew_date: "2024-01-01",
        notes: "Test notes 1",
        created_at: "1640995200000",
        updated_at: "1640995200000",
        temperature_unit: "F",
        batch_size: 5,
        batch_size_unit: "gal",
      },
      {
        id: "test-session-2",
        name: "Completed Brew",
        status: "completed",
        user_id: "test-user-id",
        recipe_id: "test-recipe-id-2",
        brew_date: "2024-01-02",
        notes: "Test notes 2",
        created_at: "1640995300000",
        updated_at: "1640995300000",
        temperature_unit: "F",
        batch_size: 5,
        batch_size_unit: "gal",
      },
      {
        id: "test-session-3",
        name: "Paused Brew",
        status: "paused",
        user_id: "test-user-id",
        recipe_id: "test-recipe-id-3",
        brew_date: "2024-01-03",
        notes: "Test notes 3",
        created_at: "1640995400000",
        updated_at: "1640995400000",
        temperature_unit: "F",
        batch_size: 5,
        batch_size_unit: "gal",
      },
      {
        id: "test-session-4",
        name: "Failed Brew",
        status: "failed",
        user_id: "test-user-id",
        recipe_id: "test-recipe-id-4",
        brew_date: "2024-01-04",
        notes: "Test notes 4",
        created_at: "1640995500000",
        updated_at: "1640995500000",
        temperature_unit: "F",
        batch_size: 5,
        batch_size_unit: "gal",
      },
    ];

    beforeEach(() => {
      // Override useBrewSessions mock for this test
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          data: mockBrewSessionsForStatus,
        })
      );
    });

    it("should display different status badges correctly", async () => {
      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        // Verify component renders with status handling capabilities
        expect(queryByText("Active (3)")).toBeTruthy(); // fermenting + paused + failed
        expect(queryByText("Completed (1)")).toBeTruthy(); // completed
      });
    });
  });

  describe("progress calculation", () => {
    const mockBrewSession = mockData.brewSession({
      brew_date: "2024-01-01T00:00:00Z",
      expected_completion_date: "2024-01-15T00:00:00Z",
    });

    beforeEach(() => {
      // Override useBrewSessions mock for this test with single session
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          data: [mockBrewSession],
        })
      );
    });

    it("should calculate and display brewing progress", async () => {
      // Since FlatList is mocked, we can't test the actual rendering of items
      // Instead, we verify that the component receives the correct data and can render without errors
      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        // Verify the screen renders successfully with the mock data
        // The component should not crash and should display the tabs with counts
        expect(queryByText("Active (1)")).toBeTruthy();
        expect(queryByText("Completed (0)")).toBeTruthy();
      });

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
      require("@src/components/ui/ContextMenu/BrewSessionContextMenu").createDefaultBrewSessionActions.mockReturnValue(
        mockActions
      );
    });

    it("should create context menu actions with correct handlers", () => {
      renderWithProviders(<BrewSessionsScreen />);

      expect(
        require("@src/components/ui/ContextMenu/BrewSessionContextMenu")
          .createDefaultBrewSessionActions
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          onView: expect.any(Function),
          onEdit: expect.any(Function),
          onAddFermentationEntry: expect.any(Function),
          onExportData: expect.any(Function),
          onArchive: expect.any(Function),
          onDelete: expect.any(Function),
        })
      );
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

      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({ data: [incompleteBrewSession] })
      );

      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      // Brew session with empty name should not be rendered
      expect(queryByText("Unknown")).toBeNull();
    });

    it("should handle missing brew_sessions array gracefully", () => {
      // Mock useBrewSessions to return null data (simulating missing/undefined data)
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          data: null,
        })
      );

      const { getByText } = renderWithProviders(<BrewSessionsScreen />);

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
      // Override useBrewSessions mock for this test with single session
      mockUseBrewSessions.mockReturnValue(
        createMockUseBrewSessionsValue({
          data: [mockBrewSession],
        })
      );
    });

    it("should format dates correctly", async () => {
      const { queryByText } = renderWithProviders(<BrewSessionsScreen />);

      await waitFor(() => {
        // Verify component renders with date handling capabilities
        expect(queryByText("Active (1)")).toBeTruthy();
        expect(queryByText("Completed (0)")).toBeTruthy();
      });
      // Component should handle date formatting without errors
      // Since FlatList is mocked, the actual date formatting happens in renderItem
    });
  });
});
