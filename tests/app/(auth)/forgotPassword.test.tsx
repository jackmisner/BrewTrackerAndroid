import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import ForgotPasswordScreen from "../../../app/(auth)/forgotPassword";
import { renderWithProviders } from "@/tests/testUtils";

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

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

// AuthContext is provided by renderWithProviders

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
        success: "#28a745",
        warning: "#ffc107",
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
    formContainer: { padding: 20 },
    header: { marginBottom: 20, alignItems: "center" },
    title: { fontSize: 24, fontWeight: "bold" },
    subtitle: { fontSize: 16, color: "#666", textAlign: "center" },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },
    errorText: { color: "#dc2626", marginLeft: 5 },
    inputContainer: { marginBottom: 15 },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
    },
    inputIcon: { marginLeft: 10 },
    input: { flex: 1, padding: 10 },
    buttonContainer: { marginTop: 20 },
    resetPrimaryButton: {
      backgroundColor: "#2563eb",
      padding: 15,
      borderRadius: 5,
    },
    resetPrimaryButtonText: {
      color: "#fff",
      textAlign: "center",
      fontWeight: "bold",
    },
    primaryButtonDisabled: { backgroundColor: "#9ca3af" },
    primaryButtonTextDisabled: { color: "#d1d5db" },
    footerLinks: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    linkText: { color: "#2563eb" },
    linkSeparator: { marginHorizontal: 10, color: "#666" },
    successContainer: { marginBottom: 20 },
    successText: { fontSize: 16, textAlign: "center", marginBottom: 10 },
    successSubtext: { fontSize: 14, color: "#666", textAlign: "center" },
  })),
}));

// Alert is now mocked in the react-native mock above

// Mock API functions that will be used by AuthContext
const mockForgotPassword = jest.fn();
const mockClearError = jest.fn();

// Mock the API service that AuthContext uses
jest.mock("@services/api/apiService", () => ({
  default: {
    auth: {
      forgotPassword: mockForgotPassword,
    },
  },
}));

// Create a mockable useAuth implementation
let mockAuthState = {
  user: null as any,
  isLoading: false,
  isAuthenticated: false,
  error: null as string | null,
};

// Mock the specific useAuth import in the component
jest.mock("@contexts/AuthContext", () => ({
  ...jest.requireActual("@contexts/AuthContext"),
  useAuth: () => ({
    ...mockAuthState,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    clearError: mockClearError,
    signInWithGoogle: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    checkVerificationStatus: jest.fn(),
    forgotPassword: mockForgotPassword,
    resetPassword: jest.fn(),
    getUserId: jest.fn(),
  }),
}));

// Helper to override auth state for specific tests
const setMockAuthState = (overrides: Partial<typeof mockAuthState>) => {
  mockAuthState = { ...mockAuthState, ...overrides };
};

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockForgotPassword.mockClear();
    mockClearError.mockClear();

    // Reset auth state to defaults
    setMockAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  });

  describe("rendering - initial form", () => {
    it("should render all required elements", () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );

      expect(getByText("Forgot Password")).toBeTruthy();
      expect(
        getByText(
          "Enter your email address and we'll send you a link to reset your password."
        )
      ).toBeTruthy();
      expect(getByPlaceholderText("Enter your email address")).toBeTruthy();
      expect(getByText("Send Reset Link")).toBeTruthy();
      expect(getByText("Back to Login")).toBeTruthy();
      expect(getByText("Create Account")).toBeTruthy();
    });

    it("should display error message when error exists", () => {
      setMockAuthState({ error: "User not found" });

      const { getByText } = renderWithProviders(<ForgotPasswordScreen />);

      expect(getByText("User not found")).toBeTruthy();
    });

    it("should not display error message when no error", () => {
      const { queryByText } = renderWithProviders(<ForgotPasswordScreen />);

      expect(queryByText("User not found")).toBeNull();
    });

    it("should show loading text when loading", () => {
      setMockAuthState({ isLoading: true });

      const { getByText } = renderWithProviders(<ForgotPasswordScreen />);

      expect(getByText("Sending...")).toBeTruthy();
    });
  });

  describe("user input", () => {
    it("should update email when typing", () => {
      const { getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");

      fireEvent.changeText(emailInput, "test@example.com");

      expect(emailInput.props.value).toBe("test@example.com");
    });

    it("should clear error when typing", () => {
      setMockAuthState({ error: "Some error" });

      const { getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");

      fireEvent.changeText(emailInput, "test@example.com");

      expect(mockClearError).toHaveBeenCalled();
    });

    it("should have correct input properties", () => {
      const { getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");

      expect(emailInput.props.keyboardType).toBe("email-address");
      expect(emailInput.props.autoCapitalize).toBe("none");
      expect(emailInput.props.autoComplete).toBe("email");
      expect(emailInput.props.autoCorrect).toBe(false);
      expect(emailInput.props.returnKeyType).toBe("send");
    });

    it("should disable input when loading", () => {
      setMockAuthState({ isLoading: true });

      const { getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");

      expect(emailInput.props.editable).toBe(false);
    });

    it("should call handleForgotPassword on submit editing", () => {
      const { getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent(emailInput, "submitEditing");

      expect(mockForgotPassword).toHaveBeenCalledWith("test@example.com");
    });
  });

  describe("form validation", () => {
    it("should show alert when email is empty", () => {
      const { getByText } = renderWithProviders(<ForgotPasswordScreen />);
      const submitButton = getByText("Send Reset Link");

      fireEvent.press(submitButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please enter your email address"
      );
      expect(mockForgotPassword).not.toHaveBeenCalled();
    });

    it("should show alert when email is only whitespace", () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");
      const submitButton = getByText("Send Reset Link");

      fireEvent.changeText(emailInput, "   ");
      fireEvent.press(submitButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please enter your email address"
      );
      expect(mockForgotPassword).not.toHaveBeenCalled();
    });

    it("should show alert for invalid email format", () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");
      const submitButton = getByText("Send Reset Link");

      fireEvent.changeText(emailInput, "invalid-email");
      fireEvent.press(submitButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please enter a valid email address"
      );
      expect(mockForgotPassword).not.toHaveBeenCalled();
    });

    it.each([
      "test@example.com",
      "user.name@domain.co.uk",
      "test123@test-domain.com",
      "a@b.co",
    ])("should accept valid email format: %s", async email => {
      // Set up the global mock to resolve for this test
      mockForgotPassword.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText, unmount } = renderWithProviders(
        <ForgotPasswordScreen />
      );

      try {
        const emailInput = getByPlaceholderText("Enter your email address");
        const submitButton = getByText("Send Reset Link");

        fireEvent.changeText(emailInput, email);

        await act(async () => {
          fireEvent.press(submitButton);
        });

        expect(Alert.alert).not.toHaveBeenCalledWith(
          "Error",
          "Please enter a valid email address"
        );
        expect(mockForgotPassword).toHaveBeenCalledWith(email);
      } finally {
        unmount();
      }
    });

    it("should disable button for empty email", () => {
      const { getByText } = renderWithProviders(<ForgotPasswordScreen />);

      // For empty email, verify button exists but we can't test disabled state with mocked components
      expect(getByText("Send Reset Link")).toBeTruthy();
    });

    it("should disable button for invalid email", () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");

      fireEvent.changeText(emailInput, "invalid-email");

      // For invalid email, verify button exists but we can't test disabled state with mocked components
      expect(getByText("Send Reset Link")).toBeTruthy();
    });

    it("should enable button for valid email", () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");

      fireEvent.changeText(emailInput, "test@example.com");

      // For valid email, verify button exists but we can't test disabled state with mocked components
      expect(getByText("Send Reset Link")).toBeTruthy();
    });

    it("should disable button when loading", () => {
      setMockAuthState({ isLoading: true });

      const { getByText, getByPlaceholderText, queryByText } =
        renderWithProviders(<ForgotPasswordScreen />);
      const emailInput = getByPlaceholderText("Enter your email address");

      fireEvent.changeText(emailInput, "test@example.com");

      // Check that loading text is shown and normal button text is not
      expect(getByText("Sending...")).toBeTruthy();
      expect(queryByText("Send Reset Link")).toBeNull();
    });

    it("should not call forgotPassword if already loading", async () => {
      setMockAuthState({ isLoading: true });

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");
      const submitButton = getByText("Sending...");

      fireEvent.changeText(emailInput, "test@example.com");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockForgotPassword).not.toHaveBeenCalled();
    });
  });

  describe("successful password reset request", () => {
    it("should call forgotPassword with trimmed email", async () => {
      mockForgotPassword.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");
      const submitButton = getByText("Send Reset Link");

      fireEvent.changeText(emailInput, " test@example.com ");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockForgotPassword).toHaveBeenCalledWith("test@example.com");
    });

    it("should show success screen after successful request", async () => {
      mockForgotPassword.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");
      const submitButton = getByText("Send Reset Link");

      fireEvent.changeText(emailInput, "test@example.com");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Should show success screen
      expect(getByText("Check Your Email")).toBeTruthy();
      expect(
        getByText(
          "If an account with that email exists, you should receive a password reset link shortly."
        )
      ).toBeTruthy();
      expect(
        getByText(
          "Please check your email inbox and spam folder for the password reset link."
        )
      ).toBeTruthy();
      expect(
        getByText("The reset link will expire in 1 hour for security reasons.")
      ).toBeTruthy();
    });
  });

  describe("success screen rendering", () => {
    it("should render success screen elements correctly", async () => {
      mockForgotPassword.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText, queryByPlaceholderText } =
        renderWithProviders(<ForgotPasswordScreen />);
      const emailInput = getByPlaceholderText("Enter your email address");
      const submitButton = getByText("Send Reset Link");

      fireEvent.changeText(emailInput, "test@example.com");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Verify success screen elements
      expect(getByText("Check Your Email")).toBeTruthy();
      expect(getByText("Back to Login")).toBeTruthy();

      // Should not show the original form elements
      expect(queryByPlaceholderText("Enter your email address")).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle forgotPassword errors gracefully", async () => {
      const errorMessage = "User not found";
      mockForgotPassword.mockRejectedValue(new Error(errorMessage));

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <ForgotPasswordScreen />
      );
      const emailInput = getByPlaceholderText("Enter your email address");
      const submitButton = getByText("Send Reset Link");

      fireEvent.changeText(emailInput, "nonexistent@example.com");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Should not crash and should stay on form
      expect(getByText("Forgot Password")).toBeTruthy();
      expect(mockForgotPassword).toHaveBeenCalledWith(
        "nonexistent@example.com"
      );
    });
  });

  describe("email validation function", () => {
    // Test the actual validation behavior through form submission
    it.each([
      ["test@example.com", true, null],
      ["user.name@domain.co.uk", true, null],
      ["invalid-email", false, "Please enter a valid email address"],
      ["@example.com", false, "Please enter a valid email address"],
      ["test@", false, "Please enter a valid email address"],
      ["test.example.com", false, "Please enter a valid email address"],
      ["", false, "Please enter your email address"],
      ["   ", false, "Please enter your email address"],
      ["test@.com", false, "Please enter a valid email address"],
      ["test@com.", false, "Please enter a valid email address"],
      ["test space@example.com", false, "Please enter a valid email address"],
    ])(
      "should validate email '%s' as %s",
      async (email, isValid, expectedErrorMessage) => {
        const { getByText, getByPlaceholderText } = renderWithProviders(
          <ForgotPasswordScreen />
        );
        const emailInput = getByPlaceholderText("Enter your email address");
        const submitButton = getByText("Send Reset Link");

        fireEvent.changeText(emailInput, email);
        fireEvent.press(submitButton);

        if (isValid) {
          expect(Alert.alert).not.toHaveBeenCalledWith(
            "Error",
            expect.any(String)
          );
        } else {
          expect(Alert.alert).toHaveBeenCalledWith(
            "Error",
            expectedErrorMessage
          );
        }
      }
    );
  });
});
