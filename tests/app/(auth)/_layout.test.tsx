/**
 * Auth Layout Tests
 */

import React from "react";
import { render } from "@testing-library/react-native";
import AuthLayout from "../../../app/(auth)/_layout";

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

describe("AuthLayout", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<AuthLayout />);
    }).not.toThrow();
  });
});
