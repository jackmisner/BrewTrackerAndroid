/**
 * BrewSessions Modals Layout Tests
 */

import React from "react";
import { render } from "@testing-library/react-native";
import BrewSessionsModalsLayout from "../../../../app/(modals)/(brewSessions)/_layout";

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

describe("BrewSessionsModalsLayout", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<BrewSessionsModalsLayout />);
    }).not.toThrow();
  });
});