/**
 * Settings Modals Layout Tests
 */

import React from "react";
import { render } from "@testing-library/react-native";
import SettingsModalsLayout from "../../../../app/(modals)/(settings)/_layout";

// Mock expo-router Stack with Screen component
jest.mock("expo-router", () => {
  const React = require("react");

  const MockStack = ({ children, ...props }: any) => {
    return React.createElement("Stack", props, children);
  };

  MockStack.Screen = ({ name, ...props }: any) => {
    return React.createElement("Screen", { name, ...props });
  };

  return {
    Stack: MockStack,
  };
});

describe("SettingsModalsLayout", () => {
  it("should render layout component successfully", () => {
    // Layout components primarily serve as navigation structure
    // Testing that they render without errors is sufficient for these simple wrappers
    expect(() => {
      render(<SettingsModalsLayout />);
    }).not.toThrow();
  });
});
