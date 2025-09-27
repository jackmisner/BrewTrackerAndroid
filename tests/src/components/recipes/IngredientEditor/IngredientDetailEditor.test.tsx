/**
 * IngredientDetailEditor Component Test Suite
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { IngredientDetailEditor } from "../../../../../src/components/recipes/IngredientEditor/IngredientDetailEditor";

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
  TextInput: (props: any) => {
    const React = require("react");
    return React.createElement("TextInput", props);
  },
  TouchableOpacity: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("TouchableOpacity", props, children);
  },
  TouchableWithoutFeedback: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("TouchableWithoutFeedback", props, children);
  },
  ScrollView: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("ScrollView", props, children);
  },
  Modal: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("Modal", props, children);
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Alert: { alert: jest.fn() },
  Keyboard: { dismiss: jest.fn() },
}));

// Mock external dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name, size, color, ...props }: any) => {
    const React = require("react");
    return React.createElement("MaterialIcons", {
      name,
      size,
      color,
      ...props,
    });
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
      error: "#FF3B30",
      border: "#E5E5EA",
      textSecondary: "#8E8E93",
    },
  }),
}));

jest.mock("@contexts/UnitContext", () => ({
  useUnits: () => ({
    unitSystem: "imperial",
  }),
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    getUserId: jest.fn(() => Promise.resolve("test-user-id")),
  }),
}));

jest.mock("@src/types", () => ({
  RecipeIngredient: {},
  IngredientType: {},
}));

jest.mock("@styles/recipes/ingredientDetailEditorStyles", () => ({
  ingredientDetailEditorStyles: () => ({
    container: {},
    header: {},
    title: {},
    content: {},
    field: {},
    label: {},
    input: {},
    button: {},
    row: {},
    presetButton: {},
    presetText: {},
  }),
}));

jest.mock("@constants/hopConstants", () => ({
  HOP_USAGE_OPTIONS: [
    { value: "boil", display: "Boil", defaultTime: 60 },
    { value: "dry-hop", display: "Dry Hop", defaultTime: 1440 * 3 },
    { value: "whirlpool", display: "Whirlpool", defaultTime: 15 },
  ],
  HOP_TIME_PRESETS: {
    boil: [
      { label: "60 min", value: 60 },
      { label: "30 min", value: 30 },
      { label: "15 min", value: 15 },
      { label: "5 min", value: 5 },
      { label: "0 min", value: 0 },
    ],
    "dry-hop": [
      { label: "3 days", value: 3 * 1440 },
      { label: "5 days", value: 5 * 1440 },
      { label: "7 days", value: 7 * 1440 },
    ],
    whirlpool: [
      { label: "15 min", value: 15 },
      { label: "10 min", value: 10 },
      { label: "5 min", value: 5 },
    ],
  },
}));

jest.mock("@utils/formatUtils", () => ({
  getHopTimePlaceholder: jest.fn(() => "60 min"),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@utils/keyUtils", () => ({
  generateIngredientKey: jest.fn(() => "mock-key"),
  generateUniqueId: jest.fn(() => "mock-uuid"),
}));

// Mock props for the component
const mockIngredient = {
  id: "test-ingredient-1",
  name: "Test Ingredient",
  type: "grain" as const,
  amount: 1,
  unit: "oz" as const,
  notes: "",
  instance_id: "mock-uuid",
};

const mockProps = {
  ingredient: mockIngredient,
  onUpdate: jest.fn(),
  onCancel: jest.fn(),
  onRemove: jest.fn(),
  isVisible: true,
};

describe("IngredientDetailEditor", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<IngredientDetailEditor {...mockProps} />);
    }).not.toThrow();
  });
});
