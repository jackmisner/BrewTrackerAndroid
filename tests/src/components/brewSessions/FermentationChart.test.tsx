/**
 * FermentationChart Component Test Suite
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { FermentationChart } from "../../../../src/components/brewSessions/FermentationChart";

// Mock React Native components
jest.mock("react-native", () => ({
  View: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("View", props, children);
  },
  Text: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("Text", props, children);
  },
  TouchableOpacity: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("TouchableOpacity", props, children);
  },
  StyleSheet: {
    create: jest.fn(styles => styles),
    create: jest.fn(styles => styles),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    removeEventListener: jest.fn(),
  },
}));

// Mock the chart library
jest.mock("react-native-gifted-charts", () => {
  const React = require("react");
  return {
    LineChart: jest.fn(({ data, ...props }: any) =>
      React.createElement("LineChart", { data, ...props })
    ),
  };
});

// Mock external dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      background: "#FFFFFF",
      card: "#F2F2F7",
      text: "#000000",
      secondary: "#8E8E93",
      error: "#FF3B30",
      border: "#E5E5EA",
      textSecondary: "#8E8E93",
      gravityLine: "#007AFF",
      temperatureLine: "#FF9500",
    },
  }),
}));

jest.mock("@contexts/UnitContext", () => ({
  useUnits: () => ({
    unitSystem: "imperial",
    temperatureUnit: "F",
    getTemperatureSymbol: jest.fn(() => "°F"),
  }),
}));

// Mock props for the component
const mockFermentationData = [
  {
    gravity: 1.045,
    temperature: 68,
    ph: 4.2,
    notes: "Initial reading",
    entry_date: "2023-12-01T10:00:00Z",
  },
  {
    gravity: 1.02,
    gravity: 1.02,
    temperature: 70,
    ph: 4.0,
    notes: "Day 3",
    entry_date: "2023-12-04T10:00:00Z",
  },
];

describe("FermentationChart", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(
        <FermentationChart
          fermentationData={mockFermentationData}
          expectedFG={1.012}
          actualOG={1.045}
          temperatureUnit="F"
        />
      );
    }).not.toThrow();
  });

  it("should render with empty data", () => {
    expect(() => {
      render(<FermentationChart fermentationData={[]} />);
    }).not.toThrow();
  });
});
