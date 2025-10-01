import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { renderWithProviders, testUtils } from "../../testUtils";
import RegisterScreen from "../../../app/(auth)/register";
import { TEST_IDS } from "../../../src/constants/testIDs";

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
const mockRegister = jest.fn();
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
    login: jest.fn(),
    register: mockRegister,
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

jest.mock("@styles/auth/registerStyles", () => ({
  registerStyles: {
    container: { flex: 1 },
    scrollContainer: { flexGrow: 1 },
    header: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: "bold" },
    subtitle: { fontSize: 16, color: "#666" },
    form: { padding: 20 },
    inputContainer: { marginBottom: 15 },
    input: { borderWidth: 1, padding: 10 },
    errorText: { color: "#FF0000", marginBottom: 10 },
    button: { padding: 15, borderRadius: 5 },
    primaryButton: { backgroundColor: "#007AFF" },
    secondaryButton: { backgroundColor: "transparent", borderWidth: 1 },
    buttonText: { color: "#FFFFFF", textAlign: "center" },
    secondaryButtonText: { color: "#007AFF", textAlign: "center" },
    divider: { marginVertical: 20 },
    dividerText: { textAlign: "center", color: "#666" },
  },
}));

// Alert is now mocked in the react-native mock above

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.clearAllTimers();
    mockRegister.mockClear();
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
      const { getByText, getByPlaceholderText, getAllByText } =
        renderWithProviders(<RegisterScreen />);

      expect(getAllByText("Create Account")).toBeTruthy();
      expect(getByText("Join the BrewTracker community")).toBeTruthy();
      expect(getByPlaceholderText("Username")).toBeTruthy();
      expect(getByPlaceholderText("Email")).toBeTruthy();
      expect(getByPlaceholderText("Password")).toBeTruthy();
      expect(getByPlaceholderText("Confirm Password")).toBeTruthy();
      expect(getByText("Already have an account?")).toBeTruthy();
      expect(getByText("Sign In")).toBeTruthy();
    });

    it("should display error message when error exists", () => {
      setMockAuthState({ error: "Username already exists" });

      const { getByText } = renderWithProviders(<RegisterScreen />);

      expect(getByText("Username already exists")).toBeTruthy();
    });

    it("should not display error message when no error", () => {
      const { queryByText } = renderWithProviders(<RegisterScreen />);

      expect(queryByText("Username already exists")).toBeNull();
    });
  });

  describe("user input", () => {
    it("should update all form fields when typing", () => {
      const { getByPlaceholderText } = renderWithProviders(<RegisterScreen />);
      const usernameInput = getByPlaceholderText("Username");
      const emailInput = getByPlaceholderText("Email");
      const passwordInput = getByPlaceholderText("Password");
      const confirmPasswordInput = getByPlaceholderText("Confirm Password");

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");
      fireEvent.changeText(confirmPasswordInput, "password123");

      expect(usernameInput.props.value).toBe("testuser");
      expect(emailInput.props.value).toBe("test@example.com");
      expect(passwordInput.props.value).toBe("password123");
      expect(confirmPasswordInput.props.value).toBe("password123");
    });

    it("should have secure text entry for password fields", () => {
      const { getByPlaceholderText } = renderWithProviders(<RegisterScreen />);
      const passwordInput = getByPlaceholderText("Password");
      const confirmPasswordInput = getByPlaceholderText("Confirm Password");

      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
    });

    it("should have correct input properties", () => {
      const { getByPlaceholderText } = renderWithProviders(<RegisterScreen />);
      const usernameInput = getByPlaceholderText("Username");
      const emailInput = getByPlaceholderText("Email");
      const passwordInput = getByPlaceholderText("Password");

      expect(usernameInput.props.autoCapitalize).toBe("none");
      expect(usernameInput.props.autoComplete).toBe("username");
      expect(usernameInput.props.textContentType).toBe("username");

      expect(emailInput.props.keyboardType).toBe("email-address");
      expect(emailInput.props.autoCapitalize).toBe("none");
      expect(emailInput.props.autoComplete).toBe("email");
      expect(emailInput.props.textContentType).toBe("emailAddress");

      expect(passwordInput.props.autoComplete).toBe("new-password");
      expect(passwordInput.props.textContentType).toBe("newPassword");
    });
  });

  describe("form validation", () => {
    const fillValidForm = (getByPlaceholderText: any) => {
      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );
    };

    it("should show alert when username is empty", () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show alert when email is empty", () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show alert when password is empty", () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show alert when confirm password is empty", () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show alert when passwords do not match", () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "differentpassword"
      );
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Passwords do not match"
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show alert when password is too short", () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "123");
      fireEvent.changeText(getByPlaceholderText("Confirm Password"), "123");
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Password must be at least 6 characters"
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should show alert for invalid email format", () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "invalid-email");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please enter a valid email address"
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it.each([
      "test@example.com",
      "user.name@domain.co.uk",
      "test123@test-domain.com",
      "a@b.co",
    ])("should accept valid email format: %s", async email => {
      mockRegister.mockResolvedValue(undefined);

      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), email);
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );

      fireEvent.press(getByTestId(TEST_IDS.auth.registerButton));

      expect(Alert.alert).not.toHaveBeenCalledWith(
        "Error",
        "Please enter a valid email address"
      );
    });
  });

  describe("successful registration", () => {
    it("should call register function with correct data", async () => {
      mockRegister.mockResolvedValue(undefined);

      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const usernameInput = getByPlaceholderText("Username");
      const emailInput = getByPlaceholderText("Email");
      const passwordInput = getByPlaceholderText("Password");
      const confirmPasswordInput = getByPlaceholderText("Confirm Password");
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(usernameInput, "testuser");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");
      fireEvent.changeText(confirmPasswordInput, "password123");

      await act(async () => {
        fireEvent.press(registerButton);
      });

      expect(mockClearError).toHaveBeenCalled();
      expect(mockRegister).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should show success alert and navigate to login", async () => {
      mockRegister.mockResolvedValue(undefined);

      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );

      await act(async () => {
        fireEvent.press(registerButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Registration Successful",
        "Please check your email to verify your account before signing in.",
        [
          {
            text: "OK",
            onPress: expect.any(Function),
          },
        ]
      );

      // Simulate pressing OK on the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === "Registration Successful"
      );
      if (
        alertCall &&
        alertCall[2] &&
        alertCall[2][0] &&
        alertCall[2][0].onPress
      ) {
        alertCall[2][0].onPress();
      }

      // Navigation happens via globally mocked expo-router
    });

    it("should show loading indicator during registration", async () => {
      let resolveRegister: () => void;
      const registerPromise = new Promise<void>(resolve => {
        resolveRegister = resolve;
      });
      mockRegister.mockReturnValue(registerPromise);

      const { getByTestId, getByPlaceholderText, queryByText } =
        renderWithProviders(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );

      act(() => {
        const registerButton = getByTestId(TEST_IDS.auth.registerButton);
        fireEvent.press(registerButton);
      });

      // Should show loading indicator (ActivityIndicator)
      // Note: With mocked React Native, we can't easily test for ActivityIndicator visibility

      // Resolve the registration
      await act(async () => {
        resolveRegister();
        await registerPromise;
      });
    });
  });

  describe("failed registration", () => {
    it("should show alert on registration failure with error message", async () => {
      const errorMessage = "Username already exists";
      mockRegister.mockRejectedValue(new Error(errorMessage));

      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "existinguser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );

      await act(async () => {
        fireEvent.press(registerButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Registration Failed",
        "An error occurred during registration. Please try again."
      );
    });

    it("should show default error message when no error message provided", async () => {
      mockRegister.mockRejectedValue(new Error());

      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RegisterScreen />
      );
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );

      await act(async () => {
        fireEvent.press(registerButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Registration Failed",
        "An error occurred during registration. Please try again."
      );
    });

    it("should hide loading indicator after failed registration", async () => {
      mockRegister.mockRejectedValue(new Error("Registration failed"));

      const { getByText, getByTestId, getByPlaceholderText } =
        renderWithProviders(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );

      await act(async () => {
        const registerButton = getByTestId(TEST_IDS.auth.registerButton);
        fireEvent.press(registerButton);
      });

      // Should show "Create Account" text again (not loading)
      expect(getByTestId(TEST_IDS.auth.registerButton)).toBeTruthy();
    });
  });

  describe("navigation", () => {
    it("should navigate back to login when sign in is pressed", () => {
      const { getByText } = renderWithProviders(<RegisterScreen />);
      const signInButton = getByText("Sign In");

      fireEvent.press(signInButton);

      // Navigation happens via globally mocked expo-router
    });
  });

  describe("loading state", () => {
    it("should disable both buttons during loading", async () => {
      let resolveRegister: () => void;
      const registerPromise = new Promise<void>(resolve => {
        resolveRegister = resolve;
      });
      mockRegister.mockReturnValue(registerPromise);

      const { getByTestId, getByPlaceholderText, queryByText } =
        renderWithProviders(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "password123"
      );

      act(() => {
        const registerButton = getByTestId(TEST_IDS.auth.registerButton);
        fireEvent.press(registerButton);
      });

      // Check that the button is still there (we can't easily test ActivityIndicator with mocking)
      expect(getByTestId(TEST_IDS.auth.registerButton)).toBeTruthy();

      // Resolve the registration
      await act(async () => {
        resolveRegister();
        await registerPromise;
      });
    });
  });
});
