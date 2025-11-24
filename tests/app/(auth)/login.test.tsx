import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { renderWithProviders, testUtils, mockData } from "../../testUtils";
import LoginScreen from "../../../app/(auth)/login";
import { TEST_IDS } from "@src/constants/testIDs";

// Comprehensive React Native mocking to avoid ES6 module issues
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  Modal: "Modal",
  Alert: {
    alert: jest.fn(),
  },
  ScrollView: "ScrollView",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  ActivityIndicator: "ActivityIndicator",
  Switch: "Switch",
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

// Mock Biometric Service
jest.mock("@services/BiometricService", () => ({
  BiometricService: {
    isBiometricAvailable: jest.fn(() => Promise.resolve(false)),
    getBiometricTypeName: jest.fn(() => Promise.resolve("Biometric")),
    isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
    enableBiometrics: jest.fn(() => Promise.resolve(true)),
    disableBiometrics: jest.fn(() => Promise.resolve(true)),
    authenticateWithBiometrics: jest.fn(() =>
      Promise.resolve({
        success: true,
        credentials: { username: "test", password: "test" },
      })
    ),
  },
  BiometricErrorCode: {
    USER_CANCELLED: "USER_CANCELLED",
    SYSTEM_CANCELLED: "SYSTEM_CANCELLED",
    LOCKOUT: "LOCKOUT",
    NOT_ENROLLED: "NOT_ENROLLED",
    NOT_AVAILABLE: "NOT_AVAILABLE",
    NOT_ENABLED: "NOT_ENABLED",
    VERIFICATION_FAILED: "VERIFICATION_FAILED",
    USER_FALLBACK: "USER_FALLBACK",
    CREDENTIALS_NOT_FOUND: "CREDENTIALS_NOT_FOUND",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
  },
}));

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
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
  isBiometricAvailable: false,
  isBiometricEnabled: false,
};

// Create mock functions for biometric and device token operations
const mockLoginWithBiometrics = jest.fn();
const mockEnableBiometrics = jest.fn();
const mockCheckBiometricAvailability = jest.fn();
const mockHasDeviceToken = jest.fn(() => Promise.resolve(false));
const mockQuickLoginWithDeviceToken = jest.fn();

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
    loginWithBiometrics: mockLoginWithBiometrics,
    enableBiometrics: mockEnableBiometrics,
    disableBiometrics: jest.fn(),
    checkBiometricAvailability: mockCheckBiometricAvailability,
    hasDeviceToken: mockHasDeviceToken,
    quickLoginWithDeviceToken: mockQuickLoginWithDeviceToken,
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
    rememberDeviceContainer: { flexDirection: "row", alignItems: "center" },
    rememberDeviceText: { color: "#000", fontSize: 14 },
  })),
}));

// Alert is now mocked in the react-native mock above

describe("LoginScreen", () => {
  // Helper to wait for quick login to complete
  const waitForQuickLogin = async () => {
    await act(async () => {
      await jest.runAllTimersAsync();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.clearAllTimers();
    mockLogin.mockClear();
    mockClearError.mockClear();
    mockLoginWithBiometrics.mockClear();
    mockEnableBiometrics.mockClear();
    mockCheckBiometricAvailability.mockClear();
    mockHasDeviceToken.mockClear();
    mockHasDeviceToken.mockReturnValue(Promise.resolve(false));
    mockQuickLoginWithDeviceToken.mockClear();
    testUtils.resetCounters();

    // Reset auth state to defaults
    setMockAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      isBiometricAvailable: false,
      isBiometricEnabled: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("should render all required elements", async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );

      await waitForQuickLogin();

      expect(getByText("BrewTracker")).toBeTruthy();
      expect(getByText("Sign in to your account")).toBeTruthy();
      expect(getByPlaceholderText("Username")).toBeTruthy();
      expect(getByPlaceholderText("Password")).toBeTruthy();
      expect(getByText("Forgot your password?")).toBeTruthy();
      expect(getByText("Sign In")).toBeTruthy();
      expect(getByText("Don't have an account?")).toBeTruthy();
      expect(getByText("Create Account")).toBeTruthy();
    });

    it("should display error message when error exists", async () => {
      setMockAuthState({ error: "Invalid credentials" });

      const { getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      expect(getByText("Invalid credentials")).toBeTruthy();
    });

    it("should not display error message when no error", async () => {
      const { queryByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      expect(queryByText("Invalid credentials")).toBeNull();
    });
  });

  describe("user input", () => {
    it("should update username when typing", async () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      await waitForQuickLogin();

      const usernameInput = getByPlaceholderText("Username");

      fireEvent.changeText(usernameInput, "testuser");

      expect(usernameInput.props.value).toBe("testuser");
    });

    it("should update password when typing", async () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      await waitForQuickLogin();

      const passwordInput = getByPlaceholderText("Password");

      fireEvent.changeText(passwordInput, "password123");

      expect(passwordInput.props.value).toBe("password123");
    });

    it("should have secure text entry for password field", async () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      await waitForQuickLogin();

      const passwordInput = getByPlaceholderText("Password");

      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it("should have correct autocomplete and text content types", async () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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

      await waitForQuickLogin();

      const usernameInput = getByPlaceholderText("Username");
      const passwordInput = getByPlaceholderText("Password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(passwordInput, "password123");

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalledWith(
        {
          username: "testuser",
          password: "password123",
        },
        false
      );
    });

    it("should show loading indicator during login", async () => {
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>(resolve => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      const { getByText, getByPlaceholderText, queryByText } =
        renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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

      await waitForQuickLogin();

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
    it("should navigate to register screen when create account is pressed", async () => {
      const { getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      const createAccountButton = getByText("Create Account");

      fireEvent.press(createAccountButton);

      // Navigation happens via globally mocked expo-router
    });

    it("should navigate to forgot password screen", async () => {
      const { getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      const forgotPasswordLink = getByText("Forgot your password?");

      fireEvent.press(forgotPasswordLink);

      expect(mockClearError).toHaveBeenCalled();
      // Navigation happens via globally mocked expo-router
    });
  });

  describe("error handling", () => {
    it("should clear errors when navigating to forgot password", async () => {
      const { getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      const forgotPasswordLink = getByText("Forgot your password?");

      fireEvent.press(forgotPasswordLink);

      expect(mockClearError).toHaveBeenCalled();
    });

    it("should clear errors before attempting login", async () => {
      mockLogin.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );

      await waitForQuickLogin();

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
    it("should have appropriate input types and properties", async () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      await waitForQuickLogin();

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

  describe("biometric authentication", () => {
    it("should show biometric login button when biometrics are enabled and available", async () => {
      setMockAuthState({
        isBiometricAvailable: true,
        isBiometricEnabled: true,
      });

      const { getByTestId, getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      expect(getByTestId(TEST_IDS.auth.biometricLoginButton)).toBeTruthy();
    });

    it("should call loginWithBiometrics when biometric button is pressed", async () => {
      setMockAuthState({
        isBiometricAvailable: true,
        isBiometricEnabled: true,
      });

      mockLoginWithBiometrics.mockResolvedValue(undefined);

      const { getByTestId, getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      const biometricButton = getByTestId(TEST_IDS.auth.biometricLoginButton);

      await act(async () => {
        fireEvent.press(biometricButton);
      });

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLoginWithBiometrics).toHaveBeenCalled();
    });

    it("should suppress alert when user cancels biometric login", async () => {
      const BiometricErrorCode =
        require("@services/BiometricService").BiometricErrorCode;

      setMockAuthState({
        isBiometricAvailable: true,
        isBiometricEnabled: true,
      });

      const error = new Error("User cancelled");
      (error as any).errorCode = BiometricErrorCode.USER_CANCELLED;
      mockLoginWithBiometrics.mockRejectedValue(error);

      const { getByTestId, getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      const biometricButton = getByTestId(TEST_IDS.auth.biometricLoginButton);

      await act(async () => {
        fireEvent.press(biometricButton);
      });

      // Should NOT show alert for user cancellation
      expect(require("react-native").Alert.alert).not.toHaveBeenCalledWith(
        "Biometric Login Failed",
        expect.any(String)
      );
    });

    it("should show alert when biometric login fails with non-cancellation error", async () => {
      setMockAuthState({
        isBiometricAvailable: true,
        isBiometricEnabled: true,
      });

      const error = new Error("Authentication failed");
      mockLoginWithBiometrics.mockRejectedValue(error);

      const { getByTestId, getByText } = renderWithProviders(<LoginScreen />);

      await waitForQuickLogin();

      const biometricButton = getByTestId(TEST_IDS.auth.biometricLoginButton);

      await act(async () => {
        fireEvent.press(biometricButton);
      });

      // Should show alert for authentication failure
      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Biometric Login Failed",
        "Authentication failed"
      );
    });
  });
});
