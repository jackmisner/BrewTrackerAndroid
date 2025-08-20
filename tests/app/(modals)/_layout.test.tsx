/**
 * Modals Layout Tests
 */

import React from "react";
import { render } from "@testing-library/react-native";
import ModalsLayout from "../../../app/(modals)/_layout";

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

describe("ModalsLayout", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<ModalsLayout />);
    }).not.toThrow();
  });
});
