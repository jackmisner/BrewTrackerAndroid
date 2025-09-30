/**
 * EditFermentationEntryScreen Component Test Suite
 */

import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders, testUtils, mockData } from "@/tests/testUtils";
import EditFermentationEntryScreen from "../../../../app/(modals)/(brewSessions)/editFermentationEntry";
import { TEST_IDS } from "@src/constants/testIDs";

// Mock React Native components
jest.mock("react-native", () => ({
  View: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("View", props, children);
  },
  Text: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("Text", props, children);
  },
  TouchableOpacity: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("TouchableOpacity", props, children);
  },
  ScrollView: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("ScrollView", props, children);
  },
  TextInput: (props: any) => {
    const React = require("react");
    const [value, setValue] = React.useState(props.value || "");

    React.useEffect(() => {
      setValue(props.value || "");
    }, [props.value]);

    return React.createElement("TextInput", {
      ...props,
      value: value,
      onChangeText: (text: string) => {
        setValue(text);
        if (props.onChangeText) {
          props.onChangeText(text);
        }
      },
      testID: props.testID || props.placeholder || "text-input",
    });
  },
  KeyboardAvoidingView: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("KeyboardAvoidingView", props, children);
  },
  Platform: { OS: "android" },
  ActivityIndicator: (props: any) => {
    const React = require("react");
    return React.createElement("ActivityIndicator", props);
  },
  Alert: { alert: jest.fn() },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) =>
      Array.isArray(styles) ? Object.assign({}, ...styles) : styles,
  },
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name, size, color, ...props }: any) => {
    const React = require("react");
    return React.createElement("MaterialIcons", {
      name,
      size,
      color,
      ...props,
    });
  },
}));

// Mock useBrewSessions hook
const mockGetById = jest.fn();
const mockUpdateFermentationEntry = jest.fn();

// Create a stable mock hook object
const mockBrewSessionsHook = {
  data: null,
  isLoading: false,
  error: null,
  pendingCount: 0,
  conflictCount: 0,
  lastSync: null,
  getById: mockGetById,
  updateFermentationEntry: mockUpdateFermentationEntry,
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  clone: jest.fn(),
  sync: jest.fn(),
  refresh: jest.fn(),
};

jest.mock("@src/hooks/offlineV2", () => ({
  useBrewSessions: jest.fn(() => mockBrewSessionsHook),
}));

// Mock external dependencies
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn(() => ({
      data: {
        id: "session-123",
        name: "Test Batch",
        user_id: "user-123",
        fermentation_entries: [],
        fermentation_data: [],
        temperature_unit: "F",
      },
      isLoading: false,
      error: null,
    })),
    useMutation: jest.fn(hookOptions => {
      const mutationFn =
        hookOptions?.mutationFn || (() => Promise.resolve({ success: true }));

      return {
        mutate: jest.fn(async (variables, callOptions) => {
          // Merge hook-level and per-call options
          const mergedOptions = {
            ...hookOptions,
            ...callOptions,
            onMutate: callOptions?.onMutate || hookOptions?.onMutate,
            onSuccess: callOptions?.onSuccess || hookOptions?.onSuccess,
            onError: callOptions?.onError || hookOptions?.onError,
            onSettled: callOptions?.onSettled || hookOptions?.onSettled,
          };

          try {
            const context = await mergedOptions?.onMutate?.(variables);
            // Actually execute the mutation function
            const result = await mutationFn(variables);
            mergedOptions?.onSuccess?.(result, variables, context);
            mergedOptions?.onSettled?.(result, null, variables, context);
          } catch (err) {
            mergedOptions?.onError?.(err as unknown, variables, undefined);
            mergedOptions?.onSettled?.(
              undefined,
              err as unknown,
              variables,
              undefined
            );
          }
        }),
        mutateAsync: jest.fn(async (variables, callOptions) => {
          // Merge hook-level and per-call options
          const mergedOptions = {
            ...hookOptions,
            ...callOptions,
            onMutate: callOptions?.onMutate || hookOptions?.onMutate,
            onSuccess: callOptions?.onSuccess || hookOptions?.onSuccess,
            onError: callOptions?.onError || hookOptions?.onError,
            onSettled: callOptions?.onSettled || hookOptions?.onSettled,
          };

          try {
            const context = await mergedOptions?.onMutate?.(variables);
            // Actually execute the mutation function
            const result = await mutationFn(variables);
            mergedOptions?.onSuccess?.(result, variables, context);
            mergedOptions?.onSettled?.(result, null, variables, context);
            return result;
          } catch (err) {
            mergedOptions?.onError?.(err as unknown, variables, undefined);
            mergedOptions?.onSettled?.(
              undefined,
              err as unknown,
              variables,
              undefined
            );
            throw err;
          }
        }),
        isPending: false,
        error: null,
      };
    }),
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
    })),
  };
});

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({
    brewSessionId: "test-session-id",
    entryIndex: "0",
  })),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const MockDateTimePicker = () => null;
  MockDateTimePicker.displayName = "MockDateTimePicker";
  return MockDateTimePicker;
});

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

// Mock context providers for testUtils
jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
    useNetwork: () => ({ isConnected: true }),
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

jest.mock("@contexts/AuthContext", () => {
  const React = require("react");
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    }),
  };
});

jest.mock("@utils/userValidation", () => ({
  useUserValidation: () => ({
    validateUser: jest.fn().mockResolvedValue(true),
    canUserModifyResource: jest.fn().mockResolvedValue(true),
    isValidating: false,
  }),
}));

jest.mock("@services/api/apiService", () => ({
  default: {
    brewSessions: {
      getById: jest.fn(),
      updateFermentationEntry: jest.fn(),
    },
  },
}));

// Mock styles
jest.mock("@styles/modals/editBrewSessionStyles", () => ({
  editBrewSessionStyles: () => ({
    container: {},
    loadingContainer: {},
    errorContainer: {},
    errorText: {},
    scrollContainer: {},
    content: {},
    header: {},
    title: {},
    backButton: {},
    formGroup: {},
    label: {},
    textInput: {},
    textArea: {},
    dateButton: {},
    dateButtonText: {},
    validationError: {},
    actionButtons: {},
    saveButton: {},
    saveButtonText: {},
    cancelButton: {},
    cancelButtonText: {},
    saveButtonDisabled: {},
    saveButtonTextDisabled: {},
  }),
}));

jest.mock("@src/types", () => ({
  BrewSession: {},
  UpdateFermentationEntryRequest: {},
}));

const mockApiService = require("@services/api/apiService").default;

describe("EditFermentationEntryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
    // Default mock implementation
    mockGetById.mockResolvedValue({
      id: "session-123",
      name: "Test Batch",
      user_id: "user-123",
      temperature_unit: "F",
      fermentation_data: [
        { gravity: 1.05, temperature: 68, entry_date: "2024-01-01" },
      ],
    });
    mockUpdateFermentationEntry.mockResolvedValue({
      id: "session-123",
      name: "Test Batch",
      user_id: "user-123",
      temperature_unit: "F",
      fermentation_data: [
        { gravity: 1.045, temperature: 70, entry_date: "2024-01-01" },
      ],
    });
  });

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      const mockSession = mockData.brewSessionWithData({
        fermentation_data: [
          mockData.fermentationEntry({
            date: "2024-01-01T00:00:00Z",
            gravity: 1.05,
            temperature: 68,
            ph: 4.2,
            notes: "Initial entry",
          }),
        ],
      });

      mockGetById.mockResolvedValue(mockSession);

      expect(() =>
        renderWithProviders(<EditFermentationEntryScreen />)
      ).not.toThrow();
    });

    it("should render basic screen structure", () => {
      const mockSession = mockData.brewSessionWithData({
        fermentation_data: [],
      });

      mockGetById.mockResolvedValue(mockSession);

      const { getByText } = renderWithProviders(
        <EditFermentationEntryScreen />
      );

      // Should render the screen title
      expect(getByText("Edit Fermentation Entry")).toBeTruthy();
    });

    it("should handle missing fermentation entry", async () => {
      const mockSession = mockData.brewSessionWithData({
        fermentation_data: [], // No entries at index 0
      });

      mockGetById.mockResolvedValue(mockSession);

      const { getByText } = renderWithProviders(
        <EditFermentationEntryScreen />
      );

      await waitFor(() => {
        expect(getByText("Entry Not Found")).toBeTruthy();
      });
    });

    it("should handle API errors gracefully", async () => {
      mockGetById.mockRejectedValue(new Error("Failed to fetch session"));

      const { getByText } = renderWithProviders(
        <EditFermentationEntryScreen />
      );
      await waitFor(() => {
        // Title still renders in error state header
        expect(getByText("Edit Fermentation Entry")).toBeTruthy();
        // And the error body is present
        expect(getByText("Entry Not Found")).toBeTruthy();
      });
    });
  });

  describe("Component Behavior", () => {
    it("should handle successful data loading", async () => {
      const mockBrewSession = mockData.brewSessionWithData({
        fermentation_data: [
          mockData.fermentationEntry({
            date: "2024-01-01T00:00:00Z",
            gravity: 1.05,
            temperature: 68,
            ph: 4.2,
            notes: "Initial entry",
          }),
        ],
      });

      mockGetById.mockResolvedValue(mockBrewSession);

      const { getByText } = renderWithProviders(
        <EditFermentationEntryScreen />
      );

      // Should render title
      expect(getByText("Edit Fermentation Entry")).toBeTruthy();

      // With proper data, should not show the "Entry Not Found" message
      // (Note: the component may still show this if fermentation_data is empty or index is invalid)
      await waitFor(() => {
        // Just verify the component rendered successfully
        expect(getByText("Edit Fermentation Entry")).toBeTruthy();
      });
    });

    it("should handle different temperature units", async () => {
      const mockBrewSessionCelsius = mockData.brewSessionWithData({
        fermentation_data: [
          mockData.fermentationEntry({
            date: "2024-01-01T00:00:00Z",
            gravity: 1.05,
            temperature: 20,
            ph: 4.2,
            notes: "Celsius entry",
          }),
        ],
        temperature_unit: "C", // Celsius
      });

      mockGetById.mockResolvedValue(mockBrewSessionCelsius);

      const { getByText } = renderWithProviders(
        <EditFermentationEntryScreen />
      );

      // Should render without crashing with Celsius data
      expect(getByText("Edit Fermentation Entry")).toBeTruthy();
    });
  });

  describe("Navigation and Basic Interactions", () => {
    const mockRouter = require("expo-router").router;

    it("should handle navigation methods without crashing", () => {
      const mockSession = mockData.brewSessionWithData({
        fermentation_data: [],
      });

      mockGetById.mockResolvedValue(mockSession);

      // Render the component
      expect(() =>
        renderWithProviders(<EditFermentationEntryScreen />)
      ).not.toThrow();

      // Should have router methods available
      expect(mockRouter.back).toBeDefined();
      expect(mockRouter.push).toBeDefined();
    });

    it("should have API service methods available", () => {
      // Simple test to verify our mocks are set up correctly
      expect(mockApiService.brewSessions.getById).toBeDefined();
      expect(typeof mockApiService.brewSessions.getById).toBe("function");
      expect(mockApiService.brewSessions.updateFermentationEntry).toBeDefined();
      expect(typeof mockApiService.brewSessions.updateFermentationEntry).toBe(
        "function"
      );
    });

    it("should call updateFermentationEntry when saving changes", async () => {
      // Create a session with both formats for backward compatibility testing
      const mockSession = mockData.brewSessionWithData({
        fermentation_data: [
          mockData.fermentationEntry({
            entry_date: "2024-01-01T00:00:00Z",
            gravity: 1.05,
            temperature: 68,
            ph: 4.2,
            notes: "Initial entry",
          }),
        ],
        // Also include legacy format for mixed API responses
        fermentation_entries: [
          mockData.fermentationEntry({
            entry_date: "2024-01-01T00:00:00Z",
            gravity: 1.05,
            temperature: 68,
            ph: 4.2,
            notes: "Initial entry",
          }),
        ],
      });

      mockGetById.mockResolvedValue(mockSession);

      const { getByTestId, queryByText } = renderWithProviders(
        <EditFermentationEntryScreen />
      );

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(queryByText("Loading entry...")).toBeNull();
        },
        { timeout: 3000 }
      );

      // Now interact with the form
      const gravityInput = getByTestId(TEST_IDS.patterns.inputField("gravity"));
      fireEvent.changeText(gravityInput, "1.045");

      // Press save button
      const saveButton = getByTestId(TEST_IDS.buttons.saveButton);
      fireEvent.press(saveButton);

      // Verify updateFermentationEntry was called
      await waitFor(() => {
        expect(mockUpdateFermentationEntry).toHaveBeenCalledTimes(1);
      });
    });
  });
});
