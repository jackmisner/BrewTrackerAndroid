/**
 * EditBrewSession Tests
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
// QueryClient and QueryClientProvider imported but not used in this test file
import EditBrewSessionScreen from "../../../../app/(modals)/(brewSessions)/editBrewSession";

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

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) => React.createElement("DateTimePicker", props),
  };
});

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ brewSessionId: "session-123" }),
}));

// Mock React Query hooks
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    brewSessions: {
      getById: jest.fn(),
      update: jest.fn(),
    },
    handleApiError: (err: any) => ({ message: err.message || "Unknown error" }),
  },
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      background: "#FFFFFF",
      card: "#F2F2F7",
      text: "#000000",
      secondary: "#8E8E93",
      error: "#FF3B30",
      border: "#E5E5EA",
      success: "#34C759",
      textSecondary: "#999999",
    },
  }),
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

jest.mock("@styles/modals/editBrewSessionStyles", () => ({
  editBrewSessionStyles: () => ({
    container: {},
    header: {},
    title: {},
    content: {},
    field: {},
    label: {},
    input: {},
    button: {},
    buttonText: {},
    statusButton: {},
    statusButtonText: {},
  }),
}));

// Utility to render component (QueryClient is mocked)
const renderWithClient = (ui: React.ReactElement) => {
  return render(ui);
};

// const mockApiService = require("@services/api/apiService").default; // Unused
const mockRouter = require("expo-router").router;
// const mockAlert = require("react-native").Alert.alert; // Unused
const mockUseQuery = require("@tanstack/react-query").useQuery;
const mockUseMutation = require("@tanstack/react-query").useMutation;

beforeEach(() => {
  jest.clearAllMocks();

  // Set up default successful useQuery mock
  mockUseQuery.mockReturnValue({
    data: {
      data: {
        id: "session-123",
        name: "Test Session",
        status: "planned",
        notes: "Test notes",
        tasting_notes: "",
        mash_temp: 152,
        actual_og: 1.05,
        actual_fg: 1.012,
        actual_abv: 5.2,
        actual_efficiency: 75,
        fermentation_start_date: "2024-01-01",
        fermentation_end_date: "2024-01-14",
        packaging_date: "2024-01-21",
        batch_rating: 4,
      },
    },
    isLoading: false,
    error: null,
  });

  // Set up default successful useMutation mock
  mockUseMutation.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
    error: null,
  });
});

describe("EditBrewSessionScreen", () => {
  const defaultSessionData = {
    data: {
      id: "session-123",
      name: "Test Session",
      status: "planned",
      notes: "Test notes",
      tasting_notes: "",
      mash_temp: 152,
      actual_og: 1.05,
      actual_fg: 1.012,
      actual_abv: 5.2,
      actual_efficiency: 75,
      fermentation_start_date: "2024-01-01",
      fermentation_end_date: "2024-01-14",
      packaging_date: "2024-01-21",
      batch_rating: 4,
    },
  };

  describe("Basic Rendering", () => {
    it("renders without crashing", async () => {
      const { getByText } = renderWithClient(<EditBrewSessionScreen />);
      await waitFor(() => {
        expect(getByText("Edit Brew Session")).toBeTruthy();
      });
    });

    it("displays loading indicator when loading", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { getByText } = renderWithClient(<EditBrewSessionScreen />);
      await waitFor(() => {
        expect(getByText("Loading brew session...")).toBeTruthy();
      });
    });

    it("displays error message when API fails", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Failed to load"),
      });

      const { getByText } = renderWithClient(<EditBrewSessionScreen />);
      await waitFor(() => {
        expect(getByText("Failed to Load Session")).toBeTruthy();
      });
    });
  });

  describe("Form Interactions", () => {
    it("renders form with loaded session data", async () => {
      const { getByDisplayValue } = renderWithClient(<EditBrewSessionScreen />);

      await waitFor(() => {
        expect(getByDisplayValue("Test Session")).toBeTruthy();
        expect(getByDisplayValue("Test notes")).toBeTruthy();
        expect(getByDisplayValue("1.05")).toBeTruthy();
        expect(getByDisplayValue("1.012")).toBeTruthy();
        expect(getByDisplayValue("152")).toBeTruthy();
      });
    });

    it("updates form fields when user types", async () => {
      const { getByDisplayValue } = renderWithClient(<EditBrewSessionScreen />);

      await waitFor(() => {
        const nameField = getByDisplayValue("Test Session");
        fireEvent.changeText(nameField, "Updated Session");
        expect(nameField.props.value).toBe("Updated Session");
      });
    });

    it("calls API update when save button pressed", async () => {
      const mockMutate = jest.fn();
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      const { getByText } = renderWithClient(<EditBrewSessionScreen />);

      await waitFor(() => {
        const saveButton = getByText("Save");
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });
  });

  describe("Navigation", () => {
    it("navigates back when close button pressed", async () => {
      const { getByTestId } = renderWithClient(<EditBrewSessionScreen />);

      await waitFor(() => {
        const closeButton = getByTestId("close-button");
        fireEvent.press(closeButton);
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });
  });
});
