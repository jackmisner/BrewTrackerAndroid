/**
 * Root Layout Tests
 *
 * Simple root layout component test
 */

import React from "react";
import { render } from "@testing-library/react-native";
import RootLayout from "../../app/_layout";

beforeEach(() => {
  jest.clearAllMocks();
});

// Mock all dependencies following our established patterns
jest.mock("expo-status-bar", () => ({
  StatusBar: () => {
    const React = require("react");
    return React.createElement(React.Fragment, null);
  },
}));

jest.mock("expo-router", () => {
  const React = require("react");

  const MockStack = ({ children }: any) => {
    return React.createElement(React.Fragment, null, children);
  };

  MockStack.Screen = () => {
    return React.createElement(React.Fragment, null);
  };

  return {
    Stack: MockStack,
    Slot: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    SplashScreen: {
      hideAsync: jest.fn().mockResolvedValue(undefined),
      preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
    },
    useSegments: jest.fn(() => []),
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
  };
});

jest.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }: any) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock("@contexts/AuthContext", () => ({
  AuthProvider: ({ children }: any) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock("@contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: any) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
  useTheme: () => ({
    isDark: false,
  }),
}));

jest.mock("@contexts/UnitContext", () => ({
  UnitProvider: ({ children }: any) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock("@services/api/queryClient", () => {
  // Minimal no-op stub to satisfy typical QueryClient uses if accessed
  const stub = {
    clear: () => {},
    cancelQueries: async () => {},
    invalidateQueries: async () => {},
    resetQueries: async () => {},
  };
  return { queryClient: stub };
});

describe("RootLayout", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<RootLayout />);
    }).not.toThrow();
  });
});
