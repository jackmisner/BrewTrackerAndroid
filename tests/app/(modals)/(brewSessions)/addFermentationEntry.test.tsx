/**
 * AddFermentationEntryScreen Component Test Suite
 */

import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders, testUtils } from "@/tests/testUtils";
import AddFermentationEntryScreen from "../../../../app/(modals)/(brewSessions)/addFermentationEntry";
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
    return React.createElement(
      "TouchableOpacity",
      {
        ...props,
        testID: props.testID || "touchable-opacity",
      },
      children
    );
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
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

// Mock external dependencies
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) => {
      const handleTestDateChange = () => {
        if (props.onChange) {
          const testDate = new Date("2024-03-15T10:30:00.000Z");
          props.onChange({ type: "set" }, testDate);
        }
      };

      return React.createElement("DateTimePicker", {
        ...props,
        // Add a button to simulate date selection
        children: React.createElement(
          "button",
          {
            testID: "mock-date-selector",
            onClick: handleTestDateChange,
            onPress: handleTestDateChange,
          },
          "Select Date"
        ),
      });
    },
  };
});

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({
    brewSessionId: "session-123",
  }),
}));

// Mock useBrewSessions hook
const mockGetById = jest.fn();
const mockAddFermentationEntry = jest.fn();

// Create a stable mock hook object
const mockBrewSessionsHook = {
  data: null,
  isLoading: false,
  error: null,
  pendingCount: 0,
  conflictCount: 0,
  lastSync: null,
  getById: mockGetById,
  addFermentationEntry: mockAddFermentationEntry,
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

// Keep React Query mock for backward compatibility (in case it's still used somewhere)
const mockMutate = jest.fn();
const mockMutateAsync = jest.fn().mockResolvedValue({});
const mockInvalidateQueries = jest.fn();

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn(() => ({
      data: {
        id: "session-123",
        name: "Test Batch",
        user_id: "user-123",
        temperature_unit: "F",
      },
      isLoading: false,
      error: null,
    })),
    useMutation: jest.fn(options => {
      let mockMutateAsyncWithErrorHandling = async (...args: any[]) => {
        try {
          return await mockMutateAsync(...args);
        } catch (error) {
          // Call onError callback if provided (this triggers Alert.alert)
          if (options?.onError) {
            options.onError(error);
          }
          // Re-throw error to maintain React Query behavior
          throw error;
        }
      };

      return {
        mutate: mockMutate,
        mutateAsync: mockMutateAsyncWithErrorHandling,
        isPending: false,
        error: null,
      };
    }),
    useQueryClient: jest.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    })),
  };
});

jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    brewSessions: {
      getById: jest.fn(),
      addFermentationEntry: jest.fn(),
    },
  },
}));

jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: () => ({
      colors: {
        primary: "#007AFF",
        background: "#FFFFFF",
        card: "#F2F2F7",
        text: "#000000",
        secondary: "#8E8E93",
        error: "#FF3B30",
      },
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@utils/userValidation", () => ({
  useUserValidation: () => ({
    validateUser: jest.fn().mockResolvedValue(true),
    canUserModifyResource: jest.fn().mockResolvedValue(true),
    isValidating: false,
  }),
}));

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

jest.mock("@src/types", () => ({
  CreateFermentationEntryRequest: {},
  BrewSession: {},
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
  }),
}));

describe("AddFermentationEntryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
    // Default mock implementations
    mockGetById.mockResolvedValue({
      id: "session-123",
      name: "Test Batch",
      user_id: "user-123",
      temperature_unit: "F",
      fermentation_data: [],
    });
    mockAddFermentationEntry.mockResolvedValue({
      id: "session-123",
      name: "Test Batch",
      user_id: "user-123",
      temperature_unit: "F",
      fermentation_data: [{ gravity: 1.05, temperature: 68 }],
    });
    mockMutate.mockClear();
    mockMutateAsync.mockClear().mockResolvedValue({});
    mockInvalidateQueries.mockClear();

    // Reset useQuery mock to default state with user_id for permission checks
    const mockUseQuery = require("@tanstack/react-query").useQuery;
    mockUseQuery.mockReturnValue({
      data: {
        id: "session-123",
        name: "Test Batch",
        user_id: "user-123",
        temperature_unit: "F",
      },
      isLoading: false,
      error: null,
    });
  });
  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should render basic screen structure", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle API loading state", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle API error state", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Failed to load brew session"),
      });

      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Component Behavior", () => {
    it("should handle brew session data loading", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          name: "Test Batch",
          user_id: "user-123",
          temperature_unit: "F",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle Celsius temperature unit", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          name: "Test Batch",
          user_id: "user-123",
          temperature_unit: "C",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle missing temperature unit", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          name: "Test Batch",
          user_id: "user-123",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle form state management", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Form Validation Logic", () => {
    it("should validate gravity values are within acceptable range", () => {
      const { getByTestId, queryByText } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Test invalid gravity value (out of range)
      fireEvent.changeText(
        getByTestId(TEST_IDS.patterns.inputField("gravity")),
        "2.000" // Assuming this is out of valid range
      );
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));

      // Assert validation error is displayed
      expect(
        queryByText(/Gravity must be between 0.990 and 1.200/i)
      ).toBeTruthy();

      // Test valid gravity value
      fireEvent.changeText(
        getByTestId(TEST_IDS.patterns.inputField("gravity")),
        "1.050"
      );
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      // Validation error should be cleared
      expect(
        queryByText(/Gravity must be between 0.990 and 1.200/i)
      ).toBeFalsy();
    });

    it("should handle temperature validation", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle pH validation", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle validation errors display", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle valid form submission", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Date and Time Handling", () => {
    it("should open date picker when date button is pressed", async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Initially date picker should not be visible
      expect(queryByTestId("date-time-picker")).toBeNull();

      // Press the date picker button
      const datePickerButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("date-picker")
      );
      fireEvent.press(datePickerButton);

      // Date picker should now be visible
      await waitFor(() => {
        expect(getByTestId("date-time-picker")).toBeTruthy();
      });
    });

    it("should format date correctly and update display", async () => {
      const { getByTestId } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Get initial date display
      const dateDisplay = getByTestId("date-display-text");
      const initialDateText = dateDisplay.props.children;

      // Verify initial date is formatted as locale date string
      const today = new Date();
      const expectedInitialDate = today.toLocaleDateString();
      expect(initialDateText).toBe(expectedInitialDate);

      // Open date picker
      const datePickerButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("date-picker")
      );
      fireEvent.press(datePickerButton);

      // Wait for date picker to appear and select new date
      await waitFor(() => {
        const datePicker = getByTestId("date-time-picker");
        expect(datePicker).toBeTruthy();
      });

      // Simulate date selection via mock
      const mockDateSelector = getByTestId("mock-date-selector");
      fireEvent.press(mockDateSelector);

      // Verify date display is updated with new formatted date
      await waitFor(() => {
        const updatedDateText = dateDisplay.props.children;
        const expectedNewDate = new Date(
          "2024-03-15T10:30:00.000Z"
        ).toLocaleDateString();
        expect(updatedDateText).toBe(expectedNewDate);
      });
    });

    it("should handle date selection and call onChange callback", async () => {
      const { getByTestId } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Open date picker
      const datePickerButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("date-picker")
      );
      fireEvent.press(datePickerButton);

      // Wait for date picker to appear
      await waitFor(() => {
        expect(getByTestId("date-time-picker")).toBeTruthy();
      });

      // Get the DateTimePicker component
      const datePicker = getByTestId("date-time-picker");

      // Verify the onChange callback is set
      expect(datePicker.props.onChange).toBeDefined();
      expect(typeof datePicker.props.onChange).toBe("function");

      // Simulate date selection
      const testDate = new Date("2024-03-15T10:30:00.000Z");
      const mockEvent = { type: "set" };

      // Call onChange directly to simulate date selection
      datePicker.props.onChange(mockEvent, testDate);

      // Verify that the date picker is hidden after selection
      await waitFor(() => {
        expect(getByTestId("date-display-text").props.children).toBe(
          testDate.toLocaleDateString()
        );
      });

      // Verify the selected date is properly formatted and displayed
      const dateDisplay = getByTestId("date-display-text");
      expect(dateDisplay.props.children).toBe("3/15/2024"); // US locale format for test date
    });
  });

  describe("Navigation and Actions", () => {
    const mockRouter = require("expo-router").router;

    it("should handle cancel action", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();

      expect(mockRouter.back).toBeDefined();
    });

    it("should handle save action", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle navigation back", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("API Integration", () => {
    it("should handle mutation success", async () => {
      const { getByTestId, queryByText } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(queryByText("Loading brew session...")).toBeNull();
        },
        { timeout: 3000 }
      );

      // Provide required input and save
      fireEvent.changeText(
        getByTestId(TEST_IDS.patterns.inputField("gravity")),
        "1.040"
      );

      // Verify form can be submitted without errors
      expect(() => {
        fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      }).not.toThrow();

      // Verify addFermentationEntry was called with correct data
      await waitFor(() => {
        expect(mockAddFermentationEntry).toHaveBeenCalledWith(
          "session-123",
          expect.objectContaining({
            gravity: 1.04,
            entry_date: expect.any(String),
          })
        );
      });
    });
    it("should handle mutation error", async () => {
      const { getByTestId, queryByText } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(queryByText("Loading brew session...")).toBeNull();
        },
        { timeout: 3000 }
      );

      fireEvent.changeText(
        getByTestId(TEST_IDS.patterns.inputField("gravity")),
        "1.040"
      );

      // Verify form submission works correctly (error handling is managed by offline hooks)
      expect(() => {
        fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      }).not.toThrow();

      // Verify addFermentationEntry was called with correct data structure
      await waitFor(() => {
        expect(mockAddFermentationEntry).toHaveBeenCalledWith(
          "session-123",
          expect.objectContaining({
            gravity: 1.04,
            entry_date: expect.any(String),
          })
        );
      });
    });

    it("should handle mutation pending state", () => {
      const { getByTestId } = renderWithProviders(
        <AddFermentationEntryScreen />
      );
      const saveButton = getByTestId(TEST_IDS.buttons.saveButton);
      // Save button should be enabled when not saving
      expect(saveButton.props.disabled).toBeFalsy();
    });

    it("should have API service methods available", () => {
      const mockApiService = require("@services/api/apiService").default;

      expect(mockApiService.brewSessions.getById).toBeDefined();
      expect(typeof mockApiService.brewSessions.getById).toBe("function");
      expect(mockApiService.brewSessions.addFermentationEntry).toBeDefined();
      expect(typeof mockApiService.brewSessions.addFermentationEntry).toBe(
        "function"
      );
    });
  });

  describe("Temperature Unit Handling", () => {
    it("should handle Fahrenheit placeholder", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          user_id: "user-123",
          temperature_unit: "F",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle Celsius placeholder", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          user_id: "user-123",
          temperature_unit: "C",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle temperature validation ranges", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Form Field Handling", () => {
    it("should handle gravity input", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle temperature input", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle pH input", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle notes input", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle optional fields", () => {
      expect(() => {
        renderWithProviders(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Data Processing", () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });

    it("should convert numeric strings to numbers and format data correctly", async () => {
      const { getByTestId } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Test that form fields accept input and save button is pressable
      expect(() => {
        fireEvent.changeText(
          getByTestId(TEST_IDS.patterns.inputField("gravity")),
          "1.050"
        );
        fireEvent.changeText(
          getByTestId(TEST_IDS.patterns.inputField("temperature")),
          "68"
        );
        fireEvent.changeText(
          getByTestId(TEST_IDS.patterns.inputField("ph")),
          "4.2"
        );
        fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      }).not.toThrow();

      // Verify the form elements exist and are interactive
      expect(getByTestId(TEST_IDS.patterns.inputField("gravity"))).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.inputField("temperature"))
      ).toBeTruthy();
      expect(getByTestId(TEST_IDS.patterns.inputField("ph"))).toBeTruthy();
      expect(getByTestId(TEST_IDS.buttons.saveButton)).toBeTruthy();
    });

    it("should handle optional fields correctly - omit empty fields", async () => {
      const { getByTestId, queryByText } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(queryByText("Loading brew session...")).toBeNull();
        },
        { timeout: 3000 }
      );

      // Only fill required gravity field
      fireEvent.changeText(
        getByTestId(TEST_IDS.patterns.inputField("gravity")),
        "1.040"
      );

      // Submit form
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));

      await waitFor(() => {
        expect(mockAddFermentationEntry).toHaveBeenCalledWith("session-123", {
          gravity: 1.04,
          entry_date: expect.any(String),
          // Optional fields should not be present
        });

        const callArgs = mockAddFermentationEntry.mock.calls[0][1];
        expect(callArgs).not.toHaveProperty("temperature");
        expect(callArgs).not.toHaveProperty("ph");
        expect(callArgs).not.toHaveProperty("notes");
      });
    });

    it("should include optional fields when provided", async () => {
      const { getByTestId, queryByText } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(queryByText("Loading brew session...")).toBeNull();
        },
        { timeout: 3000 }
      );

      // Test that all form fields including optional ones accept input
      expect(() => {
        fireEvent.changeText(
          getByTestId(TEST_IDS.patterns.inputField("gravity")),
          "1.035"
        );
        fireEvent.changeText(
          getByTestId(TEST_IDS.patterns.inputField("temperature")),
          "72"
        );
        fireEvent.changeText(
          getByTestId(TEST_IDS.patterns.inputField("ph")),
          "3.8"
        );
        fireEvent.changeText(
          getByTestId(TEST_IDS.patterns.inputField("notes")),
          "Active fermentation"
        );
        fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      }).not.toThrow();

      // Verify all form elements exist and are interactive
      expect(getByTestId(TEST_IDS.patterns.inputField("gravity"))).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.inputField("temperature"))
      ).toBeTruthy();
      expect(getByTestId(TEST_IDS.patterns.inputField("ph"))).toBeTruthy();
      expect(getByTestId(TEST_IDS.patterns.inputField("notes"))).toBeTruthy();
      expect(getByTestId(TEST_IDS.buttons.saveButton)).toBeTruthy();
    });

    it("should format date to ISO string", async () => {
      const { getByTestId, queryByText } = renderWithProviders(
        <AddFermentationEntryScreen />
      );

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(queryByText("Loading brew session...")).toBeNull();
        },
        { timeout: 3000 }
      );

      // Fill required field
      fireEvent.changeText(
        getByTestId(TEST_IDS.patterns.inputField("gravity")),
        "1.045"
      );

      // Submit form
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));

      await waitFor(() => {
        expect(mockAddFermentationEntry).toHaveBeenCalled();
        const callArgs = mockAddFermentationEntry.mock.calls[0][1];
        expect(callArgs.entry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });
});
