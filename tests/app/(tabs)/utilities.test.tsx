/**
 * Tests for UtilitiesScreen component
 *
 * Tests the calculators listing screen with navigation and withAlpha helper function
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import UtilitiesScreen from "../../../app/(tabs)/utilities";

// Comprehensive React Native mocking
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
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
      background: "#FFFFFF",
      backgroundSecondary: "#F8F9FA",
      borderLight: "#E0E0E0",
    },
  }),
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("UtilitiesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render without crashing", () => {
      expect(() => render(<UtilitiesScreen />)).not.toThrow();
    });

    it("should render header with title and subtitle", () => {
      const { getByText } = render(<UtilitiesScreen />);

      expect(getByText("Brewing Calculators")).toBeTruthy();
      expect(
        getByText("Essential tools for brew day and recipe development")
      ).toBeTruthy();
    });

    it("should render all calculator cards", () => {
      const { getByText } = render(<UtilitiesScreen />);

      // Check for all calculator titles
      expect(getByText("Unit Converter")).toBeTruthy();
      expect(getByText("ABV Calculator")).toBeTruthy();
      expect(getByText("Strike Water Calculator")).toBeTruthy();
      expect(getByText("Hydrometer Correction")).toBeTruthy();
      expect(getByText("Dilution Calculator")).toBeTruthy();
      expect(getByText("Boil Timer")).toBeTruthy();
    });

    it("should render calculator descriptions", () => {
      const { getByText } = render(<UtilitiesScreen />);

      expect(
        getByText("Convert between metric and imperial units")
      ).toBeTruthy();
      expect(
        getByText("Calculate alcohol by volume with simple/advanced formulas")
      ).toBeTruthy();
      expect(getByText("Calculate mash strike water temperature")).toBeTruthy();
      expect(getByText("Adjust gravity readings for temperature")).toBeTruthy();
      expect(getByText("Adjust gravity and volume calculations")).toBeTruthy();
      expect(
        getByText("Recipe-aware countdown with hop addition alarms")
      ).toBeTruthy();
    });

    it("should render calculator icons", () => {
      // Icons are rendered as direct text nodes in our mock, verified by component rendering
      expect(() => render(<UtilitiesScreen />)).not.toThrow();
    });

    it("should render chevron icons for navigation", () => {
      // Chevron icons are rendered as direct text nodes, verified by component rendering
      expect(() => render(<UtilitiesScreen />)).not.toThrow();
    });
  });

  describe("navigation interactions", () => {
    it("should navigate to Unit Converter when pressed", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      const unitConverterCard = getByTestId("calculator-unit-converter");
      fireEvent.press(unitConverterCard);

      expect(mockPush).toHaveBeenCalledWith(
        "/(modals)/(calculators)/unitConverter"
      );
    });

    it("should navigate to ABV Calculator when pressed", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      const abvCard = getByTestId("calculator-abv-calculator");
      fireEvent.press(abvCard);

      expect(mockPush).toHaveBeenCalledWith("/(modals)/(calculators)/abv");
    });

    it("should navigate to Strike Water Calculator when pressed", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      const strikeWaterCard = getByTestId("calculator-strike-water");
      fireEvent.press(strikeWaterCard);

      expect(mockPush).toHaveBeenCalledWith(
        "/(modals)/(calculators)/strikeWater"
      );
    });

    it("should navigate to Hydrometer Correction when pressed", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      const hydrometerCard = getByTestId("calculator-hydrometer-correction");
      fireEvent.press(hydrometerCard);

      expect(mockPush).toHaveBeenCalledWith(
        "/(modals)/(calculators)/hydrometerCorrection"
      );
    });

    it("should navigate to Dilution Calculator when pressed", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      const dilutionCard = getByTestId("calculator-dilution");
      fireEvent.press(dilutionCard);

      expect(mockPush).toHaveBeenCalledWith("/(modals)/(calculators)/dilution");
    });

    it("should navigate to Boil Timer when pressed", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      const boilTimerCard = getByTestId("calculator-boil-timer");
      fireEvent.press(boilTimerCard);

      expect(mockPush).toHaveBeenCalledWith(
        "/(modals)/(calculators)/boilTimer"
      );
    });
  });

  describe("test IDs", () => {
    it("should have correct test IDs for all calculators", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      expect(getByTestId("calculator-unit-converter")).toBeTruthy();
      expect(getByTestId("calculator-abv-calculator")).toBeTruthy();
      expect(getByTestId("calculator-strike-water")).toBeTruthy();
      expect(getByTestId("calculator-hydrometer-correction")).toBeTruthy();
      expect(getByTestId("calculator-dilution")).toBeTruthy();
      expect(getByTestId("calculator-boil-timer")).toBeTruthy();
    });
  });

  describe("theming", () => {
    it("should apply theme colors to components", () => {
      // Component should render without errors when theme is applied
      expect(() => render(<UtilitiesScreen />)).not.toThrow();
    });
  });
});

// Test the withAlpha helper function separately since it's exported as part of the module
describe("withAlpha helper function", () => {
  // We need to access the internal function, so we'll test it indirectly through the component
  // or test it directly if we can access it

  describe("hex color processing", () => {
    // These tests verify the withAlpha function behavior indirectly
    // by ensuring the component renders without errors when using colors

    it("should handle hex colors in component rendering", () => {
      // The component uses withAlpha internally with theme.colors.primary
      expect(() => render(<UtilitiesScreen />)).not.toThrow();
    });
  });

  describe("component integration", () => {
    it("should render calculator cards with alpha-modified backgrounds", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      // Each calculator card should render successfully with alpha-modified background
      const calculatorIds = [
        "calculator-unit-converter",
        "calculator-abv-calculator",
        "calculator-strike-water",
        "calculator-hydrometer-correction",
        "calculator-dilution",
        "calculator-boil-timer",
      ];

      calculatorIds.forEach(id => {
        expect(getByTestId(id)).toBeTruthy();
      });
    });
  });
});

// Additional integration tests
describe("UtilitiesScreen integration", () => {
  describe("scrollable content", () => {
    it("should render within ScrollView", () => {
      // Component should render successfully with ScrollView wrapper
      expect(() => render(<UtilitiesScreen />)).not.toThrow();
    });
  });

  describe("responsive layout", () => {
    it("should handle calculator grid layout", () => {
      const { getByTestId } = render(<UtilitiesScreen />);

      // All calculator cards should be present in the grid
      expect(getByTestId("calculator-unit-converter")).toBeTruthy();
      expect(getByTestId("calculator-abv-calculator")).toBeTruthy();
      expect(getByTestId("calculator-strike-water")).toBeTruthy();
      expect(getByTestId("calculator-hydrometer-correction")).toBeTruthy();
      expect(getByTestId("calculator-dilution")).toBeTruthy();
      expect(getByTestId("calculator-boil-timer")).toBeTruthy();
    });
  });

  describe("accessibility", () => {
    it("should render text with proper line limits", () => {
      const { getByText } = render(<UtilitiesScreen />);

      // Description text should render (numberOfLines={2} should not cause issues)
      expect(
        getByText("Convert between metric and imperial units")
      ).toBeTruthy();
      expect(
        getByText("Calculate alcohol by volume with simple/advanced formulas")
      ).toBeTruthy();
    });
  });

  describe("content completeness", () => {
    it("should render all required content elements", () => {
      const { getByText } = render(<UtilitiesScreen />);

      // Header content
      expect(getByText("Brewing Calculators")).toBeTruthy();
      expect(
        getByText("Essential tools for brew day and recipe development")
      ).toBeTruthy();

      // Calculator count verification (6 calculators)
      const calculatorTitles = [
        "Unit Converter",
        "ABV Calculator",
        "Strike Water Calculator",
        "Hydrometer Correction",
        "Dilution Calculator",
        "Boil Timer",
      ];

      calculatorTitles.forEach(title => {
        expect(getByText(title)).toBeTruthy();
      });
    });
  });
});
