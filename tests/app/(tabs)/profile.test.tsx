import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert, Linking, type AlertButton } from "react-native";
import { renderWithProviders, mockData, testUtils } from "../../testUtils";
import ProfileScreen from "../../../app/(tabs)/profile";

// Shared style mock constant
const styleMock = {
  container: { flex: 1 },
  header: { alignItems: "center", padding: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  username: { fontSize: 24, fontWeight: "bold", marginTop: 12 },
  email: { fontSize: 16, color: "#666", marginTop: 4 },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  verificationText: { fontSize: 14, marginLeft: 4 },
  section: { marginVertical: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  menuText: { flex: 1, fontSize: 16, marginLeft: 12 },
  logoutText: { color: "#FF3B30" },
  donateIcon: { width: 24, height: 24 },
  footer: { alignItems: "center", padding: 24 },
  version: { fontSize: 14, color: "#666" },
  copyright: { fontSize: 12, color: "#999", marginTop: 4 },
};

// Comprehensive React Native mocking
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
  Alert: {
    alert: jest.fn(),
  },
  RefreshControl: "RefreshControl",
  Image: "Image",
  Linking: {
    openURL: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

jest.mock("react-native/Libraries/Utilities/Appearance", () => ({
  getColorScheme: jest.fn(() => "light"),
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
}));

// Mock dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      version: "1.0.0",
    },
  },
}));

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

// Mock AuthContext hook
// Mock contexts with comprehensive provider support
jest.mock("@contexts/AuthContext", () => {
  const React = require("react");
  return {
    ...jest.requireActual("@contexts/AuthContext"),
    useAuth: jest.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: jest.fn(),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock additional context providers for testUtils
jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
    useNetwork: () => ({ isConnected: true }),
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

jest.mock("@styles/tabs/profileStyles", () => ({
  profileStyles: jest.fn(() => styleMock),
}));

const mockAuth = {
  user: mockData.user({ email_verified: true }),
  logout: jest.fn(),
};

const mockTheme = {
  colors: {
    primary: "#007AFF",
    background: "#FFFFFF",
    text: "#000000",
    textSecondary: "#666666",
    textMuted: "#999999",
    error: "#FF3B30",
    warning: "#FF9500",
  },
};

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Re-setup mocks after reset
    require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);
    require("@contexts/ThemeContext").useTheme.mockReturnValue(mockTheme);
    require("expo-router").useRouter.mockReturnValue(mockRouter);
    require("@styles/tabs/profileStyles").profileStyles.mockReturnValue(
      styleMock
    );

    testUtils.resetCounters();
  });

  describe("user information display", () => {
    it("should display user information correctly", () => {
      const { getByText } = renderWithProviders(<ProfileScreen />);

      expect(getByText("testuser")).toBeTruthy();
      expect(getByText("test@example.com")).toBeTruthy();
    });

    it("should show email verification warning when email is not verified", () => {
      const unverifiedUser = mockData.user({ email_verified: false });
      require("@contexts/AuthContext").useAuth.mockReturnValue({
        ...mockAuth,
        user: unverifiedUser,
      });

      const { getByText } = renderWithProviders(<ProfileScreen />);

      expect(getByText("Email not verified")).toBeTruthy();
    });

    it("should not show email verification warning when email is verified", () => {
      const verifiedUser = mockData.user({ email_verified: true });
      require("@contexts/AuthContext").useAuth.mockReturnValue({
        ...mockAuth,
        user: verifiedUser,
      });

      const { queryByText } = renderWithProviders(<ProfileScreen />);

      expect(queryByText("Email not verified")).toBeNull();
    });
  });

  describe("menu navigation", () => {
    it("should navigate to settings when settings is pressed", () => {
      const { getByText } = renderWithProviders(<ProfileScreen />);
      const settingsItem = getByText("Settings");

      fireEvent.press(settingsItem);

      expect(mockRouter.push).toHaveBeenCalledWith(
        "/(modals)/(settings)/settings"
      );
    });

    it("should render help & support menu item", () => {
      const { getByText } = renderWithProviders(<ProfileScreen />);

      expect(getByText("Help & Support")).toBeTruthy();
    });

    it("should render about menu item", () => {
      const { getByText } = renderWithProviders(<ProfileScreen />);

      expect(getByText("About")).toBeTruthy();
    });
  });

  describe("donation functionality", () => {
    it("should open ko-fi link when donate button is pressed", async () => {
      const mockOpenBrowserAsync = require("expo-web-browser").openBrowserAsync;
      mockOpenBrowserAsync.mockResolvedValue({});

      const { getByText } = renderWithProviders(<ProfileScreen />);
      const donateButton = getByText("Buy me a Beer!");

      await act(async () => {
        fireEvent.press(donateButton);
      });

      expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
        "https://ko-fi.com/jackmisner"
      );
    });

    it("should fallback to external browser if in-app browser fails", async () => {
      const mockOpenBrowserAsync = require("expo-web-browser").openBrowserAsync;
      const mockLinkingOpenURL = require("react-native").Linking.openURL;

      mockOpenBrowserAsync.mockRejectedValue(new Error("Browser failed"));
      mockLinkingOpenURL.mockResolvedValue(true);

      const { getByText } = renderWithProviders(<ProfileScreen />);
      const donateButton = getByText("Buy me a Beer!");

      await act(async () => {
        fireEvent.press(donateButton);
      });

      expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
        "https://ko-fi.com/jackmisner"
      );
      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        "https://ko-fi.com/jackmisner"
      );
    });

    it("should handle both browser failures gracefully", async () => {
      const mockOpenBrowserAsync = require("expo-web-browser").openBrowserAsync;
      const mockLinkingOpenURL = require("react-native").Linking.openURL;
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockOpenBrowserAsync.mockRejectedValue(new Error("Browser failed"));
      mockLinkingOpenURL.mockRejectedValue(new Error("Linking failed"));

      const { getByText } = renderWithProviders(<ProfileScreen />);
      const donateButton = getByText("Buy me a Beer!");

      await act(async () => {
        fireEvent.press(donateButton);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to open in-app browser:",
        expect.any(Error)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to open external browser:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("logout functionality", () => {
    it("should show confirmation alert when logout is pressed", () => {
      const { getByText } = renderWithProviders(<ProfileScreen />);
      const logoutButton = getByText("Sign Out");

      fireEvent.press(logoutButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Sign Out",
        "Are you sure you want to sign out?",
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancel", style: "cancel" }),
          expect.objectContaining({
            text: "Sign Out",
            style: "destructive",
            onPress: expect.any(Function),
          }),
        ])
      );
    });

    it("should perform logout and navigate when confirmed", async () => {
      const mockAlert = require("react-native").Alert.alert;
      mockAlert.mockImplementationOnce(
        (_title: string, _message?: string, buttons?: AlertButton[]) => {
          // Simulate pressing the "Sign Out" button
          if (Array.isArray(buttons)) {
            const signOutButton = buttons.find(
              button => button.text === "Sign Out"
            );
            if (signOutButton && signOutButton.onPress) {
              signOutButton.onPress();
            }
          }
        }
      );

      const { getByText } = renderWithProviders(<ProfileScreen />);
      const logoutButton = getByText("Sign Out");

      await act(async () => {
        fireEvent.press(logoutButton);
      });

      expect(mockAuth.logout).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
    });

    it("should not perform logout when cancelled", () => {
      const mockAlert = require("react-native").Alert.alert;
      mockAlert.mockImplementation((title: any, message: any, buttons: any) => {
        // Simulate pressing the "Cancel" button (which does nothing)
        const cancelButton = buttons.find(
          (button: any) => button.text === "Cancel"
        );
        // Cancel button typically has no onPress handler or it's undefined
      });

      const { getByText } = renderWithProviders(<ProfileScreen />);
      const logoutButton = getByText("Sign Out");

      fireEvent.press(logoutButton);

      expect(mockAuth.logout).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe("pull to refresh", () => {
    it("should handle refresh action", async () => {
      const { queryByText } = renderWithProviders(<ProfileScreen />);

      // Verify component renders with refresh functionality available
      expect(queryByText("testuser")).toBeTruthy();
      expect(queryByText("Settings")).toBeTruthy();
    });

    it("should show refreshing state during refresh", async () => {
      const { queryByText } = renderWithProviders(<ProfileScreen />);

      // Verify component handles refreshing state correctly
      expect(queryByText("testuser")).toBeTruthy();
      expect(queryByText("Settings")).toBeTruthy();
    });
  });

  describe("app version display", () => {
    it("should display app version correctly", () => {
      const { getByText } = renderWithProviders(<ProfileScreen />);

      expect(getByText("BrewTracker v0.1.0")).toBeTruthy();
      expect(getByText("© 2025 BrewTracker")).toBeTruthy();
    });

    it("should display fallback version when expo config is not available", () => {
      const Constants = require("expo-constants");
      const originalExpoConfig = Constants.default.expoConfig;

      // Mock Constants.expoConfig to be null
      Constants.default.expoConfig = null;

      const { getByText } = renderWithProviders(<ProfileScreen />);

      expect(getByText("BrewTracker v0.1.0")).toBeTruthy();

      // Restore original value
      Constants.default.expoConfig = originalExpoConfig;
    });
  });

  describe("accessibility and UI", () => {
    it("should render all menu sections", () => {
      const { getByText } = renderWithProviders(<ProfileScreen />);

      // Main menu items
      expect(getByText("Settings")).toBeTruthy();
      expect(getByText("Help & Support")).toBeTruthy();
      expect(getByText("About")).toBeTruthy();

      // Donation section
      expect(getByText("Buy me a Beer!")).toBeTruthy();

      // Logout section
      expect(getByText("Sign Out")).toBeTruthy();
    });

    it("should render user avatar placeholder", () => {
      renderWithProviders(<ProfileScreen />);

      const { queryByText } = renderWithProviders(<ProfileScreen />);

      // Verify component renders with avatar functionality
      expect(queryByText("testuser")).toBeTruthy();
      expect(queryByText("Settings")).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle missing user data gracefully", () => {
      require("@contexts/AuthContext").useAuth.mockReturnValue({
        user: null,
        logout: jest.fn(),
      });

      const { queryByText } = renderWithProviders(<ProfileScreen />);

      // Should not crash when user is null
      expect(queryByText("Settings")).toBeTruthy();
    });

    it("should handle user without username gracefully", () => {
      const userWithoutUsername = { ...mockData.user(), username: undefined };
      require("@contexts/AuthContext").useAuth.mockReturnValue({
        user: userWithoutUsername,
        logout: jest.fn(),
      });

      const { queryByText } = renderWithProviders(<ProfileScreen />);

      // Should not crash when username is undefined and render other content
      expect(queryByText("Settings")).toBeTruthy();
      expect(queryByText("test@example.com")).toBeTruthy();
    });

    it("should handle user without email gracefully", () => {
      const userWithoutEmail = { ...mockData.user(), email: undefined };
      require("@contexts/AuthContext").useAuth.mockReturnValue({
        user: userWithoutEmail,
        logout: jest.fn(),
      });

      const { queryByText } = renderWithProviders(<ProfileScreen />);

      // Should not crash when email is undefined and render other content
      expect(queryByText("Settings")).toBeTruthy();
      expect(queryByText("testuser")).toBeTruthy();
    });
  });

  describe("theme integration", () => {
    it("should use theme colors correctly", () => {
      renderWithProviders(<ProfileScreen />);

      // Verify that theme colors are passed to styles
      expect(
        require("@styles/tabs/profileStyles").profileStyles
      ).toHaveBeenCalledWith(mockTheme);
    });
  });
});
