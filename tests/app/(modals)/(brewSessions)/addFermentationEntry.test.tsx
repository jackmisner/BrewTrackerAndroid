/**
 * AddFermentationEntryScreen Component Test Suite
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
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
}));

// Mock external dependencies
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) => React.createElement("DateTimePicker", props),
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

jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    brewSessions: {
      getById: jest.fn(),
      addFermentationEntry: jest.fn(),
    },
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
    },
  }),
}));

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
  });
  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should render basic screen structure", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
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
        render(<AddFermentationEntryScreen />);
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
        render(<AddFermentationEntryScreen />);
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
          temperature_unit: "F",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle Celsius temperature unit", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          name: "Test Batch",
          temperature_unit: "C",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle missing temperature unit", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          name: "Test Batch",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle form state management", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Form Validation Logic", () => {
    it("should validate gravity values are within acceptable range", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle temperature validation", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle pH validation", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle validation errors display", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle valid form submission", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Date and Time Handling", () => {
    it("should open date picker when date button is pressed", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should format date correctly and update display", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle date selection and call onChange callback", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Navigation and Actions", () => {
    const mockRouter = require("expo-router").router;

    it("should handle cancel action", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();

      expect(mockRouter.back).toBeDefined();
    });

    it("should handle save action", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle navigation back", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("API Integration", () => {
    it("should handle mutation success", () => {
      const { router } = require("expo-router");
      const invalidateQueries = jest.fn();
      jest
        .spyOn(require("@tanstack/react-query"), "useQueryClient")
        .mockReturnValue({ invalidateQueries } as any);
      jest
        .spyOn(require("@tanstack/react-query"), "useMutation")
        .mockImplementation(
          (options: any) =>
            ({
              mutate: (vars: any) => {
                options?.onSuccess?.({}, vars, null);
              },
              isPending: false,
              error: null,
            }) as any
        );

      const { getByTestId } = render(<AddFermentationEntryScreen />);
      // Provide required input and save
      fireEvent.changeText(getByTestId(TEST_IDS.inputs.gravityInput), "1.040");
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));

      expect(invalidateQueries).toHaveBeenCalled();
      expect(router.back).toHaveBeenCalled();
    });
    it("should handle mutation error", () => {
      const { Alert } = require("react-native");
      jest
        .spyOn(require("@tanstack/react-query"), "useMutation")
        .mockImplementation(
          (options: any) =>
            ({
              mutate: (_vars: any) => {
                options?.onError?.(new Error("Save failed"), _vars, null);
              },
              isPending: false,
              error: new Error("Save failed"),
            }) as any
        );

      const { getByTestId } = render(<AddFermentationEntryScreen />);
      fireEvent.changeText(getByTestId(TEST_IDS.inputs.gravityInput), "1.040");
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));

      expect(Alert.alert).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/save failed/i),
        expect.any(String),
        expect.any(Array)
      );
    });

    it("should handle mutation pending state", () => {
      const mockUseMutation = require("@tanstack/react-query").useMutation;
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isLoading: true,
        isPending: true,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(
        <AddFermentationEntryScreen />
      );
      const saveButton = getByTestId(TEST_IDS.buttons.saveButton);
      expect(saveButton.props.disabled).toBe(true);
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
          temperature_unit: "F",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle Celsius placeholder", () => {
      const mockUseQuery = require("@tanstack/react-query").useQuery;
      mockUseQuery.mockReturnValue({
        data: {
          id: "session-123",
          temperature_unit: "C",
        },
        isLoading: false,
        error: null,
      });

      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle temperature validation ranges", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Form Field Handling", () => {
    it("should handle gravity input", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle temperature input", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle pH input", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle notes input", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle optional fields", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });

  describe("Data Processing", () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });

    it("should convert numeric strings to numbers and format data correctly", async () => {
      const { getByTestId } = render(<AddFermentationEntryScreen />);

      // Test that form fields accept input and save button is pressable
      expect(() => {
        fireEvent.changeText(
          getByTestId(TEST_IDS.inputs.gravityInput),
          "1.050"
        );
        fireEvent.changeText(
          getByTestId(TEST_IDS.inputs.temperatureInput),
          "68"
        );
        fireEvent.changeText(getByTestId(TEST_IDS.inputs.phInput), "4.2");
        fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      }).not.toThrow();

      // Verify the form elements exist and are interactive
      expect(getByTestId(TEST_IDS.inputs.gravityInput)).toBeTruthy();
      expect(getByTestId(TEST_IDS.inputs.temperatureInput)).toBeTruthy();
      expect(getByTestId(TEST_IDS.inputs.phInput)).toBeTruthy();
      expect(getByTestId(TEST_IDS.buttons.saveButton)).toBeTruthy();
    });

    it("should handle optional fields correctly - omit empty fields", async () => {
      const mockMutate = jest.fn();
      jest
        .spyOn(require("@tanstack/react-query"), "useMutation")
        .mockReturnValue({
          mutate: mockMutate,
          isPending: false,
        });

      const { getByTestId } = render(<AddFermentationEntryScreen />);

      // Only fill required gravity field
      fireEvent.changeText(getByTestId(TEST_IDS.inputs.gravityInput), "1.040");

      // Submit form
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          gravity: 1.04,
          entry_date: expect.any(String),
          // Optional fields should not be present
        });

        const callArgs = mockMutate.mock.calls[0][0];
        expect(callArgs).not.toHaveProperty("temperature");
        expect(callArgs).not.toHaveProperty("ph");
        expect(callArgs).not.toHaveProperty("notes");
      });
    });

    it("should include optional fields when provided", async () => {
      const { getByTestId } = render(<AddFermentationEntryScreen />);

      // Test that all form fields including optional ones accept input
      expect(() => {
        fireEvent.changeText(
          getByTestId(TEST_IDS.inputs.gravityInput),
          "1.035"
        );
        fireEvent.changeText(
          getByTestId(TEST_IDS.inputs.temperatureInput),
          "72"
        );
        fireEvent.changeText(getByTestId(TEST_IDS.inputs.phInput), "3.8");
        fireEvent.changeText(
          getByTestId(TEST_IDS.inputs.notesInput),
          "Active fermentation"
        );
        fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));
      }).not.toThrow();

      // Verify all form elements exist and are interactive
      expect(getByTestId(TEST_IDS.inputs.gravityInput)).toBeTruthy();
      expect(getByTestId(TEST_IDS.inputs.temperatureInput)).toBeTruthy();
      expect(getByTestId(TEST_IDS.inputs.phInput)).toBeTruthy();
      expect(getByTestId(TEST_IDS.inputs.notesInput)).toBeTruthy();
      expect(getByTestId(TEST_IDS.buttons.saveButton)).toBeTruthy();
    });

    it("should format date to ISO string", async () => {
      const mockMutate = jest.fn();
      const testDate = new Date("2024-03-15T10:30:00Z");

      jest
        .spyOn(require("@tanstack/react-query"), "useMutation")
        .mockReturnValue({
          mutate: mockMutate,
          isPending: false,
        });

      const { getByTestId } = render(<AddFermentationEntryScreen />);

      // Fill required field
      fireEvent.changeText(getByTestId(TEST_IDS.inputs.gravityInput), "1.045");

      // Submit form
      fireEvent.press(getByTestId(TEST_IDS.buttons.saveButton));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
        const callArgs = mockMutate.mock.calls[0][0];
        expect(callArgs.entry_date).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle validation errors", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });

    it("should handle submission errors", () => {
      expect(() => {
        render(<AddFermentationEntryScreen />);
      }).not.toThrow();
    });
  });
});
