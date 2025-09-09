/**
 * Tests for ABV Calculator Modal Component
 *
 * Tests the ABV calculator modal interface and functionality
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ABVCalculatorScreen from "../../../../app/(modals)/(calculators)/abv";

// Mock React Native components
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => {
      if (styles == null) {
        return {};
      }
      if (!Array.isArray(styles)) {
        return styles;
      }
      const out = {};
      const push = (s: any) => {
        if (!s) {
          return;
        } // skip null/undefined/false
        if (Array.isArray(s)) {
          s.forEach(push);
        } else {
          Object.assign(out, s);
        }
      };
      styles.forEach(push);
      return out;
    },
  },
}));

// Mock contexts
const mockCalculatorsState: any = {
  abv: {
    originalGravity: "",
    finalGravity: "",
    formula: "simple" as const,
    unitType: "sg" as const,
    result: null,
  },
  // Mock other calculator states
  strikeWater: {},
  boilTimer: {},
  unitConverter: {},
  history: [],
};

const mockDispatch = jest.fn();

jest.mock("@contexts/CalculatorsContext", () => ({
  useCalculators: () => ({
    state: mockCalculatorsState,
    dispatch: mockDispatch,
  }),
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#ffffff",
      primary: "#f4511e",
      text: "#000000",
    },
  }),
}));

// Mock calculator service
jest.mock("@services/calculators/ABVCalculator", () => ({
  ABVCalculator: {
    calculate: jest.fn((og, fg, ogUnit, fgUnit, formula) => ({
      abv: 5.2,
      attenuation: 76.5,
      calories: 145,
    })),
  },
}));

// Mock child components
jest.mock("@components/calculators/CalculatorCard", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    CalculatorCard: ({ title, children, testID }: any) =>
      React.createElement(
        RN.View,
        { testID },
        React.createElement(RN.Text, {}, title),
        children
      ),
  };
});

jest.mock("@components/calculators/CalculatorHeader", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    CalculatorHeader: ({ title, testID }: any) =>
      React.createElement(
        RN.View,
        { testID },
        React.createElement(RN.Text, {}, title)
      ),
  };
});

jest.mock("@components/calculators/NumberInput", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    NumberInput: ({ label, testID, placeholder }: any) =>
      React.createElement(
        RN.View,
        { testID: testID ?? "NumberInput" },
        React.createElement(
          RN.Text,
          { testID: `${testID}-label` },
          label ?? ""
        ),
        React.createElement(
          RN.Text,
          { testID: `${testID}-placeholder` },
          placeholder ?? ""
        )
      ),
  };
});

jest.mock("@components/calculators/UnitToggle", () => ({
  UnitToggle: ({ label, value, onChange, options, testID }: any) =>
    "UnitToggle",
  DropdownToggle: ({ label, value, onChange, options, testID }: any) =>
    "DropdownToggle",
}));

jest.mock("@components/calculators/ResultDisplay", () => ({
  ResultDisplay: ({ title, results, testID }: any) => "ResultDisplay",
  SingleResult: ({ label, value, unit, testID }: any) => "SingleResult",
}));

describe("ABVCalculatorScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset state to defaults
    mockCalculatorsState.abv = {
      originalGravity: "",
      finalGravity: "",
      formula: "simple",
      unitType: "sg",
      result: null,
    };

    // Reset ABV calculator mock to default behavior
    const { ABVCalculator } = require("@services/calculators/ABVCalculator");
    ABVCalculator.calculate.mockReturnValue({
      abv: 5.2,
      attenuation: 76.5,
      calories: 145,
    });
  });

  it("should render ABV calculator screen", () => {
    const component = render(<ABVCalculatorScreen />);
    expect(component).toBeTruthy();
  });

  it("should call calculateABV when inputs change", async () => {
    mockCalculatorsState.abv = {
      originalGravity: "1.050",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: null,
    };

    const { ABVCalculator } = require("@services/calculators/ABVCalculator");

    render(<ABVCalculatorScreen />);

    await waitFor(() => {
      expect(ABVCalculator.calculate).toHaveBeenCalledWith(
        1.05,
        1.01,
        "sg",
        "sg",
        "simple"
      );
    });
  });

  it("should dispatch result update when calculation succeeds", async () => {
    mockCalculatorsState.abv = {
      originalGravity: "1.050",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: null,
    };

    render(<ABVCalculatorScreen />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_ABV",
        payload: { result: 5.2 },
      });
    });
  });

  it("should add calculation to history on successful calculation", async () => {
    mockCalculatorsState.abv = {
      originalGravity: "1.050",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: null,
    };

    render(<ABVCalculatorScreen />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "abv",
          inputs: {
            originalGravity: 1.05,
            finalGravity: 1.01,
            formula: "simple",
            unitType: "sg",
          },
          result: {
            abv: 5.2,
            attenuation: 76.5,
            calories: 145,
          },
        },
      });
    });
  });

  it("should clear result when inputs are empty", async () => {
    mockCalculatorsState.abv = {
      originalGravity: "",
      finalGravity: "",
      formula: "simple",
      unitType: "sg",
      result: null,
    };

    render(<ABVCalculatorScreen />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_ABV",
        payload: { result: null },
      });
    });
  });

  it("should clear result when inputs are invalid", async () => {
    const { ABVCalculator } = require("@services/calculators/ABVCalculator");
    ABVCalculator.calculate.mockClear();
    mockCalculatorsState.abv = {
      originalGravity: "invalid",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: null,
    };

    render(<ABVCalculatorScreen />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_ABV",
        payload: { result: null },
      });
    });
    expect(ABVCalculator.calculate).not.toHaveBeenCalled();
  });

  it("should handle calculation errors gracefully", async () => {
    const { ABVCalculator } = require("@services/calculators/ABVCalculator");
    ABVCalculator.calculate.mockImplementation(() => {
      throw new Error("Calculation error");
    });

    mockCalculatorsState.abv = {
      originalGravity: "1.050",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: null,
    };

    // Suppress expected console.warn output for this test
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      render(<ABVCalculatorScreen />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "ABV calculation error:",
          expect.any(Error)
        );
        expect(mockDispatch).toHaveBeenCalledWith({
          type: "SET_ABV",
          payload: { result: null },
        });
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("renders unit-specific placeholders", () => {
    // SG
    mockCalculatorsState.abv.unitType = "sg";
    const { getByText, rerender, debug } = render(<ABVCalculatorScreen />);
    debug();
    expect(getByText("e.g., 1.050")).toBeTruthy();

    // Plato
    mockCalculatorsState.abv.unitType = "plato";
    rerender(<ABVCalculatorScreen />);
    expect(getByText("e.g., 12.5")).toBeTruthy();

    // Brix
    mockCalculatorsState.abv.unitType = "brix";
    rerender(<ABVCalculatorScreen />);
    expect(getByText("e.g., 12.5")).toBeTruthy();
  });

  it("should calculate additional results when result is available", () => {
    mockCalculatorsState.abv = {
      originalGravity: "1.050",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: 5.2,
    };

    const component = render(<ABVCalculatorScreen />);
    expect(component).toBeTruthy();

    // The additionalResults useMemo should calculate properly
    const { ABVCalculator } = require("@services/calculators/ABVCalculator");
    expect(ABVCalculator.calculate).toHaveBeenCalled();
  });

  it("should return null additional results when inputs are invalid", () => {
    const { ABVCalculator } = require("@services/calculators/ABVCalculator");
    const calculateSpy = jest.spyOn(ABVCalculator, "calculate");

    mockCalculatorsState.abv = {
      originalGravity: "invalid",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: 5.2, // Even with a result, invalid inputs should prevent additional calculations
    };

    render(<ABVCalculatorScreen />);

    // The calculate function should not be called due to invalid inputs
    expect(calculateSpy).not.toHaveBeenCalled();

    calculateSpy.mockRestore();
  });

  it("should return null additional results when calculation fails", async () => {
    const { ABVCalculator } = require("@services/calculators/ABVCalculator");
    ABVCalculator.calculate.mockImplementation(() => {
      throw new Error("Calculation error");
    });

    mockCalculatorsState.abv = {
      originalGravity: "1.050",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: 5.2,
    };

    // Suppress expected console.warn output for this test but verify it was called
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    render(<ABVCalculatorScreen />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("should show results and additional metrics when result is present", () => {
    mockCalculatorsState.abv = {
      originalGravity: "1.050",
      finalGravity: "1.010",
      formula: "simple",
      unitType: "sg",
      result: 5.2,
    };

    const component = render(<ABVCalculatorScreen />);
    expect(component).toBeTruthy();
    // SingleResult and ResultDisplay components should be rendered
  });
});
