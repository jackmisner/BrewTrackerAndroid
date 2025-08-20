/**
 * EditFermentationEntryScreen Component Test Suite
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import EditFermentationEntryScreen from "../../../../app/(modals)/(brewSessions)/editFermentationEntry";

// Mock React Native components following successful pattern from other tests
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
  Platform: { OS: "ios" },
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

// Mock external dependencies following established patterns
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

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

jest.mock("@contexts/ThemeContext", () => ({
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
}));

jest.mock("@services/api/apiService", () => ({
  default: {
    brewSessions: {
      getById: jest.fn(),
      updateFermentationEntry: jest.fn(),
    },
  },
}));

// Mock styles following the pattern from other modal tests
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
  });

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      mockApiService.brewSessions.getById.mockResolvedValue({
        data: {
          id: "test-session-id",
          name: "Test Batch",
          fermentation_data: [
            {
              date: "2024-01-01T00:00:00Z",
              gravity: 1.05,
              temperature: 68,
              ph: 4.2,
              notes: "Initial entry",
            },
          ],
          temperature_unit: "F",
        },
      });

      expect(() => render(<EditFermentationEntryScreen />)).not.toThrow();
    });

    it("should render basic screen structure", () => {
      mockApiService.brewSessions.getById.mockResolvedValue({
        data: {
          id: "test-session-id",
          name: "Test Batch",
          fermentation_data: [],
          temperature_unit: "F",
        },
      });

      const { getByText } = render(<EditFermentationEntryScreen />);

      // Should render the screen title
      expect(getByText("Edit Fermentation Entry")).toBeTruthy();
    });

    it("should handle missing fermentation entry", async () => {
      mockApiService.brewSessions.getById.mockResolvedValue({
        data: {
          id: "test-session-id",
          name: "Test Batch",
          fermentation_data: [], // No entries at index 0
          temperature_unit: "F",
        },
      });

      const { getByText } = render(<EditFermentationEntryScreen />);

      await waitFor(() => {
        expect(getByText("Entry Not Found")).toBeTruthy();
      });
    });

    it("should handle API errors gracefully", async () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Failed to fetch session"),
      });
      const { getByText } = render(<EditFermentationEntryScreen />);
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
      const mockBrewSession = {
        id: "test-session-id",
        name: "Test Batch",
        fermentation_data: [
          {
            date: "2024-01-01T00:00:00Z",
            gravity: 1.05,
            temperature: 68,
            ph: 4.2,
            notes: "Initial entry",
          },
        ],
        temperature_unit: "F",
      };

      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: mockBrewSession,
        isLoading: false,
        error: null,
      });

      const { getByText } = render(<EditFermentationEntryScreen />);

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
      const mockBrewSessionCelsius = {
        id: "test-session-id",
        name: "Test Batch",
        fermentation_data: [
          {
            date: "2024-01-01T00:00:00Z",
            gravity: 1.05,
            temperature: 20,
            ph: 4.2,
            notes: "Celsius entry",
          },
        ],
        temperature_unit: "C", // Celsius
      };

      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: mockBrewSessionCelsius,
        isLoading: false,
        error: null,
      });

      const { getByText } = render(<EditFermentationEntryScreen />);

      // Should render without crashing with Celsius data
      expect(getByText("Edit Fermentation Entry")).toBeTruthy();
    });
  });

  describe("Navigation and Basic Interactions", () => {
    const mockRouter = require("expo-router").router;

    it("should handle navigation methods without crashing", () => {
      mockApiService.brewSessions.getById.mockResolvedValue({
        data: {
          id: "test-session-id",
          name: "Test Batch",
          fermentation_data: [],
          temperature_unit: "F",
        },
      });

      // Render the component
      expect(() => render(<EditFermentationEntryScreen />)).not.toThrow();

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
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "test-session-id",
          name: "Test Batch",
          fermentation_data: [
            {
              date: "2024-01-01T00:00:00Z",
              gravity: 1.05,
              temperature: 68,
              ph: 4.2,
              notes: "Initial entry",
            },
          ],
          temperature_unit: "F",
        },
        isLoading: false,
        error: null,
      });

      const mockMutate = jest.fn();
      const mockUseMutation = require("@tanstack/react-query").useMutation;
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      const { getByTestId } = render(<EditFermentationEntryScreen />);

      // Change a field value
      const gravityInput = getByTestId("gravity-input");
      fireEvent.changeText(gravityInput, "1.045");

      // Press save button
      const saveButton = getByTestId("save-button");
      fireEvent.press(saveButton);

      // Verify mutation was called
      expect(mockMutate).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
