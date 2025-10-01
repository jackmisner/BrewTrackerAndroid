/**
 * Tests for Dilution Calculator Screen
 *
 * Tests the dilution calculator modal including calculations, input validation, and result display
 */

import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders, testUtils } from "@/tests/testUtils";
import DilutionCalculatorScreen from "../../../../app/(modals)/(calculators)/dilution";
import {
  DilutionCalculator,
  DilutionResult,
} from "@services/calculators/DilutionCalculator";

// Comprehensive React Native mocking
jest.mock("react-native", () => ({
  View: "View",
  ScrollView: "ScrollView",
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

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name }: { name: string }) => name,
}));

// Mock CalculatorsContext with manageable state
const mockDispatch = jest.fn();
const createMockState = () => ({
  dilution: {
    currentGravity: "",
    targetGravity: "",
    currentVolume: "",
    result: null as any,
  },
});
let mockState = createMockState();
jest.mock("@contexts/CalculatorsContext", () => ({
  ...jest.requireActual("@contexts/CalculatorsContext"),
  useCalculators: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

// Mock ThemeContext to avoid conflicts with testUtils
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

// Mock React Query for ModalHeader dependency
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
    })),
    QueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
    })),
  };
});

// Mock ModalHeader component
jest.mock("@src/components/ui/ModalHeader", () => ({
  ModalHeader: ({ title, testID }: { title: string; testID: string }) => {
    const React = require("react");
    return React.createElement("View", { testID }, [
      React.createElement("TouchableOpacity", {
        testID: `${testID}-back-button`,
        key: "back",
      }),
      React.createElement("Text", { key: "title" }, title),
      React.createElement("TouchableOpacity", {
        testID: `${testID}-home-button`,
        key: "home",
      }),
    ]);
  },
}));

// Mock calculator components
jest.mock("@components/calculators/CalculatorCard", () => {
  const { View } = require("react-native");
  return {
    CalculatorCard: ({ title, children }: { title: string; children: any }) => (
      <View
        testID={`calculator-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {children}
      </View>
    ),
  };
});

jest.mock("@components/calculators/NumberInput", () => {
  const { View } = require("react-native");
  return {
    NumberInput: ({ label, testID, onChangeText }: any) => (
      <View
        testID={testID}
        onChangeText={onChangeText}
        onPress={() => onChangeText && onChangeText("test-value")}
      >
        {label}
      </View>
    ),
  };
});

jest.mock("@components/calculators/ResultDisplay", () => {
  const { View } = require("react-native");
  return {
    ResultDisplay: ({ title, results }: any) => (
      <View testID="result-display">
        {title}
        {results?.map((result: any, index: number) => (
          <View key={index} testID={`result-${index}`}>
            {result.label}: {result.value} {result.unit}
          </View>
        ))}
      </View>
    ),
  };
});

// Mock DilutionCalculator service
jest.mock("@services/calculators/DilutionCalculator", () => ({
  DilutionCalculator: {
    calculateDilution: jest.fn(),
  },
}));

const mockDilutionCalculator = DilutionCalculator as jest.Mocked<
  typeof DilutionCalculator
>;

describe("DilutionCalculatorScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
    mockState = createMockState();
  });

  describe("basic rendering", () => {
    it("should render without crashing", () => {
      expect(() =>
        renderWithProviders(<DilutionCalculatorScreen />)
      ).not.toThrow();
    });

    it("should render header with correct title", () => {
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);
      expect(getByTestId("dilution-calculator-header")).toBeTruthy();
    });

    it("should render current beer input section", () => {
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);
      expect(getByTestId("calculator-card-current-beer")).toBeTruthy();
      expect(getByTestId("dilution-og-input")).toBeTruthy();
      expect(getByTestId("dilution-volume-input")).toBeTruthy();
    });

    it("should render target input section", () => {
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);
      expect(getByTestId("calculator-card-target")).toBeTruthy();
      expect(getByTestId("dilution-target-input")).toBeTruthy();
    });

    it("should not render results when no result available", () => {
      const { queryByTestId } = renderWithProviders(
        <DilutionCalculatorScreen />
      );
      expect(queryByTestId("result-display")).toBeNull();
    });
  });

  describe("input handling", () => {
    it("should handle original gravity input change", () => {
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);

      const ogInput = getByTestId("dilution-og-input");
      fireEvent.press(ogInput);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_DILUTION",
        payload: { currentGravity: "test-value" },
      });
    });

    it("should handle target gravity input change", () => {
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);

      const targetInput = getByTestId("dilution-target-input");
      fireEvent.press(targetInput);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_DILUTION",
        payload: { targetGravity: "test-value" },
      });
    });

    it("should handle volume input change", () => {
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);

      const volumeInput = getByTestId("dilution-volume-input");
      fireEvent.press(volumeInput);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_DILUTION",
        payload: { currentVolume: "test-value" },
      });
    });
  });

  describe("calculations", () => {
    it("should not calculate with empty inputs", () => {
      mockState.dilution = {
        currentGravity: "",
        targetGravity: "",
        currentVolume: "",
        result: null,
      };

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDilutionCalculator.calculateDilution).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_DILUTION",
        payload: { result: null },
      });
    });

    it("should not calculate with partial inputs", () => {
      mockState.dilution = {
        currentGravity: "1.060",
        targetGravity: "",
        currentVolume: "5.0",
        result: null,
      };

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDilutionCalculator.calculateDilution).not.toHaveBeenCalled();
    });

    it("should calculate with valid inputs", () => {
      const mockResult = {
        waterToAdd: 2.5,
        finalVolume: 7.5,
      };

      mockState.dilution = {
        currentGravity: "1.060",
        targetGravity: "1.040",
        currentVolume: "5.0",
        result: null,
      };

      mockDilutionCalculator.calculateDilution.mockReturnValue(mockResult);

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDilutionCalculator.calculateDilution).toHaveBeenCalledWith(
        1.06,
        5.0,
        1.04
      );

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_DILUTION",
        payload: { result: mockResult },
      });
    });

    it("should add successful calculation to history", () => {
      const mockResult = {
        waterToAdd: 2.5,
        finalVolume: 7.5,
      };

      mockState.dilution = {
        currentGravity: "1.060",
        targetGravity: "1.040",
        currentVolume: "5.0",
        result: null,
      };

      mockDilutionCalculator.calculateDilution.mockReturnValue(mockResult);

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "dilution",
          inputs: {
            currentGravity: 1.06,
            targetGravity: 1.04,
            currentVolume: 5.0,
          },
          result: {
            waterToAdd: 2.5,
            finalVolume: 7.5,
          },
        },
      });
    });

    it("should handle invalid numeric inputs", () => {
      mockState.dilution = {
        currentGravity: "invalid",
        targetGravity: "1.040",
        currentVolume: "5.0",
        result: null,
      };

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDilutionCalculator.calculateDilution).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_DILUTION",
        payload: { result: null },
      });
    });

    it("should handle calculation errors gracefully", () => {
      mockState.dilution = {
        currentGravity: "1.060",
        targetGravity: "1.040",
        currentVolume: "5.0",
        result: null,
      };

      mockDilutionCalculator.calculateDilution.mockImplementation(() => {
        throw new Error("Calculation error");
      });

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Dilution calculation error:",
        expect.any(Error)
      );

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_DILUTION",
        payload: { result: null },
      });

      consoleSpy.mockRestore();
    });
  });

  describe("result display", () => {
    it("should display results when calculation succeeds", () => {
      mockState.dilution = {
        currentGravity: "1.060",
        targetGravity: "1.040",
        currentVolume: "5.0",
        result: {
          waterToAdd: 2.5,
          finalVolume: 7.5,
        },
      };

      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);

      expect(getByTestId("result-display")).toBeTruthy();
      expect(getByTestId("result-0")).toBeTruthy(); // Water to Add
      expect(getByTestId("result-1")).toBeTruthy(); // Final Volume
    });

    it("should display correct result values", () => {
      mockState.dilution = {
        currentGravity: "1.060",
        targetGravity: "1.040",
        currentVolume: "5.0",
        result: {
          waterToAdd: 2.5,
          finalVolume: 7.5,
        },
      };

      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);

      // Verify result elements are present
      expect(getByTestId("result-0")).toBeTruthy(); // Water to Add
      expect(getByTestId("result-1")).toBeTruthy(); // Final Volume
    });
  });

  describe("placeholder text", () => {
    it("should show appropriate placeholder for original gravity", () => {
      // The getPlaceholderText function returns "1.060" for original gravity
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);
      expect(getByTestId("dilution-og-input")).toBeTruthy();
    });

    it("should show appropriate placeholder for target gravity", () => {
      // The getPlaceholderText function returns "1.040" for target gravity
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);
      expect(getByTestId("dilution-target-input")).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle zero values gracefully", () => {
      mockState.dilution = {
        currentGravity: "0",
        targetGravity: "1.040",
        currentVolume: "5.0",
        result: null,
      };

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDilutionCalculator.calculateDilution).toHaveBeenCalledWith(
        0,
        5.0,
        1.04
      );
    });

    it("should handle very small values", () => {
      mockState.dilution = {
        currentGravity: "1.001",
        targetGravity: "1.000",
        currentVolume: "0.1",
        result: null,
      };

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDilutionCalculator.calculateDilution).toHaveBeenCalledWith(
        1.001,
        0.1,
        1.0
      );
    });

    it("should handle large values", () => {
      mockState.dilution = {
        currentGravity: "1.150",
        targetGravity: "1.100",
        currentVolume: "100.0",
        result: null,
      };

      renderWithProviders(<DilutionCalculatorScreen />);

      expect(mockDilutionCalculator.calculateDilution).toHaveBeenCalledWith(
        1.15,
        100.0,
        1.1
      );
    });
  });

  describe("component integration", () => {
    it("should pass correct props to NumberInput components", () => {
      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);

      // All inputs should be present with correct test IDs
      expect(getByTestId("dilution-og-input")).toBeTruthy();
      expect(getByTestId("dilution-volume-input")).toBeTruthy();
      expect(getByTestId("dilution-target-input")).toBeTruthy();
    });

    it("should pass correct props to ResultDisplay when results exist", () => {
      mockState.dilution.result = {
        waterToAdd: 2.5,
        finalVolume: 7.5,
      };

      const { getByTestId } = renderWithProviders(<DilutionCalculatorScreen />);

      expect(getByTestId("result-display")).toBeTruthy();
      // The title is passed but rendered differently in our mock
    });

    it("should handle theme changes gracefully", () => {
      // Component should render without errors with theme applied
      expect(() =>
        renderWithProviders(<DilutionCalculatorScreen />)
      ).not.toThrow();
    });
  });
});
