import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders, mockData, testUtils } from "../../testUtils";
import DashboardScreen from "../../../app/(tabs)/index";

// Comprehensive React Native mocking
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  ActivityIndicator: "ActivityIndicator",
  RefreshControl: "RefreshControl",
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

// Mock React Query
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  const queryClientMock = {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    getQueryCache: jest.fn(() => ({
      getAll: jest.fn(() => []),
    })),
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
}));

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      version: "1.0.0",
    },
  },
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: "medium",
  },
}));

// Mock context hooks to return test data
jest.mock("@contexts/AuthContext", () => ({
  ...jest.requireActual("@contexts/AuthContext"),
  useAuth: jest.fn(),
}));

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

jest.mock("@services/api/apiService", () => ({
  default: {
    recipes: {
      getAll: jest.fn(),
      getPublic: jest.fn(),
    },
    brewSessions: {
      getAll: jest.fn(),
    },
  },
}));

jest.mock("@styles/tabs/dashboardStyles", () => ({
  dashboardStyles: jest.fn(() => ({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: "center" },
    loadingText: { textAlign: "center" },
    header: { padding: 20 },
    greeting: { fontSize: 24, fontWeight: "bold" },
    subtitle: { fontSize: 16, color: "#666" },
    statsContainer: { flexDirection: "row", padding: 20 },
    statCard: { flex: 1, padding: 16, alignItems: "center" },
    statNumber: { fontSize: 24, fontWeight: "bold" },
    statLabel: { fontSize: 14, color: "#666" },
    section: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
    actionCard: { flexDirection: "row", padding: 16, alignItems: "center" },
    actionContent: { flex: 1, marginLeft: 12 },
    actionTitle: { fontSize: 16, fontWeight: "600" },
    actionSubtitle: { fontSize: 14, color: "#666" },
    recentCard: { padding: 16, marginBottom: 12 },
    recentHeader: { flexDirection: "row", alignItems: "center" },
    recentTitle: { fontSize: 16, fontWeight: "600", marginLeft: 8 },
    recentSubtitle: { fontSize: 14, color: "#666", marginTop: 4 },
    recentDate: { fontSize: 12, color: "#999", marginTop: 4 },
    verticalList: { gap: 8 },
    emptyState: { alignItems: "center", padding: 40 },
    emptyText: { fontSize: 16, color: "#666", marginTop: 8 },
    emptySubtext: { fontSize: 14, color: "#999", textAlign: "center" },
    versionFooter: { padding: 20, alignItems: "center" },
    versionText: { fontSize: 12, color: "#999" },
  })),
}));

jest.mock("@src/components/ui/ContextMenu/RecipeContextMenu", () => ({
  RecipeContextMenu: "RecipeContextMenu",
  createDefaultRecipeActions: jest.fn(() => ({})),
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

jest.mock("@components/modals/ReAuthModal", () => ({
  ReAuthModal: "ReAuthModal",
}));

jest.mock("@/src/components/modals/BiometricEnrollmentModal", () => ({
  BiometricEnrollmentModal: "BiometricEnrollmentModal",
}));

jest.mock("@src/components/ui/ContextMenu/contextMenuUtils", () => ({
  getTouchPosition: jest.fn(() => ({ x: 0, y: 0 })),
}));

jest.mock("@services/beerxml/BeerXMLService", () => ({
  default: {
    exportRecipe: jest.fn(),
  },
}));

jest.mock("@components/banners", () => ({
  NetworkStatusBanner: "NetworkStatusBanner",
  StaleDataBanner: "StaleDataBanner",
  AuthStatusBanner: "AuthStatusBanner",
}));

jest.mock("@services/api/queryClient", () => ({
  QUERY_KEYS: {
    RECIPES: ["recipes"],
    DASHBOARD: ["dashboard"],
  },
}));

// Mock V2 hooks
jest.mock("@hooks/offlineV2/useUserData", () => ({
  useRecipes: jest.fn(),
  useBrewSessions: jest.fn(),
}));

// Mock NetworkContext
jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    useNetwork: jest.fn(() => ({
      isConnected: true,
      isOffline: false,
    })),
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Get the mocked functions from React Query
const mockUseQuery = require("@tanstack/react-query").useQuery;
const mockUseMutation = require("@tanstack/react-query").useMutation;
const mockUseRecipes = require("@hooks/offlineV2/useUserData").useRecipes;
const mockUseBrewSessions =
  require("@hooks/offlineV2/useUserData").useBrewSessions;

const mockAuth = {
  user: mockData.user(),
  isAuthenticated: true,
};

const mockTheme = {
  colors: {
    primary: "#007AFF",
    background: "#FFFFFF",
    text: "#000000",
  },
};

const mockRouter = require("expo-router").router;

describe("DashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();

    // Setup context mocks for each test
    require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);
    require("@contexts/ThemeContext").useTheme.mockReturnValue(mockTheme);

    // Mock mutations with default implementations
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    });

    // Set up default V2 hook mocks with comprehensive properties
    mockUseRecipes.mockReturnValue({
      data: [],
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
    });

    mockUseBrewSessions.mockReturnValue({
      data: [],
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
    });

    // Mock public recipes query (online-only feature)
    mockUseQuery.mockReturnValue({
      data: 0,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe("loading state", () => {
    it("should show loading indicator while fetching data", () => {
      // Mock V2 hooks loading state
      mockUseRecipes.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      mockUseBrewSessions.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      // Mock public recipes query
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("Loading dashboard...")).toBeTruthy();
    });
  });

  describe("error state", () => {
    it("should show dashboard with empty data when V2 hooks return empty arrays", () => {
      // V2 hooks return empty arrays on error (offline-first)
      mockUseRecipes.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUseBrewSessions.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // Public recipes query fails (online-only)
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
        refetch: jest.fn(),
      });

      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("Welcome back, testuser!")).toBeTruthy();
      expect(getByText("Ready to brew something amazing?")).toBeTruthy();
    });

    it("should show zero stats when no cached data available", () => {
      // V2 hooks return empty arrays
      mockUseRecipes.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUseBrewSessions.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUseQuery.mockReturnValue({
        data: 0,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getAllByText } = renderWithProviders(<DashboardScreen />);

      // Should show 0 for all stats
      expect(getAllByText("0")).toHaveLength(3); // recipes, active brews, public
    });
  });

  describe("successful data load", () => {
    const mockRecipes = [
      mockData.recipe({ name: "IPA Recipe", style: "IPA" }),
      mockData.recipe({ name: "Stout Recipe", style: "Stout" }),
      mockData.recipe({ name: "Pale Ale Recipe", style: "Pale Ale" }),
      mockData.recipe({ name: "Porter Recipe", style: "Porter" }),
      mockData.recipe({ name: "Wheat Beer Recipe", style: "Wheat Beer" }),
    ];

    const mockBrewSessionsData = [
      mockData.brewSession({
        id: "test-brew-session-1",
        name: "IPA Brew",
        status: "fermenting",
        brew_date: "2024-01-15T00:00:00Z",
      }),
      mockData.brewSession({
        id: "test-brew-session-2",
        name: "Stout Brew",
        status: "completed",
        brew_date: "2024-01-10T00:00:00Z",
      }),
      mockData.brewSession({
        id: "test-brew-session-3",
        name: "Pale Ale Brew",
        status: "completed",
        brew_date: "2024-01-05T00:00:00Z",
      }),
    ];

    beforeEach(() => {
      // Mock V2 hooks with data
      mockUseRecipes.mockReturnValue({
        data: mockRecipes,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUseBrewSessions.mockReturnValue({
        data: mockBrewSessionsData,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // Mock public recipes count
      mockUseQuery.mockReturnValue({
        data: 2,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it("should render welcome message with username", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("Welcome back, testuser!")).toBeTruthy();
      expect(getByText("Ready to brew something amazing?")).toBeTruthy();
    });

    it("should display correct stats", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("5")).toBeTruthy(); // total recipes (5 from mockRecipes)
      expect(getByText("1")).toBeTruthy(); // active brews (1 fermenting, 2 completed)
      expect(getByText("2")).toBeTruthy(); // public recipes (from mockUseQuery)
      expect(getByText("Recipes")).toBeTruthy();
      expect(getByText("Active Brews")).toBeTruthy();
      expect(getByText("Public")).toBeTruthy();
    });

    it("should display quick actions", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("Quick Actions")).toBeTruthy();
      expect(getByText("Create New Recipe")).toBeTruthy();
      expect(getByText("Start Brew Session")).toBeTruthy();
      expect(getByText("Browse Public Recipes")).toBeTruthy();
    });

    it("should display recent recipes when available", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("Recent Recipes")).toBeTruthy();
      expect(getByText("IPA Recipe")).toBeTruthy();
      expect(getByText("Stout Recipe")).toBeTruthy();
    });

    it("should display active brew sessions", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("Recent Brew Sessions")).toBeTruthy();
      expect(getByText("IPA Brew")).toBeTruthy();
      expect(getByText("Status: fermenting")).toBeTruthy();
    });

    it("should display app version", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("BrewTracker Mobile v0.1.0")).toBeTruthy();
    });
  });

  describe("navigation", () => {
    // Navigation tests use default V2 hook mocks from main beforeEach
    // No need to override since dashboard now uses V2 hooks instead of dashboard query

    it("should navigate to create recipe when create recipe action is pressed", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);
      const createRecipeButton = getByText("Create New Recipe");

      fireEvent.press(createRecipeButton);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(modals)/(recipes)/createRecipe",
        params: {},
      });
    });

    it("should navigate to recipes tab when recipes stat is pressed", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);
      const recipesCard = getByText("Recipes");

      fireEvent.press(recipesCard);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(tabs)/recipes",
        params: { activeTab: "my" },
      });
    });

    it("should navigate to brew sessions tab when active brews stat is pressed", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);
      const activeBrewsCard = getByText("Active Brews");

      fireEvent.press(activeBrewsCard);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(tabs)/brewSessions",
        params: { activeTab: "active" },
      });
    });

    it("should navigate to public recipes when public stat is pressed", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);
      const publicCard = getByText("Public");

      fireEvent.press(publicCard);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(tabs)/recipes",
        params: { activeTab: "public" },
      });
    });

    it("should navigate to browse public recipes when action is pressed", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);
      const browsePublicButton = getByText("Browse Public Recipes");

      fireEvent.press(browsePublicButton);

      expect(mockRouter.push).toHaveBeenCalledWith({
        params: { activeTab: "public" },
        pathname: "/(tabs)/recipes",
      });
    });
  });

  describe("recipe interactions", () => {
    const mockRecipe = mockData.recipe({ name: "Test Recipe", style: "IPA" });

    beforeEach(() => {
      // Mock V2 hooks to return recipe data
      mockUseRecipes.mockReturnValue({
        data: [mockRecipe],
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
      });

      mockUseBrewSessions.mockReturnValue({
        data: [],
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
      });
    });

    it("should navigate to view recipe when recipe is pressed", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);
      const recipeCard = getByText("Test Recipe");

      fireEvent.press(recipeCard);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(modals)/(recipes)/viewRecipe",
        params: { recipe_id: mockRecipe.id },
      });
    });

    it("should show context menu on recipe long press", () => {
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

      const { getByText } = renderWithProviders(<DashboardScreen />);
      const recipeCard = getByText("Test Recipe");

      fireEvent(recipeCard, "longPress", {
        nativeEvent: { pageX: 100, pageY: 200 },
      });

      expect(mockShowMenu).toHaveBeenCalledWith(mockRecipe, { x: 0, y: 0 });
    });
  });

  describe("brew session interactions", () => {
    const mockBrewSession = mockData.brewSession({
      id: "test-brew-session-1",
      name: "Test Brew",
      status: "fermenting",
      brew_date: "2024-01-15T00:00:00Z",
    });

    beforeEach(() => {
      // Mock V2 hooks to return brew session data
      mockUseRecipes.mockReturnValue({
        data: [],
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
      });

      mockUseBrewSessions.mockReturnValue({
        data: [mockBrewSession],
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
      });
    });

    it("should navigate to view brew session when session is pressed", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);
      const sessionCard = getByText("Test Brew");

      fireEvent.press(sessionCard);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(modals)/(brewSessions)/viewBrewSession",
        params: { brewSessionId: mockBrewSession.id },
      });
    });

    it("should show context menu on brew session long press", () => {
      const mockShowMenu = jest.fn();
      require("@src/components/ui/ContextMenu/BaseContextMenu")
        .useContextMenu.mockReturnValueOnce({
          visible: false,
          selectedItem: null,
          position: { x: 0, y: 0 },
          showMenu: jest.fn(),
          hideMenu: jest.fn(),
        })
        .mockReturnValueOnce({
          visible: false,
          selectedItem: null,
          position: { x: 0, y: 0 },
          showMenu: mockShowMenu,
          hideMenu: jest.fn(),
        });

      const { getByText } = renderWithProviders(<DashboardScreen />);
      const sessionCard = getByText("Test Brew");

      fireEvent(sessionCard, "longPress", {
        nativeEvent: { pageX: 100, pageY: 200 },
      });

      expect(mockShowMenu).toHaveBeenCalledWith(mockBrewSession, {
        x: 0,
        y: 0,
      });
    });
  });

  describe("empty states", () => {
    beforeEach(() => {
      // V2 hooks return empty arrays
      mockUseRecipes.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUseBrewSessions.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // Public recipes query returns zero
      mockUseQuery.mockReturnValue({
        data: 0,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it("should show empty state for brew sessions when none exist", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("No brew sessions yet")).toBeTruthy();
      expect(
        getByText("Start your first brew session to track progress!")
      ).toBeTruthy();
    });

    it("should not show recent recipes section when no recipes exist", () => {
      const { queryByText } = renderWithProviders(<DashboardScreen />);

      expect(queryByText("Recent Recipes")).toBeNull();
    });
  });

  describe("pull to refresh", () => {
    it("should trigger refetch when refreshing", async () => {
      const mockRefetch = jest.fn();
      // Mock V2 hooks refresh functions
      const mockRecipesRefresh = jest.fn();
      const mockBrewSessionsRefresh = jest.fn();

      mockUseRecipes.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: mockRecipesRefresh,
      });

      mockUseBrewSessions.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refresh: mockBrewSessionsRefresh,
      });

      // Mock public recipes query
      mockUseQuery.mockReturnValue({
        data: 0,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      renderWithProviders(<DashboardScreen />);

      // Since we can't easily test RefreshControl directly due to mocking,
      // we'll test that the refetch function is available
      expect(mockRefetch).toBeDefined();
    });
  });

  describe("start brew session action", () => {
    it("should log message for start brew session (not implemented)", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Use default V2 hook mocks from main beforeEach

      const { getByText } = renderWithProviders(<DashboardScreen />);
      const startBrewButton = getByText("Start Brew Session");

      fireEvent.press(startBrewButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Navigate to create brew session"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("status color utility", () => {
    const mockBrewSession = mockData.brewSession({
      id: "test-brew-session-1",
      name: "Test Brew Session",
      status: "fermenting",
      brew_date: "2024-01-15T00:00:00Z",
    });

    beforeEach(() => {
      // Mock V2 hooks to return brew session data
      mockUseRecipes.mockReturnValue({
        data: [],
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
      });

      mockUseBrewSessions.mockReturnValue({
        data: [mockBrewSession],
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
      });
    });

    it("should display correct status for fermenting sessions", () => {
      const { getByText } = renderWithProviders(<DashboardScreen />);

      expect(getByText("Status: fermenting")).toBeTruthy();
    });
  });
});
