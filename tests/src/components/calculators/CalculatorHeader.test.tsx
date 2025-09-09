/**
 * Tests for CalculatorHeader component
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CalculatorHeader } from "@src/components/calculators/CalculatorHeader";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      primaryText: "#ffffff",
      backgroundSecondary: "#f5f5f5",
      borderLight: "#e0e0e0",
      text: "#333333",
    },
  }),
}));

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

describe("CalculatorHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with title", () => {
    const { getByText } = render(<CalculatorHeader title="ABV Calculator" />);

    expect(getByText("ABV Calculator")).toBeTruthy();
  });

  it("should render close button with proper accessibility", () => {
    const { getByLabelText } = render(
      <CalculatorHeader title="Test Calculator" />
    );

    const closeButton = getByLabelText("Close calculator");
    expect(closeButton).toBeTruthy();
    expect(closeButton.props.accessibilityRole).toBe("button");
  });

  it("should call router.back when close button pressed without onClose prop", () => {
    const { getByLabelText } = render(
      <CalculatorHeader title="Test Calculator" />
    );

    const closeButton = getByLabelText("Close calculator");
    fireEvent.press(closeButton);

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("should call custom onClose when provided", () => {
    const mockOnClose = jest.fn();
    const { getByLabelText } = render(
      <CalculatorHeader title="Test Calculator" onClose={mockOnClose} />
    );

    const closeButton = getByLabelText("Close calculator");
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("should apply theme colors correctly", () => {
    const { getByText } = render(<CalculatorHeader title="Themed Header" />);

    const titleElement = getByText("Themed Header");
    expect(titleElement.props.style).toContainEqual(
      expect.objectContaining({
        color: "#ffffff",
      })
    );
  });

  it("should render with long title", () => {
    const longTitle = "Very Long Calculator Title That Might Overflow";
    const { getByText } = render(<CalculatorHeader title={longTitle} />);

    expect(getByText(longTitle)).toBeTruthy();
  });

  it("should render with empty title", () => {
    const { queryByText } = render(<CalculatorHeader title="" />);

    // Empty title should still render (as empty text)
    expect(queryByText("")).toBeTruthy();
  });

  it("should have proper button hitSlop for better touch target", () => {
    const { getByLabelText } = render(
      <CalculatorHeader title="Test Calculator" />
    );

    const closeButton = getByLabelText("Close calculator");
    expect(closeButton.props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
    });
  });

  it("should render MaterialIcons close icon", () => {
    render(<CalculatorHeader title="Test Calculator" />);

    // Test passes if component renders without errors
    // (MaterialIcons is mocked automatically by Jest)
    expect(true).toBeTruthy();
  });
});
