/**
 * Tabs Layout Component Test Suite
 */

import React from "react";
import { render } from "@testing-library/react-native";
import TabLayout from "../../../app/(tabs)/_layout";

// Mock expo-router Tabs with Screen component
jest.mock("expo-router", () => {
  const React = require("react");
  
  const MockTabs = ({ children, ...props }: any) => {
    return React.createElement("Tabs", props, children);
  };
  
  MockTabs.Screen = ({ name, ...props }: any) => {
    return React.createElement("Screen", { name, ...props });
  };
  
  return {
    Tabs: MockTabs,
  };
});

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name, size, color, ...props }: any) => {
    const React = require("react");
    return React.createElement("MaterialIcons", { name, size, color, ...props });
  },
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      background: "#FFFFFF",
      textSecondary: "#8E8E93",
      primaryText: "#FFFFFF",
      borderLight: "#E5E5EA",
    },
  }),
}));

describe("TabLayout", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<TabLayout />);
    }).not.toThrow();
  });
});