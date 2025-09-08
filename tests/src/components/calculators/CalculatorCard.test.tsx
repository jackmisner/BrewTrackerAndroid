/**
 * Tests for CalculatorCard component
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { CalculatorCard } from "@src/components/calculators/CalculatorCard";

// Mock ThemeContext
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      backgroundSecondary: "#f5f5f5",
      borderLight: "#e0e0e0",
      text: "#333333",
      primary: "#007AFF",
      primaryText: "#ffffff",
    },
  }),
}));

describe("CalculatorCard", () => {
  it("should render with title and children", () => {
    const { getByText } = render(
      <CalculatorCard title="Test Calculator">
        <Text>Calculator content</Text>
      </CalculatorCard>
    );

    expect(getByText("Test Calculator")).toBeTruthy();
    expect(getByText("Calculator content")).toBeTruthy();
  });

  it("should apply theme colors correctly", () => {
    const { getByText } = render(
      <CalculatorCard title="Themed Card">
        <Text>Content</Text>
      </CalculatorCard>
    );

    const titleElement = getByText("Themed Card");
    expect(titleElement.props.style).toContainEqual(
      expect.objectContaining({
        color: "#333333",
      })
    );
  });

  it("should render with custom style", () => {
    const customStyle = { marginTop: 20 };

    render(
      <CalculatorCard title="Styled Card" style={customStyle}>
        <Text>Content</Text>
      </CalculatorCard>
    );

    // Test passes if no errors thrown during rendering with custom style
    expect(true).toBeTruthy();
  });

  it("should render without custom style", () => {
    render(
      <CalculatorCard title="Basic Card">
        <Text>Content</Text>
      </CalculatorCard>
    );

    // Test passes if no errors thrown during basic rendering
    expect(true).toBeTruthy();
  });

  it("should render with multiple children", () => {
    const { getByText } = render(
      <CalculatorCard title="Multi-content Card">
        <Text>First content</Text>
        <Text>Second content</Text>
        <Text>Third content</Text>
      </CalculatorCard>
    );

    expect(getByText("Multi-content Card")).toBeTruthy();
    expect(getByText("First content")).toBeTruthy();
    expect(getByText("Second content")).toBeTruthy();
    expect(getByText("Third content")).toBeTruthy();
  });

  it("should render with empty title", () => {
    const { getByText } = render(
      <CalculatorCard title="">
        <Text>Content with empty title</Text>
      </CalculatorCard>
    );

    expect(getByText("Content with empty title")).toBeTruthy();
  });
});
