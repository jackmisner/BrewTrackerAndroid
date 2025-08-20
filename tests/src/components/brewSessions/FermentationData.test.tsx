/**
 * FermentationData Component Test Suite
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { FermentationData } from "@src/components/brewSessions/FermentationData";

// Mock external dependencies
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      background: "#FFFFFF",
      card: "#F2F2F7",
      text: "#000000",
      secondary: "#8E8E93",
    },
  }),
}));

jest.mock("@src/components/ui/ContextMenu/BaseContextMenu", () => ({
  useContextMenu: () => ({
    visible: false,
    selectedItem: null,
    position: null,
    showMenu: jest.fn(),
    hideMenu: jest.fn(),
  }),
}));

jest.mock("@src/components/brewSessions/FermentationEntryContextMenu", () => ({
  FermentationEntryContextMenu: () => null,
}));

describe("FermentationData", () => {
  const defaultProps = {
    fermentationData: [],
    expectedFG: 1.01,
    actualOG: 1.05,

    temperatureUnit: "C",
    brewSessionId: "session-123",
  };

  it("should render without crashing", () => {
    expect(() => {
      render(<FermentationData {...defaultProps} />);
    }).not.toThrow();
  });
});
