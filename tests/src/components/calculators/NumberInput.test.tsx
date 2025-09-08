/**
 * Tests for NumberInput component
 *
 * Tests numeric input validation, step controls, and unit handling
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NumberInput } from "@src/components/calculators/NumberInput";
import { TEST_IDS } from "@constants/testIDs";

// Comprehensive React Native mocking
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name }: { name: string }) => name,
}));

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      text: "#000000",
      textSecondary: "#666666",
      background: "#ffffff",
      backgroundSecondary: "#f5f5f5",
      borderLight: "#e0e0e0",
      primary: "#007AFF",
      primaryLight20: "#CCE5FF",
      error: "#FF3B30",
    },
  }),
}));

describe("NumberInput", () => {
  const defaultProps = {
    label: "Test Input",
    value: "10",
    onChangeText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with label and value", () => {
      const { getByText, getByDisplayValue } = render(
        <NumberInput {...defaultProps} />
      );

      expect(getByText("Test Input")).toBeTruthy();
      expect(getByDisplayValue("10")).toBeTruthy();
    });

    it("should render with placeholder", () => {
      const { getByPlaceholderText } = render(
        <NumberInput {...defaultProps} value="" placeholder="Enter value" />
      );

      expect(getByPlaceholderText("Enter value")).toBeTruthy();
    });

    it("should render with unit", () => {
      const { getByText } = render(
        <NumberInput {...defaultProps} unit="lbs" />
      );

      expect(getByText("lbs")).toBeTruthy();
    });

    it("should render with custom testID", () => {
      const { getByTestId } = render(
        <NumberInput {...defaultProps} testID="custom-input" />
      );

      expect(getByTestId("custom-input")).toBeTruthy();
    });

    it("should render with helper text", () => {
      const { getByText } = render(
        <NumberInput {...defaultProps} helperText="This is helpful" />
      );

      expect(getByText("This is helpful")).toBeTruthy();
    });

    it("should render with error text", () => {
      const { getByText } = render(
        <NumberInput {...defaultProps} error="This is an error" />
      );

      expect(getByText("This is an error")).toBeTruthy();
    });

    it("should prioritize error text over helper text", () => {
      const { getByText, queryByText } = render(
        <NumberInput
          {...defaultProps}
          helperText="This is helpful"
          error="This is an error"
        />
      );

      expect(getByText("This is an error")).toBeTruthy();
      expect(queryByText("This is helpful")).toBeNull();
    });
  });

  describe("text input handling", () => {
    it("should call onChangeText when text changes", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "15");

      expect(onChangeText).toHaveBeenCalledWith("15");
    });

    it("should clean non-numeric characters", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "12abc34");

      expect(onChangeText).toHaveBeenCalledWith("1234");
    });

    it("should allow decimal points", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "12.34");

      expect(onChangeText).toHaveBeenCalledWith("12.34");
    });

    it("should allow negative numbers", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "-12.5");

      expect(onChangeText).toHaveBeenCalledWith("-12.5");
    });

    it("should remove multiple decimal points", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "12.34.56");

      expect(onChangeText).toHaveBeenCalledWith("12.3456");
    });

    it("should handle multiple minus signs", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "--12-34");

      expect(onChangeText).toHaveBeenCalledWith("-1234");
    });

    it("should remove minus sign if not at beginning", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "12-34");

      expect(onChangeText).toHaveBeenCalledWith("1234");
    });

    it("should enforce minimum bounds", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} min={5} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "3");

      expect(onChangeText).toHaveBeenCalledWith("5");
    });

    it("should enforce maximum bounds", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} max={20} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "25");

      expect(onChangeText).toHaveBeenCalledWith("20");
    });

    it("should allow partial input like minus sign only", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "-");

      expect(onChangeText).toHaveBeenCalledWith("-");
    });

    it("should allow partial input like decimal point only", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), ".");

      expect(onChangeText).toHaveBeenCalledWith(".");
    });

    it("should not enforce bounds on partial input", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} min={10} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "-");

      expect(onChangeText).toHaveBeenCalledWith("-");
    });
  });

  describe("step controls", () => {
    it("should render step buttons when min or max is provided", () => {
      const { getByTestId } = render(
        <NumberInput {...defaultProps} min={0} max={100} />
      );

      // Should render both step up and step down buttons
      expect(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("step-up"))
      ).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("step-down"))
      ).toBeTruthy();
    });

    it("should not render step buttons when no min or max", () => {
      const { queryByTestId } = render(<NumberInput {...defaultProps} />);

      expect(
        queryByTestId(TEST_IDS.patterns.touchableOpacityAction("step-up"))
      ).toBeNull();
      expect(
        queryByTestId(TEST_IDS.patterns.touchableOpacityAction("step-down"))
      ).toBeNull();
    });

    it("should step up by step amount", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          onChangeText={onChangeText}
          min={0}
          max={100}
          step={1}
          precision={0}
        />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      fireEvent.press(stepUpButton);

      expect(onChangeText).toHaveBeenCalledWith("11"); // 10 + 1
    });

    it("should step down by step amount", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          onChangeText={onChangeText}
          min={0}
          max={100}
          step={1}
          precision={0}
        />
      );

      const stepDownButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-down")
      );
      fireEvent.press(stepDownButton);

      expect(onChangeText).toHaveBeenCalledWith("9"); // 10 - 1
    });

    it("should respect precision in step operations", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          value="10.5"
          onChangeText={onChangeText}
          min={0}
          max={100}
          step={0.1}
          precision={2}
        />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      fireEvent.press(stepUpButton);

      expect(onChangeText).toHaveBeenCalledWith("10.60"); // 10.5 + 0.1 with 2 decimal places
    });

    it("should not step above maximum", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          value="99"
          onChangeText={onChangeText}
          min={0}
          max={100}
          step={5}
          precision={0}
        />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      fireEvent.press(stepUpButton);

      expect(onChangeText).toHaveBeenCalledWith("100"); // Should cap at max
    });

    it("should not step below minimum", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          value="2"
          onChangeText={onChangeText}
          min={0}
          max={100}
          step={5}
          precision={0}
        />
      );

      const stepDownButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-down")
      );
      fireEvent.press(stepDownButton);

      expect(onChangeText).toHaveBeenCalledWith("0"); // Should cap at min
    });

    it("should handle invalid current value in step operations", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          value=""
          onChangeText={onChangeText}
          min={0}
          max={100}
          step={1}
          precision={0}
        />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      fireEvent.press(stepUpButton);

      expect(onChangeText).toHaveBeenCalledWith("1"); // Should treat empty as 0
    });

    it("should disable step buttons when at bounds", () => {
      const { getByTestId } = render(
        <NumberInput {...defaultProps} value="100" min={0} max={100} />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      expect(stepUpButton.props.disabled).toBe(true);
    });
  });

  describe("unit handling", () => {
    it("should render unit without press handler", () => {
      const { getByText } = render(
        <NumberInput {...defaultProps} unit="gal" />
      );

      expect(getByText("gal")).toBeTruthy();
    });

    it("should render unit with press handler and icon", () => {
      const onUnitPress = jest.fn();
      const { getByText, getByTestId } = render(
        <NumberInput {...defaultProps} unit="gal" onUnitPress={onUnitPress} />
      );

      expect(getByText("gal")).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("unit"))
      ).toBeTruthy();
    });

    it("should call onUnitPress when unit is pressed", () => {
      const onUnitPress = jest.fn();
      const { getByTestId } = render(
        <NumberInput {...defaultProps} unit="gal" onUnitPress={onUnitPress} />
      );

      const unitButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("unit")
      );
      fireEvent.press(unitButton);

      expect(onUnitPress).toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("should disable text input when disabled", () => {
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} disabled={true} />
      );

      const input = getByDisplayValue("10");
      expect(input.props.editable).toBe(false);
    });

    it("should disable step buttons when disabled", () => {
      const { getByTestId } = render(
        <NumberInput {...defaultProps} disabled={true} min={0} max={100} />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      const stepDownButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-down")
      );

      expect(stepUpButton.props.disabled).toBe(true);
      expect(stepDownButton.props.disabled).toBe(true);
    });

    it("should disable unit button when disabled", () => {
      const onUnitPress = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          disabled={true}
          unit="gal"
          onUnitPress={onUnitPress}
        />
      );

      const unitButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("unit")
      );

      expect(unitButton.props.disabled).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle very large numbers", () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <NumberInput {...defaultProps} onChangeText={onChangeText} />
      );

      fireEvent.changeText(getByDisplayValue("10"), "999999999");

      expect(onChangeText).toHaveBeenCalledWith("999999999");
    });

    it("should handle decimal precision edge cases", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          value="0.99"
          onChangeText={onChangeText}
          min={0}
          max={1}
          step={0.01}
          precision={3}
        />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      fireEvent.press(stepUpButton);

      expect(onChangeText).toHaveBeenCalledWith("1.000"); // Should cap at max with precision
    });

    it("should handle step operations with default step", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NumberInput
          {...defaultProps}
          value="5"
          onChangeText={onChangeText}
          min={0}
          max={100}
          // No step provided, should use default 0.1
        />
      );

      const stepUpButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("step-up")
      );
      fireEvent.press(stepUpButton);

      expect(onChangeText).toHaveBeenCalledWith("5.10"); // 5 + 0.1 with precision 2
    });
  });
});
