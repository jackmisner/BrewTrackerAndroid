/**
 * FermentationData Component Test Suite
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { FermentationData } from "@src/components/brewSessions/FermentationData";

// Mock React Native components
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => {
      if (styles == null) return {};
      if (!Array.isArray(styles)) return styles;
      const out = {};
      const push = (s: any) => {
        if (!s) return; // skip null/undefined/false
        if (Array.isArray(s)) s.forEach(push);
        else Object.assign(out, s);
      };
      styles.forEach(push);
      return out;
    },
  },
  TouchableOpacity: "TouchableOpacity",
  Pressable: "Pressable",
  FlatList: ({ data, renderItem, keyExtractor }: any) => {
    const React = require("react");
    const RN = require("react-native");
    return React.createElement(
      "View",
      {},
      data?.map((item: any, index: number) => {
        const key = keyExtractor ? keyExtractor(item, index) : index;
        return React.createElement(
          "div",
          { key },
          renderItem ? renderItem({ item, index }) : null
        );
      })
    );
  },
}));

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

  it("should display empty state when no fermentation data", () => {
    const { getByText } = render(<FermentationData {...defaultProps} />);

    expect(getByText("No fermentation entries yet")).toBeTruthy();
  });

  it("should display fermentation data table headers", () => {
    const fermentationData = [
      {
        id: "entry-1",
        date: "2024-01-15T10:30:00Z",
        gravity: 1.02,
        temperature: 20,
        ph: 4.5,
        notes: "Test entry",
      },
    ];

    const props = {
      ...defaultProps,
      fermentationData,
    };

    const { getByText } = render(<FermentationData {...props} />);

    expect(getByText("Date")).toBeTruthy();
    expect(getByText("Gravity")).toBeTruthy();
    expect(getByText("Temp")).toBeTruthy();
    expect(getByText("pH")).toBeTruthy();
  });

  it("should display fermentation entry data", () => {
    const fermentationData = [
      {
        id: "entry-1",
        date: "2024-01-15T10:30:00Z",
        gravity: 1.02,
        temperature: 20,
        ph: 4.5,
        notes: "Test entry",
      },
    ];

    const props = {
      ...defaultProps,
      fermentationData,
    };

    const { getByText } = render(<FermentationData {...props} />);

    expect(getByText("1/15/2024")).toBeTruthy(); // Date formatted
    expect(getByText("1.020")).toBeTruthy(); // Gravity
    expect(getByText("20°C")).toBeTruthy(); // Temperature
    expect(getByText("4.50")).toBeTruthy(); // pH
  });
});
