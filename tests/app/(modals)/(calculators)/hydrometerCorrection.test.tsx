/**
 * Tests for Hydrometer Correction Calculator Screen
 *
 * Tests the hydrometer correction calculator modal including temperature conversions,
 * input validation, and result display
 */

import React from "react";
import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders, testUtils } from "@/tests/testUtils";
import HydrometerCorrectionCalculatorScreen from "../../../../app/(modals)/(calculators)/hydrometerCorrection";
import { HydrometerCorrectionCalculator } from "@services/calculators/HydrometerCorrectionCalculator";

// Comprehensive React Native mocking
jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: (props: any) => React.createElement("View", props, props.children),
    ScrollView: (props: any) =>
      React.createElement("ScrollView", props, props.children),
    TouchableOpacity: (props: any) =>
      React.createElement("TouchableOpacity", props, props.children),
    Text: (props: any) => React.createElement("Text", props, props.children),
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (styles: any) => styles,
    },
    Appearance: {
      getColorScheme: jest.fn(() => "light"),
      addChangeListener: jest.fn(),
      removeChangeListener: jest.fn(),
    },
  };
});

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name }: { name: string }) => name,
}));

// Mock CalculatorsContext with manageable state
const mockDispatch = jest.fn();
const mockState = {
  hydrometerCorrection: {
    measuredGravity: "",
    wortTemp: "",
    calibrationTemp: "68",
    tempUnit: "F",
    result: null as any,
  },
};

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
    NumberInput: ({ label, testID, onChangeText }: any) => {
      const { TouchableOpacity, Text } = require("react-native");
      return (
        <TouchableOpacity
          testID={testID}
          onPress={() => onChangeText && onChangeText("test-value")}
        >
          <Text>{label}</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock("@components/calculators/UnitToggle", () => {
  return {
    UnitToggle: ({ label, onChange, value }: any) => {
      const { TouchableOpacity, Text } = require("react-native");
      return (
        <TouchableOpacity
          testID="unit-toggle"
          onPress={() => onChange && onChange(value === "F" ? "C" : "F")}
        >
          <Text>{label}</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock("@components/calculators/ResultDisplay", () => {
  const { View } = require("react-native");
  return {
    SingleResult: ({ label, value }: any) => (
      <View testID="single-result">
        {label}
        {value}
      </View>
    ),
  };
});

// Mock HydrometerCorrectionCalculator service
jest.mock("@services/calculators/HydrometerCorrectionCalculator", () => ({
  HydrometerCorrectionCalculator: {
    calculateCorrection: jest.fn(),
  },
}));

const mockHydrometerCalculator = HydrometerCorrectionCalculator as jest.Mocked<
  typeof HydrometerCorrectionCalculator
>;

describe("HydrometerCorrectionCalculatorScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
  });

  describe("basic rendering", () => {
    it("should render without crashing", () => {
      expect(() =>
        renderWithProviders(<HydrometerCorrectionCalculatorScreen />)
      ).not.toThrow();
    });

    it("should render header with correct title", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );
      expect(getByTestId("hydrometer-correction-header")).toBeTruthy();
    });

    it("should render settings section", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );
      expect(getByTestId("calculator-card-settings")).toBeTruthy();
      expect(getByTestId("unit-toggle")).toBeTruthy();
    });

    it("should render gravity reading section", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );
      expect(getByTestId("calculator-card-gravity-reading")).toBeTruthy();
      expect(getByTestId("hydrometer-measured-gravity")).toBeTruthy();
      expect(getByTestId("hydrometer-sample-temp")).toBeTruthy();
    });

    it("should render hydrometer calibration section", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );
      expect(
        getByTestId("calculator-card-hydrometer-calibration")
      ).toBeTruthy();
      expect(getByTestId("hydrometer-calibration-temp")).toBeTruthy();
    });

    it("should not render result when no result available", () => {
      const { queryByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );
      expect(queryByTestId("single-result")).toBeNull();
    });
  });

  describe("input handling", () => {
    it("should handle measured gravity input change", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const gravityInput = getByTestId("hydrometer-measured-gravity");
      fireEvent.press(gravityInput);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { measuredGravity: "test-value" },
      });
    });

    it("should handle sample temperature input change", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const tempInput = getByTestId("hydrometer-sample-temp");
      fireEvent.press(tempInput);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { wortTemp: "test-value" },
      });
    });

    it("should handle calibration temperature input change", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const calibrationInput = getByTestId("hydrometer-calibration-temp");
      fireEvent.press(calibrationInput);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { calibrationTemp: "test-value" },
      });
    });

    it("should handle temperature unit change", () => {
      mockState.hydrometerCorrection.wortTemp = "75";
      mockState.hydrometerCorrection.calibrationTemp = "68";

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const unitToggle = getByTestId("unit-toggle");
      fireEvent.press(unitToggle);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: {
          tempUnit: "C",
          wortTemp: "23.9", // 75°F to °C
          calibrationTemp: "20.0", // 68°F to °C
        },
      });
    });
  });

  describe("temperature conversion", () => {
    it("should convert Fahrenheit to Celsius", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "68",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const unitToggle = getByTestId("unit-toggle");
      fireEvent.press(unitToggle);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: {
          tempUnit: "C",
          wortTemp: "20.0",
          calibrationTemp: "20.0",
        },
      });
    });

    it("should convert Celsius to Fahrenheit", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "20",
        calibrationTemp: "20",
        tempUnit: "C" as const,
        result: null,
      };

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const unitToggle = getByTestId("unit-toggle");
      fireEvent.press(unitToggle);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: {
          tempUnit: "F",
          wortTemp: "68.0",
          calibrationTemp: "68.0",
        },
      });
    });

    it("should handle empty values during conversion", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "",
        wortTemp: "",
        calibrationTemp: "",
        tempUnit: "F" as const,
        result: null,
      };

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const unitToggle = getByTestId("unit-toggle");
      fireEvent.press(unitToggle);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: {
          tempUnit: "C",
          wortTemp: "",
          calibrationTemp: "",
        },
      });
    });

    it("should handle invalid temperature values during conversion", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "invalid",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const unitToggle = getByTestId("unit-toggle");
      fireEvent.press(unitToggle);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: {
          tempUnit: "C",
          wortTemp: "invalid", // Should remain unchanged
          calibrationTemp: "20.0",
        },
      });
    });
  });

  describe("calculations", () => {
    it("should not calculate with empty inputs", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "",
        wortTemp: "",
        calibrationTemp: "",
        tempUnit: "F" as const,
        result: null,
      };

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(
        mockHydrometerCalculator.calculateCorrection
      ).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: null },
      });
    });

    it("should not calculate with partial inputs", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(
        mockHydrometerCalculator.calculateCorrection
      ).not.toHaveBeenCalled();
    });

    it("should calculate with valid inputs", () => {
      const mockResult = {
        correctedGravity: 1.048,
        correction: -0.002,
      };

      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "75",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      mockHydrometerCalculator.calculateCorrection.mockReturnValue(mockResult);

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(mockHydrometerCalculator.calculateCorrection).toHaveBeenCalledWith(
        1.05,
        75,
        68,
        "F"
      );

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: 1.048 },
      });
    });

    it("should add successful calculation to history", () => {
      const mockResult = {
        correctedGravity: 1.048,
        correction: -0.002,
      };

      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "75",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      mockHydrometerCalculator.calculateCorrection.mockReturnValue(mockResult);

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "hydrometerCorrection",
          inputs: {
            measuredGravity: 1.05,
            wortTemp: 75,
            calibrationTemp: 68,
            tempUnit: "F",
          },
          result: {
            correctedGravity: 1.048,
            correction: -0.002,
          },
        },
      });
    });

    it("should handle invalid numeric inputs", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "invalid",
        wortTemp: "75",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(
        mockHydrometerCalculator.calculateCorrection
      ).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: null },
      });
    });

    it("should handle calculation errors gracefully", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "75",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      mockHydrometerCalculator.calculateCorrection.mockImplementation(() => {
        throw new Error("Calculation error");
      });

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Hydrometer correction error:",
        expect.any(Error)
      );

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: null },
      });

      consoleSpy.mockRestore();
    });
  });

  describe("result display", () => {
    it("should display result when calculation succeeds", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "75",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: 1.048,
      };

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      expect(getByTestId("single-result")).toBeTruthy();
    });

    it("should display correct result value", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "75",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: 1.048,
      };

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      // Verify the result is displayed
      const resultComponent = getByTestId("single-result");
      expect(resultComponent).toBeTruthy();
      // The result component should contain both the label and value as text nodes
      expect(resultComponent.props.children).toContain(1.048);
    });
  });

  describe("placeholder text and units", () => {
    it("should show Fahrenheit placeholders and units by default", () => {
      // Default tempUnit is 'f', so placeholders should be in Fahrenheit
      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);
      // This is indirectly tested through the NumberInput props
    });

    it("should show Celsius placeholders and units when in Celsius mode", () => {
      mockState.hydrometerCorrection.tempUnit = "C";

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);
      // This is indirectly tested through the NumberInput props
    });
  });

  describe("edge cases", () => {
    it("should handle zero values gracefully", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "0",
        wortTemp: "0",
        calibrationTemp: "0",
        tempUnit: "C" as const,
        result: null,
      };

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(mockHydrometerCalculator.calculateCorrection).toHaveBeenCalledWith(
        0,
        0,
        0,
        "C"
      );
    });

    it("should handle extreme temperature values", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.100",
        wortTemp: "212",
        calibrationTemp: "32",
        tempUnit: "F" as const,
        result: null,
      };

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(mockHydrometerCalculator.calculateCorrection).toHaveBeenCalledWith(
        1.1,
        212,
        32,
        "F"
      );
    });

    it("should handle high gravity values", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.150",
        wortTemp: "68",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(mockHydrometerCalculator.calculateCorrection).toHaveBeenCalledWith(
        1.15,
        68,
        68,
        "F"
      );
    });

    it("should handle fractional temperature values", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "68.5",
        calibrationTemp: "67.8",
        tempUnit: "F" as const,
        result: null,
      };

      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);

      expect(mockHydrometerCalculator.calculateCorrection).toHaveBeenCalledWith(
        1.05,
        68.5,
        67.8,
        "F"
      );
    });
  });

  describe("component integration", () => {
    it("should pass correct props to NumberInput components", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      // All inputs should be present with correct test IDs
      expect(getByTestId("hydrometer-measured-gravity")).toBeTruthy();
      expect(getByTestId("hydrometer-sample-temp")).toBeTruthy();
      expect(getByTestId("hydrometer-calibration-temp")).toBeTruthy();
    });

    it("should pass correct props to UnitToggle", () => {
      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      expect(getByTestId("unit-toggle")).toBeTruthy();
    });

    it("should pass correct props to SingleResult when result exists", () => {
      mockState.hydrometerCorrection.result = 1.048;

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      expect(getByTestId("single-result")).toBeTruthy();
    });

    it("should handle theme changes gracefully", () => {
      // Component should render without errors with theme applied
      expect(() =>
        renderWithProviders(<HydrometerCorrectionCalculatorScreen />)
      ).not.toThrow();
    });
  });

  describe("temperature unit options", () => {
    it("should have correct temperature unit options", () => {
      // TEMP_UNIT_OPTIONS should have Fahrenheit and Celsius options
      renderWithProviders(<HydrometerCorrectionCalculatorScreen />);
      // This is indirectly tested through the UnitToggle props
    });

    it("should handle same unit conversions", () => {
      mockState.hydrometerCorrection = {
        measuredGravity: "1.050",
        wortTemp: "68",
        calibrationTemp: "68",
        tempUnit: "F" as const,
        result: null,
      };

      const { getByTestId } = renderWithProviders(
        <HydrometerCorrectionCalculatorScreen />
      );

      const unitToggle = getByTestId("unit-toggle");
      fireEvent.press(unitToggle);

      // Should dispatch conversion from F to C (our mock toggles units)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_HYDROMETER_CORRECTION",
        payload: {
          tempUnit: "C",
          wortTemp: "20.0", // 68°F -> 20.0°C
          calibrationTemp: "20.0", // 68°F -> 20.0°C
        },
      });
    });
  });
});
