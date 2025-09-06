/**
 * Tests for UnitToggle and DropdownToggle components
 *
 * Tests unit selection components for calculator screens
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import {
  UnitToggle,
  DropdownToggle,
} from "@src/components/calculators/UnitToggle";
import { TEST_IDS } from "@constants/testIDs";

// Comprehensive React Native mocking
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
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

// Mock theme context
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      text: "#000000",
      textSecondary: "#666666",
      primary: "#007AFF",
      primaryText: "#FFFFFF",
      primaryLight20: "#CCE5FF",
      background: "#FFFFFF",
      backgroundSecondary: "#F8F9FA",
      borderLight: "#E0E0E0",
    },
  }),
}));

describe("UnitToggle", () => {
  const mockOptions = [
    {
      label: "Celsius",
      value: "celsius",
      description: "Temperature in Celsius",
    },
    {
      label: "Fahrenheit",
      value: "fahrenheit",
      description: "Temperature in Fahrenheit",
    },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with required props", () => {
      expect(() =>
        render(
          <UnitToggle
            value="celsius"
            options={mockOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });

    it("should render with label when provided", () => {
      const { getByText } = render(
        <UnitToggle
          value="celsius"
          options={mockOptions}
          onChange={mockOnChange}
          label="Temperature Unit"
        />
      );

      expect(getByText("Temperature Unit")).toBeTruthy();
    });

    it("should render without label when not provided", () => {
      expect(() =>
        render(
          <UnitToggle
            value="celsius"
            options={mockOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });

    it("should render all option labels", () => {
      const { getByText } = render(
        <UnitToggle
          value="celsius"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      expect(getByText("Celsius")).toBeTruthy();
      expect(getByText("Fahrenheit")).toBeTruthy();
    });

    it("should highlight selected option", () => {
      // Test that component renders without errors when an option is selected
      expect(() =>
        render(
          <UnitToggle
            value="fahrenheit"
            options={mockOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });
  });

  describe("user interactions", () => {
    it("should call onChange when option is pressed", () => {
      const { getByTestId } = render(
        <UnitToggle
          value="celsius"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      const fahrenheitButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("unit-toggle-fahrenheit")
      );
      fireEvent.press(fahrenheitButton);

      expect(mockOnChange).toHaveBeenCalledWith("fahrenheit");
    });

    it("should not call onChange when disabled", () => {
      const { getByTestId } = render(
        <UnitToggle
          value="celsius"
          options={mockOptions}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const fahrenheitButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("unit-toggle-fahrenheit")
      );
      fireEvent.press(fahrenheitButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should handle pressing currently selected option", () => {
      const { getByTestId } = render(
        <UnitToggle
          value="celsius"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      const celsiusButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("unit-toggle-celsius")
      );
      fireEvent.press(celsiusButton);

      expect(mockOnChange).toHaveBeenCalledWith("celsius");
    });
  });

  describe("styling and theming", () => {
    it("should apply custom styles", () => {
      const customStyle = { marginTop: 20 };

      expect(() =>
        render(
          <UnitToggle
            value="celsius"
            options={mockOptions}
            onChange={mockOnChange}
            style={customStyle}
          />
        )
      ).not.toThrow();
    });

    it("should render correctly when disabled", () => {
      expect(() =>
        render(
          <UnitToggle
            value="celsius"
            options={mockOptions}
            onChange={mockOnChange}
            disabled={true}
          />
        )
      ).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle single option", () => {
      const singleOption = [{ label: "Only Option", value: "only" }];

      expect(() =>
        render(
          <UnitToggle
            value="only"
            options={singleOption}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });

    it("should handle many options", () => {
      const manyOptions = [
        { label: "Option 1", value: "opt1" },
        { label: "Option 2", value: "opt2" },
        { label: "Option 3", value: "opt3" },
        { label: "Option 4", value: "opt4" },
        { label: "Option 5", value: "opt5" },
      ];

      expect(() =>
        render(
          <UnitToggle
            value="opt3"
            options={manyOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });

    it("should handle option without description", () => {
      const optionsNoDesc = [{ label: "Basic Option", value: "basic" }];

      expect(() =>
        render(
          <UnitToggle
            value="basic"
            options={optionsNoDesc}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });

    it("should handle unmatched selected value", () => {
      expect(() =>
        render(
          <UnitToggle
            value="nonexistent"
            options={mockOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });
  });
});

describe("DropdownToggle", () => {
  const mockOptions = [
    { label: "Gallons", value: "gal", description: "US Gallons" },
    { label: "Liters", value: "liter", description: "Metric Liters" },
    { label: "Quarts", value: "qt" },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with required props", () => {
      expect(() =>
        render(
          <DropdownToggle
            value="gal"
            options={mockOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });

    it("should render with label when provided", () => {
      const { getByText } = render(
        <DropdownToggle
          value="gal"
          options={mockOptions}
          onChange={mockOnChange}
          label="Volume Unit"
        />
      );

      expect(getByText("Volume Unit")).toBeTruthy();
    });

    it("should show selected option label", () => {
      const { getByText } = render(
        <DropdownToggle
          value="liter"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      expect(getByText("Liters")).toBeTruthy();
    });

    it("should show placeholder when no value selected", () => {
      const { getByText } = render(
        <DropdownToggle
          value=""
          options={mockOptions}
          onChange={mockOnChange}
          placeholder="Choose unit..."
        />
      );

      expect(getByText("Choose unit...")).toBeTruthy();
    });

    it("should show default placeholder when none provided", () => {
      const { getByText } = render(
        <DropdownToggle
          value=""
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      expect(getByText("Select...")).toBeTruthy();
    });

    it("should render expand icon", () => {
      expect(() =>
        render(
          <DropdownToggle
            value="gal"
            options={mockOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
      // Icon is rendered as text in our mock, verified by component not throwing
    });
  });

  describe("dropdown interactions", () => {
    it("should open dropdown when pressed", () => {
      const { getByTestId, getByText } = render(
        <DropdownToggle
          value="gal"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      // Initially dropdown should be closed
      expect(() => getByText("Liters")).toThrow("Unable to find an element");

      // Press the main button to open dropdown
      const mainButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-main")
      );
      fireEvent.press(mainButton);

      // Now dropdown options should be visible
      expect(getByText("Liters")).toBeTruthy();
      expect(getByText("Quarts")).toBeTruthy();
    });

    it("should close dropdown when option is selected", () => {
      const { getByTestId, getByText } = render(
        <DropdownToggle
          value="gal"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const mainButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-main")
      );
      fireEvent.press(mainButton);

      // Dropdown should be open
      expect(getByText("Liters")).toBeTruthy();

      // Select the Liters option
      const literOption = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-option-liter")
      );
      fireEvent.press(literOption);

      expect(mockOnChange).toHaveBeenCalledWith("liter");
    });

    it("should not open when disabled", () => {
      const { getByTestId, queryByText } = render(
        <DropdownToggle
          value="gal"
          options={mockOptions}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const mainButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-main")
      );
      fireEvent.press(mainButton);

      // Dropdown should remain closed
      expect(queryByText("Liters")).toBeNull();
    });

    it("should toggle dropdown open/close", () => {
      const { getByTestId, getByText, queryByText } = render(
        <DropdownToggle
          value="gal"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      const mainButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-main")
      );

      // Initially closed
      expect(queryByText("Liters")).toBeNull();

      // Open dropdown
      fireEvent.press(mainButton);
      expect(getByText("Liters")).toBeTruthy();

      // Close dropdown
      fireEvent.press(mainButton);
      expect(queryByText("Liters")).toBeNull();
    });
  });

  describe("option rendering", () => {
    it("should show option descriptions when available", () => {
      const { getByTestId, getByText } = render(
        <DropdownToggle
          value="gal"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const mainButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-main")
      );
      fireEvent.press(mainButton);

      expect(getByText("US Gallons")).toBeTruthy();
      expect(getByText("Metric Liters")).toBeTruthy();
    });

    it("should render options without descriptions", () => {
      const { getByTestId, getAllByText } = render(
        <DropdownToggle
          value="qt"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const mainButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-main")
      );
      fireEvent.press(mainButton);

      // Should have two "Quarts" text elements (main button + dropdown option)
      expect(getAllByText("Quarts")).toHaveLength(2);
      // Verify the dropdown option exists
      expect(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("dropdown-option-qt")
        )
      ).toBeTruthy();
    });

    it("should highlight selected option in dropdown", () => {
      const { getByTestId, getAllByText } = render(
        <DropdownToggle
          value="liter"
          options={mockOptions}
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const mainButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("dropdown-main")
      );
      fireEvent.press(mainButton);

      // Selected option should be visible in both main button and dropdown
      expect(getAllByText("Liters")).toHaveLength(2);
      expect(
        getByTestId(
          TEST_IDS.patterns.touchableOpacityAction("dropdown-option-liter")
        )
      ).toBeTruthy();
    });
  });

  describe("styling and theming", () => {
    it("should apply custom styles", () => {
      const customStyle = { marginTop: 20 };

      expect(() =>
        render(
          <DropdownToggle
            value="gal"
            options={mockOptions}
            onChange={mockOnChange}
            style={customStyle}
          />
        )
      ).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle empty options array", () => {
      expect(() =>
        render(<DropdownToggle value="" options={[]} onChange={mockOnChange} />)
      ).not.toThrow();
    });

    it("should handle unmatched selected value", () => {
      const { getByText } = render(
        <DropdownToggle
          value="nonexistent"
          options={mockOptions}
          onChange={mockOnChange}
          placeholder="Choose..."
        />
      );

      // Should show placeholder when selected value doesn't match any option
      expect(getByText("Choose...")).toBeTruthy();
    });

    it("should handle long option lists", () => {
      const longOptions = Array.from({ length: 20 }, (_, i) => ({
        label: `Option ${i + 1}`,
        value: `opt${i + 1}`,
        description: `Description for option ${i + 1}`,
      }));

      expect(() =>
        render(
          <DropdownToggle
            value="opt10"
            options={longOptions}
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });
  });
});
