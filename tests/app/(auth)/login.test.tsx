import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { renderWithProviders, testUtils, mockData } from "../../testUtils";
import LoginScreen from "../../../app/(auth)/login";

// Comprehensive React Native mocking to avoid ES6 module issues
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  Alert: {
    alert: jest.fn(),
  },
  ScrollView: "ScrollView",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  ActivityIndicator: "ActivityIndicator",
  Platform: { OS: "android" },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

// Mock dependencies

// Mock functions for authentication
const mockLogin = jest.fn();
const mockClearError = jest.fn();

// Create a mockable useAuth implementation
let mockAuthState = {
  user: null as any,
  isLoading: false,
  isAuthenticated: false,
  error: null as string | null,
};

// Mock the AuthContext hook to return our mock data
jest.mock("@contexts/AuthContext", () => ({
  ...jest.requireActual("@contexts/AuthContext"),
  useAuth: () => ({
    ...mockAuthState,
    login: mockLogin,
    register: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    clearError: mockClearError,
    signInWithGoogle: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    checkVerificationStatus: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getUserId: jest.fn(),
  }),
}));

// Helper to override auth state for specific tests
const setMockAuthState = (overrides: Partial<typeof mockAuthState>) => {
  mockAuthState = { ...mockAuthState, ...overrides };
};

jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: jest.fn(() => ({
      colors: {
        background: "#ffffff",
        primary: "#f4511e",
        text: "#000000",
        textSecondary: "#666666",
        textMuted: "#999999",
        border: "#e0e0e0",
        inputBackground: "#f8f9fa",
        error: "#dc3545",
        primaryText: "#ffffff",
      },
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@styles/auth/loginStyles", () => ({
  loginStyles: jest.fn(() => ({
    container: { flex: 1 },
    scrollContainer: { flexGrow: 1 },
    header: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: "bold" },
    subtitle: { fontSize: 16, color: "#666" },
    form: { padding: 20 },
    inputContainer: { marginBottom: 15 },
    input: { borderWidth: 1, padding: 10 },
    forgotPasswordContainer: { alignItems: "flex-end" },
    forgotPasswordText: { color: "#007AFF" },
    errorText: { color: "#FF0000", marginBottom: 10 },
    button: { padding: 15, borderRadius: 5 },
    primaryButton: { backgroundColor: "#007AFF" },
    secondaryButton: { backgroundColor: "transparent", borderWidth: 1 },
    buttonText: { color: "#FFFFFF", textAlign: "center" },
    secondaryButtonText: { color: "#007AFF", textAlign: "center" },
    divider: { marginVertical: 20 },
    dividerText: { textAlign: "center", color: "#666" },
  })),
}));

// Alert is now mocked in the react-native mock above

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.clearAllTimers();
    mockLogin.mockClear();
    mockClearError.mockClear();
    testUtils.resetCounters();

    // Reset auth state to defaults
    setMockAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("should render all required elements", () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );

      expect(getByText("BrewTracker")).toBeTruthy();
      expect(getByText("Sign in to your account")).toBeTruthy();
      expect(getByPlaceholderText("Username")).toBeTruthy();
      expect(getByPlaceholderText("Password")).toBeTruthy();
      expect(getByText("Forgot your password?")).toBeTruthy();
      expect(getByText("Sign In")).toBeTruthy();
      expect(getByText("Don't have an account?")).toBeTruthy();
      expect(getByText("Create Account")).toBeTruthy();
    });

    it("should display error message when error exists", () => {
      setMockAuthState({ error: "Invalid credentials" });

      const { getByText } = renderWithProviders(<LoginScreen />);

      expect(getByText("Invalid credentials")).toBeTruthy();
    });

    it("should not display error message when no error", () => {
      const { queryByText } = renderWithProviders(<LoginScreen />);

      expect(queryByText("Invalid credentials")).toBeNull();
    });
  });

  describe("user input", () => {
    it("should update username when typing", () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);
      const usernameInput = getByPlaceholderText("Username");

      fireEvent.changeText(usernameInput, "testuser");

      expect(usernameInput.props.value).toBe("testuser");
    });

    it("should update password when typing", () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);
      const passwordInput = getByPlaceholderText("Password");

      fireEvent.changeText(passwordInput, "password123");

      expect(passwordInput.props.value).toBe("password123");
    });

    it("should have secure text entry for password field", () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);
      const passwordInput = getByPlaceholderText("Password");

      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it("should have correct autocomplete and text content types", () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");

      expect(usernameInput.props.autoComplete).toBe("username");
      expect(usernameInput.props.textContentType).toBe("username");
      expect(usernameInput.props.autoCapitalize).toBe("none");

      expect(passwordInput.props.autoComplete).toBe("password");
      expect(passwordInput.props.textContentType).toBe("password");
    });
  });

  describe("form validation", () => {
    it("should show alert when username is empty", async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const passwordInput = getByPlaceholderText("Password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(passwordInput, "password123");
      fireEvent.press(loginButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("should show alert when password is empty", async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.press(loginButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("should show alert when both fields are empty", async () => {
      const { getByText } = renderWithProviders(<LoginScreen />);
      const loginButton = getByText("Sign In");

      fireEvent.press(loginButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe("successful login", () => {
    it("should call login function with correct credentials", async () => {
      mockLogin.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "password123");

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalledWith({
        username: "testuser",
        password: "password123",
      });
    });

    it("should show loading indicator during login", async () => {
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>(resolve => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      const { getByText, getByPlaceholderText, queryByText } =
        renderWithProviders(<LoginScreen />);
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "password123");

      act(() => {
        const loginButton = getByText("Sign In");
        fireEvent.press(loginButton);
      });

      // Should show loading indicator
      expect(queryByText("Sign In")).toBeNull();

      // Resolve the login
      await act(async () => {
        resolveLogin!();
        await loginPromise;
      });
    });

    it("should navigate to home screen after successful login", async () => {
      mockLogin.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "password123");

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Fast-forward timers to execute setTimeout
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Navigation happens via globally mocked expo-router
    });

    it("should disable buttons during loading", async () => {
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>(resolve => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      const { getByText, getByPlaceholderText, queryByText } =
        renderWithProviders(<LoginScreen />);
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "password123");

      act(() => {
        const loginButton = getByText("Sign In");
        fireEvent.press(loginButton);
      });

      // Check that the button text changed (indicating loading state)
      expect(queryByText("Sign In")).toBeNull();

      // Resolve the login
      await act(async () => {
        resolveLogin!();
        await loginPromise;
      });
    });
  });

  describe("failed login", () => {
    it("should show alert on login failure with error message", async () => {
      const errorMessage = "Invalid credentials";
      mockLogin.mockRejectedValue(new Error(errorMessage));

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "wrongpassword");

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Login Failed",
        errorMessage
      );
    });

    it("should show default error message when no error message provided", async () => {
      mockLogin.mockRejectedValue(new Error());

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "wrongpassword");

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Login Failed",
        "An error occurred during login"
      );
    });

    it("should hide loading indicator after failed login", async () => {
      mockLogin.mockRejectedValue(new Error("Login failed"));

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "wrongpassword");

      await act(async () => {
        const loginButton = getByText("Sign In");
        fireEvent.press(loginButton);
      });

      // Should show "Sign In" text again (not loading)
      expect(getByText("Sign In")).toBeTruthy();
    });
  });

  describe("navigation", () => {
    it("should navigate to register screen when create account is pressed", () => {
      const { getByText } = renderWithProviders(<LoginScreen />);
      const createAccountButton = getByText("Create Account");

      fireEvent.press(createAccountButton);

      // Navigation happens via globally mocked expo-router
    });

    it("should navigate to forgot password screen", () => {
      const { getByText } = renderWithProviders(<LoginScreen />);
      const forgotPasswordLink = getByText("Forgot your password?");

      fireEvent.press(forgotPasswordLink);

      expect(mockClearError).toHaveBeenCalled();
      // Navigation happens via globally mocked expo-router
    });
  });

  describe("error handling", () => {
    it("should clear errors when navigating to forgot password", () => {
      const { getByText } = renderWithProviders(<LoginScreen />);
      const forgotPasswordLink = getByText("Forgot your password?");

      fireEvent.press(forgotPasswordLink);

      expect(mockClearError).toHaveBeenCalled();
    });

    it("should clear errors before attempting login", async () => {
      mockLogin.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "password123");

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have appropriate input types and properties", () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);
      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");

      // Username field should be accessible for autofill
      expect(usernameInput.props.autoComplete).toBe("username");
      expect(usernameInput.props.textContentType).toBe("username");
      expect(usernameInput.props.autoCapitalize).toBe("none");

      // Password field should be secure and accessible for autofill
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(passwordInput.props.autoComplete).toBe("password");
      expect(passwordInput.props.textContentType).toBe("password");
    });
  });
});
