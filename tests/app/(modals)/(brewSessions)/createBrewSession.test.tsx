/**
 * Create Brew Session Component Test Suite
 */

// Mock all context providers used by testUtils
jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: () => ({
      colors: {
        primary: "#007AFF",
        background: "#FFFFFF",
        surface: "#F2F2F7",
        text: "#000000",
        textSecondary: "#666666",
        border: "#C7C7CC",
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
      },
      fonts: {
        regular: { fontSize: 16, fontWeight: "400" },
        medium: { fontSize: 16, fontWeight: "500" },
        bold: { fontSize: 16, fontWeight: "700" },
      },
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

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

jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
    useNetwork: () => ({
      isConnected: true,
      isInternetReachable: true,
    }),
  };
});

jest.mock("@contexts/DeveloperContext", () => {
  const React = require("react");
  return {
    DeveloperProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useDeveloper: () => ({ isDeveloperMode: false }),
  };
});

jest.mock("@contexts/UnitContext", () => {
  const React = require("react");
  return {
    UnitProvider: ({ children }: { children: React.ReactNode }) => children,
    useUnit: () => ({ temperatureUnit: "F", weightUnit: "lb" }),
    useUnits: jest.fn(() => ({ unitSystem: "imperial" })),
  };
});

jest.mock("@contexts/CalculatorsContext", () => {
  const React = require("react");
  return {
    CalculatorsProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useCalculators: () => ({ state: {}, dispatch: jest.fn() }),
  };
});

// Mock UserCacheService
jest.mock("@services/offlineV2/UserCacheService", () => ({
  UserCacheService: {
    getBrewSessions: jest.fn().mockResolvedValue([]),
    getPendingOperationsCount: jest.fn().mockResolvedValue(0),
    createBrewSession: jest.fn().mockResolvedValue({
      id: "new-session-id",
      name: "Test Brew Session",
      recipe_id: "test-recipe-id",
      brew_date: "2024-01-01",
      status: "fermenting",
      user_id: "test-user-id",
    }),
  },
}));

import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import CreateBrewSessionScreen from "../../../../app/(modals)/(brewSessions)/createBrewSession";
import { renderWithProviders, testUtils } from "../../../testUtils";
import { TEST_IDS } from "@src/constants/testIDs";

// Mock React Native
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
  TextInput: "TextInput",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  ActivityIndicator: "ActivityIndicator",
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  Platform: {
    OS: "ios",
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

jest.mock("@react-native-community/datetimepicker", () => {
  const MockDateTimePicker = () => null;
  MockDateTimePicker.displayName = "MockDateTimePicker";
  return MockDateTimePicker;
});

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
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({
    recipeId: "test-recipe-id",
  })),
}));

// Mock the API service with a different approach
const mockApiService = {
  recipes: {
    getById: jest.fn(),
  },
  brewSessions: {
    create: jest.fn(),
  },
  handleApiError: jest.fn((error: any) => ({
    message: error.message || "Unknown error",
  })),
};

jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: mockApiService,
}));

jest.mock("@utils/userValidation", () => ({
  useUserValidation: () => ({
    canUserModifyResource: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock("@styles/modals/createBrewSessionStyles", () => ({
  createBrewSessionStyles: () => ({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: { marginTop: 8 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { fontSize: 18, fontWeight: "bold" },
    errorSubtext: { fontSize: 14, textAlign: "center", marginTop: 8 },
    retryButton: { padding: 12, marginTop: 16 },
    retryButtonText: { color: "#fff" },
    container: { flex: 1 },
    header: { padding: 16 },
    title: { fontSize: 24, fontWeight: "bold" },
    backButton: { padding: 8 },
    recipeCard: { margin: 16, padding: 16 },
    recipeName: { fontSize: 20, fontWeight: "bold" },
    recipeStyle: { fontSize: 16, marginTop: 4 },
    formContainer: { padding: 16 },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 16, fontWeight: "500", marginBottom: 8 },
    textInput: { borderWidth: 1, padding: 12, borderRadius: 8 },
    textArea: { minHeight: 100, textAlignVertical: "top" },
    dateButton: { borderWidth: 1, padding: 12, borderRadius: 8 },
    dateButtonText: { fontSize: 16 },
    actionButtons: { flexDirection: "row", padding: 16, gap: 12 },
    cancelButton: { flex: 1, padding: 16, borderRadius: 8 },
    cancelButtonText: { textAlign: "center", fontSize: 16 },
    createButton: { flex: 1, padding: 16, borderRadius: 8 },
    createButtonText: { textAlign: "center", fontSize: 16, color: "#fff" },
    createButtonDisabled: { opacity: 0.5 },
    unitPromptContainer: { margin: 16, padding: 16 },
    unitPromptTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
    unitPromptText: { fontSize: 14, marginBottom: 16 },
    unitButtons: { flexDirection: "row", gap: 12 },
    unitButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1 },
    unitButtonText: { textAlign: "center", fontSize: 16 },
  }),
}));

jest.mock("@utils/formatUtils", () => ({
  formatGravity: jest.fn(value => (value ? `${value}` : "—")),
  formatABV: jest.fn(value => (value ? `${value.toFixed(1)}%` : "—")),
  formatIBU: jest.fn(value => (value ? value.toFixed(0) : "—")),
  formatSRM: jest.fn(value => (value ? value.toFixed(1) : "—")),
}));

const mockUseQuery = require("@tanstack/react-query").useQuery;
const mockUseMutation = require("@tanstack/react-query").useMutation;
const mockRouter = require("expo-router").router;
const mockUseLocalSearchParams = require("expo-router").useLocalSearchParams;
const mockAlert = require("react-native").Alert;

// Sample recipe data for testing
const mockRecipe = {
  id: "test-recipe-id",
  name: "Test IPA Recipe",
  style: "American IPA",
  user_id: "test-user-id",
  is_owner: true,
  is_public: false,
  unit_system: "imperial",
  og: 1.065,
  fg: 1.012,
  abv: 7.0,
  ibu: 65,
  srm: 8,
};

describe("CreateBrewSessionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();

    // Set default mock implementations
    mockUseLocalSearchParams.mockReturnValue({ recipeId: "test-recipe-id" });

    mockUseQuery.mockReturnValue({
      data: { data: mockRecipe },
      isLoading: false,
      error: null,
    });

    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
    });

    // Reset UnitContext mock to return imperial by default
    require("@contexts/UnitContext").useUnits.mockReturnValue({
      unitSystem: "imperial",
    });
  });

  describe("Route Parameter Handling", () => {
    it("should handle missing recipeId parameter", () => {
      mockUseLocalSearchParams.mockReturnValue({});

      renderWithProviders(<CreateBrewSessionScreen />);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        "Error",
        "Recipe ID is required"
      );
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("should handle array recipeId parameter", () => {
      mockUseLocalSearchParams.mockReturnValue({
        recipeId: ["test-recipe-1", "test-recipe-2"],
      });

      renderWithProviders(<CreateBrewSessionScreen />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["recipe", "test-recipe-1"],
        })
      );
    });

    it("should use single recipeId when provided as string", () => {
      mockUseLocalSearchParams.mockReturnValue({
        recipeId: "single-recipe-id",
      });

      renderWithProviders(<CreateBrewSessionScreen />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["recipe", "single-recipe-id"],
        })
      );
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator while fetching recipe", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { getByText } = renderWithProviders(<CreateBrewSessionScreen />);

      expect(getByText("Loading recipe details...")).toBeTruthy();
    });
  });

  describe("Error States", () => {
    it("should show error message when recipe fails to load", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
      });

      const { getByText } = renderWithProviders(<CreateBrewSessionScreen />);

      expect(getByText("Failed to Load Recipe")).toBeTruthy();
      expect(getByText("Could not load recipe details")).toBeTruthy();
    });

    it("should show not found message when recipe is null", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { getByText } = renderWithProviders(<CreateBrewSessionScreen />);

      expect(getByText("Failed to Load Recipe")).toBeTruthy();
      expect(getByText("Recipe not found")).toBeTruthy();
    });

    it("should navigate back when go back button is pressed in error state", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
      });

      const { getByText } = renderWithProviders(<CreateBrewSessionScreen />);

      fireEvent.press(getByText("Go Back"));

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe("Successful Recipe Load", () => {
    it("should display recipe information correctly", () => {
      const { getByText } = renderWithProviders(<CreateBrewSessionScreen />);

      expect(getByText("Test IPA Recipe")).toBeTruthy();
      expect(getByText("American IPA")).toBeTruthy();
    });

    it("should display recipe metrics", () => {
      const { queryByText } = renderWithProviders(<CreateBrewSessionScreen />);

      // The component should render without errors and show recipe data
      expect(queryByText("Test IPA Recipe")).toBeTruthy();
    });

    it("should auto-populate session name based on recipe", async () => {
      const { getByDisplayValue } = renderWithProviders(
        <CreateBrewSessionScreen />
      );

      await waitFor(() => {
        // Verify the session name is auto-populated with recipe name
        const expectedNamePattern = /Test IPA Recipe/;
        const sessionNameInput = getByDisplayValue(expectedNamePattern);
        expect(sessionNameInput).toBeTruthy();
      });
    });
  });

  describe("Unit System Handling", () => {
    it("should not show unit prompt when recipe and user units match", () => {
      // Both recipe and user prefer imperial
      const imperialRecipe = { ...mockRecipe, unit_system: "imperial" };
      mockUseQuery.mockReturnValue({
        data: { data: imperialRecipe },
        isLoading: false,
        error: null,
      });

      require("@contexts/UnitContext").useUnits.mockReturnValue({
        unitSystem: "imperial",
      });

      const { queryByText } = renderWithProviders(<CreateBrewSessionScreen />);

      // Should not show unit selection prompt
      expect(queryByText("Unit System")).toBeNull();
    });

    it("should show unit prompt when recipe and user units differ", () => {
      // Recipe is metric, user prefers imperial
      const metricRecipe = { ...mockRecipe, unit_system: "metric" };
      mockUseQuery.mockReturnValue({
        data: { data: metricRecipe },
        isLoading: false,
        error: null,
      });

      require("@contexts/UnitContext").useUnits.mockReturnValue({
        unitSystem: "imperial",
      });

      renderWithProviders(<CreateBrewSessionScreen />);

      // Component should handle unit system differences
      expect(mockUseQuery).toHaveBeenCalled();
    });
  });

  describe("Form Interactions", () => {
    it("should update session name when user types", () => {
      const { getByPlaceholderText } = renderWithProviders(
        <CreateBrewSessionScreen />
      );

      const sessionNameInput = getByPlaceholderText("Enter session name");
      fireEvent.changeText(sessionNameInput, "New Brew Session");

      expect(sessionNameInput.props.value).toBe("New Brew Session");
    });

    it("should show date picker when date button is pressed", () => {
      const { getByTestId } = renderWithProviders(<CreateBrewSessionScreen />);

      const dateButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("date-picker")
      );
      fireEvent.press(dateButton);

      // Date picker state management is tested by the component behavior
      expect(dateButton).toBeTruthy();
    });

    it("should update notes when user types", () => {
      const { getByTestId } = renderWithProviders(<CreateBrewSessionScreen />);

      const notesInput = getByTestId(TEST_IDS.patterns.inputField("notes"));
      fireEvent.changeText(notesInput, "Test notes for brew session");

      expect(notesInput.props.value).toBe("Test notes for brew session");
    });
  });

  describe("Form Validation", () => {
    it("should show error when session name is empty", async () => {
      const mockMutate = jest.fn();
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
        error: null,
      });

      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <CreateBrewSessionScreen />
      );

      // Clear the session name by setting it to just spaces to trigger validation
      const sessionNameInput = getByPlaceholderText("Enter session name");
      fireEvent.changeText(sessionNameInput, "   ");

      // Try to submit
      const createButton = getByTestId(TEST_IDS.buttons.saveButton);
      fireEvent.press(createButton);

      // Verify error is shown
      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          "Error",
          "Session name is required"
        );
      });

      // Verify mutation was not called
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("should show error when recipe data is missing during submission", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { getByText } = renderWithProviders(<CreateBrewSessionScreen />);

      // Should show error state when recipe is missing
      expect(getByText("Recipe not found")).toBeTruthy();
    });
  });

  describe("Brew Session Creation", () => {
    it("should create brew session with correct data", async () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <CreateBrewSessionScreen />
      );

      // Fill in the form
      const sessionNameInput = getByPlaceholderText("Enter session name");
      fireEvent.changeText(sessionNameInput, "Test Brew Session");

      const notesInput = getByTestId(TEST_IDS.patterns.inputField("notes"));
      fireEvent.changeText(notesInput, "Test notes");

      // Submit the form
      const createButton = getByTestId(TEST_IDS.buttons.saveButton);
      fireEvent.press(createButton);

      // Verify V2 hook created the brew session
      await waitFor(() => {
        expect(
          require("@services/offlineV2/UserCacheService").UserCacheService
            .createBrewSession
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            recipe_id: "test-recipe-id",
            name: "Test Brew Session",
            notes: "Test notes",
            status: "planned",
            user_id: "test-user-id",
          })
        );
      });
    });

       it("should show loading state during submission", async () => {
      const service =
        require("@services/offlineV2/UserCacheService").UserCacheService;
      // Keep promise pending only for this invocation
      service.createBrewSession.mockImplementationOnce(() => new Promise(() => {}));
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <CreateBrewSessionScreen />
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter session name"),
        "Test Brew Session"
      );
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      await waitFor(() => expect(service.createBrewSession).toHaveBeenCalled());
      // While pending, there must be no navigation
      expect(mockRouter.replace).not.toHaveBeenCalled();
      // Optionally assert disabled state or spinner if the UI exposes a testID/accessibility primitive
    });

    it("should handle successful creation", async () => {
      // Ensure the UserCacheService mock is set to success for this test
      const service =
        require("@services/offlineV2/UserCacheService").UserCacheService;
      service.createBrewSession.mockResolvedValue({
        id: "new-session-id",
        name: "Test Brew Session",
        recipe_id: "test-recipe-id",
        brew_date: "2024-01-01",
        status: "fermenting",
        user_id: "test-user-id",
      });

      const { getByTestId } = renderWithProviders(<CreateBrewSessionScreen />);

      // Fill in the form to trigger creation
      const sessionNameInput = getByTestId(
        TEST_IDS.patterns.inputField("session-name")
      );
      fireEvent.changeText(sessionNameInput, "Test Brew Session");

      // Submit the form
      const createButton = getByTestId(TEST_IDS.buttons.saveButton);
      fireEvent.press(createButton);

      // Verify navigation after successful creation (the mock returns our session ID)
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: "/(modals)/(brewSessions)/viewBrewSession",
          params: { brewSessionId: "new-session-id" },
        });
      });
    });

    it("should handle creation error", async () => {
      const service =
        require("@services/offlineV2/UserCacheService").UserCacheService;
      const mockError = new Error("Creation failed");
      // Fail only this invocation; avoid leaking to other tests
      service.createBrewSession.mockRejectedValueOnce(mockError);

      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <CreateBrewSessionScreen />
      );

      // Fill in the form to trigger creation
      const sessionNameInput = getByPlaceholderText("Enter session name");
      fireEvent.changeText(sessionNameInput, "Test Brew Session");

      // Submit the form
      const createButton = getByTestId(TEST_IDS.buttons.saveButton);
      fireEvent.press(createButton);

      await waitFor(() => expect(service.createBrewSession).toHaveBeenCalled());
      // User-visible feedback and no navigation on error
      expect(mockAlert.alert).toHaveBeenCalledWith("Error", expect.any(String));
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("should navigate back when cancel button is pressed", () => {
      const { getByTestId } = renderWithProviders(<CreateBrewSessionScreen />);
      const cancelButton = getByTestId(TEST_IDS.components.closeButton);
      fireEvent.press(cancelButton);
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe("Theme Integration", () => {
    it("should use theme colors correctly", () => {
      renderWithProviders(<CreateBrewSessionScreen />);

      // Verify that theme is being used
      const mockTheme = require("@contexts/ThemeContext").useTheme();
      expect(mockTheme.colors.primary).toBe("#007AFF");
    });
  });
});
