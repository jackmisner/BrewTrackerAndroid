/**
 * Root Layout Tests
 */

import React from "react";
import { renderWithProviders } from "../testUtils";
import RootLayout from "../../app/_layout";

beforeEach(() => {
  jest.clearAllMocks();
});

// Mock external dependencies
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

// Mock react-native-safe-area-context native module
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaFrame: () => ({
    x: 0,
    y: 0,
    width: 375,
    height: 812,
  }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock all context providers used by testUtils (Pattern 4)
jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: () => ({
      colors: {
        primary: "#007AFF",
        background: "#FFFFFF",
        surface: "#F2F2F7",
        text: "#000000",
        textSecondary: "#666666",
        border: "#C7C7CC",
      },
      fonts: {
        regular: { fontSize: 16, fontWeight: "400" },
        medium: { fontSize: 16, fontWeight: "500" },
        bold: { fontSize: 16, fontWeight: "700" },
      },
      isDark: false,
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/AuthContext", () => {
  const React = require("react");
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    }),
  };
});

jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
    useNetwork: () => ({
      isConnected: true,
      isInternetReachable: true,
    }),
  };
});

jest.mock("@contexts/DeveloperContext", () => {
  const React = require("react");
  return {
    DeveloperProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useDeveloper: () => ({ isDeveloperMode: false }),
  };
});

jest.mock("@contexts/UnitContext", () => {
  const React = require("react");
  return {
    UnitProvider: ({ children }: { children: React.ReactNode }) => children,
    useUnit: () => ({ temperatureUnit: "F", weightUnit: "lb" }),
  };
});

jest.mock("@contexts/CalculatorsContext", () => {
  const React = require("react");
  return {
    CalculatorsProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useCalculators: () => ({ state: {}, dispatch: jest.fn() }),
  };
});

jest.mock("@contexts/ScreenDimensionsContext", () => {
  const React = require("react");
  return {
    ScreenDimensionsProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useScreenDimensions: () => ({
      dimensions: {
        width: 375,
        height: 812,
        isSmallScreen: false,
        isLandscape: false,
      },
      refreshDimensions: jest.fn(),
    }),
  };
});

// Mock React Query
jest.mock("@tanstack/react-query-persist-client", () => ({
  PersistQueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// All providers are now comprehensively mocked (Pattern 4)

describe("RootLayout", () => {
  it("should render without crashing", () => {
    expect(() => {
      renderWithProviders(<RootLayout />);
    }).not.toThrow();
  });
});
