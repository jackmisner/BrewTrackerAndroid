/**
 * Recipes Modals Layout Tests
 *
 * Simple recipes modals layout component test - following zero-coverage high-impact strategy
 */

import React from "react";
import { render } from "@testing-library/react-native";
import RecipesModalsLayout from "../../../../app/(modals)/(recipes)/_layout";

// Mock expo-router Stack with Screen component (reusing successful pattern)
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

describe("RecipesModalsLayout", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<RecipesModalsLayout />);
    }).not.toThrow();
  });
});
