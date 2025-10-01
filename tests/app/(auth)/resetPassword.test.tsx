import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import ResetPasswordScreen from "../../../app/(auth)/resetPassword";
import { TEST_IDS } from "@src/constants/testIDs";

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
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

jest.mock("zxcvbn", () => jest.fn());

jest.mock("@contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@contexts/ThemeContext", () => ({
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
}));

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
    passwordToggle: { position: "absolute", right: 10 },
    passwordStrengthContainer: { marginTop: 5 },
    passwordStrengthText: { fontSize: 12 },
    passwordWeak: { color: "#dc2626" },
    passwordMedium: { color: "#f59e0b" },
    passwordStrong: { color: "#16a34a" },
    helpText: { fontSize: 12, color: "#666", marginTop: 5 },
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
  })),
}));

// Alert is now mocked in the react-native mock above

const mockAuth = {
  resetPassword: jest.fn(),
  isLoading: false,
  error: null as string | null,
  clearError: jest.fn(),
};

const mockZxcvbn = require("zxcvbn");

// Setup mocks
require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

describe("ResetPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.isLoading = false;
    mockAuth.error = null;

    // Default mock for useLocalSearchParams
    require("expo-router").useLocalSearchParams.mockReturnValue({
      token: "valid-reset-token",
    });

    // Default mock for zxcvbn
    mockZxcvbn.mockReturnValue({ score: 4 }); // strong password by default
  });

  describe("initialization", () => {
    it("should show alert and redirect when token is missing", () => {
      require("expo-router").useLocalSearchParams.mockReturnValue({
        token: undefined,
      });

      render(<ResetPasswordScreen />);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Invalid Reset Link",
        "No reset token provided. Please use the link from your email.",
        [{ text: "OK", onPress: expect.any(Function) }]
      );
    });

    it("should not show alert when token is present", () => {
      render(<ResetPasswordScreen />);

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe("rendering - initial form", () => {
    it("should render all required elements", () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(
        <ResetPasswordScreen />
      );

      expect(getAllByText("Reset Password")).toBeTruthy();
      expect(getByText("Enter your new password below.")).toBeTruthy();
      expect(getByPlaceholderText("Enter new password")).toBeTruthy();
      expect(getByPlaceholderText("Confirm new password")).toBeTruthy();
      expect(
        getByText(
          "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character."
        )
      ).toBeTruthy();
      expect(getByText("Request New Reset Link")).toBeTruthy();
      expect(getByText("Back to Login")).toBeTruthy();
    });

    it("should display error message when error exists", () => {
      mockAuth.error = "Invalid token";
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByText } = render(<ResetPasswordScreen />);

      expect(getByText("Invalid token")).toBeTruthy();
    });

    it("should not display error message when no error", () => {
      const { queryByText } = render(<ResetPasswordScreen />);

      expect(queryByText("Invalid token")).toBeNull();
    });

    it("should show loading text when loading", () => {
      mockAuth.isLoading = true;
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByText } = render(<ResetPasswordScreen />);

      expect(getByText("Resetting...")).toBeTruthy();
    });
  });

  describe("password input", () => {
    it("should update password fields when typing", () => {
      const { getByPlaceholderText } = render(<ResetPasswordScreen />);
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");

      expect(newPasswordInput.props.value).toBe("StrongP@ss123");
      expect(confirmPasswordInput.props.value).toBe("StrongP@ss123");
    });

    it("should clear error when typing", () => {
      mockAuth.error = "Some error";
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByPlaceholderText } = render(<ResetPasswordScreen />);
      const newPasswordInput = getByPlaceholderText("Enter new password");

      fireEvent.changeText(newPasswordInput, "test");

      expect(mockAuth.clearError).toHaveBeenCalled();
    });

    it("should have correct input properties", () => {
      const { getByPlaceholderText } = render(<ResetPasswordScreen />);
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");

      expect(newPasswordInput.props.secureTextEntry).toBe(true);
      expect(newPasswordInput.props.autoComplete).toBe("new-password");
      expect(newPasswordInput.props.autoCorrect).toBe(false);
      expect(newPasswordInput.props.returnKeyType).toBe("next");

      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
      expect(confirmPasswordInput.props.autoComplete).toBe("new-password");
      expect(confirmPasswordInput.props.autoCorrect).toBe(false);
      expect(confirmPasswordInput.props.returnKeyType).toBe("send");
    });

    it("should disable inputs when loading", () => {
      mockAuth.isLoading = true;
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByPlaceholderText } = render(<ResetPasswordScreen />);
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");

      expect(newPasswordInput.props.editable).toBe(false);
      expect(confirmPasswordInput.props.editable).toBe(false);
    });

    it("should call handleResetPassword on confirm password submit", () => {
      mockZxcvbn.mockReturnValue({ score: 4 }); // strong password

      const { getByPlaceholderText } = render(<ResetPasswordScreen />);
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");
      fireEvent(confirmPasswordInput, "submitEditing");

      expect(mockAuth.resetPassword).toHaveBeenCalledWith(
        "valid-reset-token",
        "StrongP@ss123"
      );
    });
  });

  describe("password strength indication", () => {
    it("should show password strength for weak passwords", () => {
      mockZxcvbn.mockReturnValue({ score: 0 });

      const { getByPlaceholderText, getByText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");

      fireEvent.changeText(newPasswordInput, "weak");

      expect(getByText("Password strength: weak")).toBeTruthy();
    });

    it("should show password strength for medium passwords", () => {
      mockZxcvbn.mockReturnValue({ score: 2 });

      const { getByPlaceholderText, getByText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");

      fireEvent.changeText(newPasswordInput, "medium123");

      expect(getByText("Password strength: medium")).toBeTruthy();
    });

    it("should show password strength for strong passwords", () => {
      mockZxcvbn.mockReturnValue({ score: 4 });

      const { getByPlaceholderText, getByText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");

      expect(getByText("Password strength: strong")).toBeTruthy();
    });

    it("should not show password strength when password is empty", () => {
      const { queryByText } = render(<ResetPasswordScreen />);

      expect(queryByText(/Password strength:/)).toBeNull();
    });
  });

  describe("password matching validation", () => {
    it("should show error when passwords do not match", () => {
      const { getByPlaceholderText, getByText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "Different123");

      expect(getByText("Passwords do not match")).toBeTruthy();
    });

    it("should not show error when passwords match", () => {
      const { getByPlaceholderText, queryByText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");

      expect(queryByText("Passwords do not match")).toBeNull();
    });

    it("should not show error when confirm password is empty", () => {
      const { getByPlaceholderText, queryByText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");

      expect(queryByText("Passwords do not match")).toBeNull();
    });
  });

  describe("form validation", () => {
    it("should show alert when token is missing", async () => {
      require("expo-router").useLocalSearchParams.mockReturnValue({
        token: undefined,
      });

      const { getByTestId } = render(<ResetPasswordScreen />);
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Invalid reset token. Please request a new password reset."
      );
      expect(mockAuth.resetPassword).not.toHaveBeenCalled();
    });

    it("should show alert when fields are empty", async () => {
      const { getByTestId } = render(<ResetPasswordScreen />);
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockAuth.resetPassword).not.toHaveBeenCalled();
    });

    it("should show alert when passwords do not match", async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "Different123");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Passwords do not match"
      );
      expect(mockAuth.resetPassword).not.toHaveBeenCalled();
    });

    it("should show alert when password has leading/trailing spaces", async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, " StrongP@ss123 ");
      fireEvent.changeText(confirmPasswordInput, " StrongP@ss123 ");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Password cannot start or end with spaces"
      );
      expect(mockAuth.resetPassword).not.toHaveBeenCalled();
    });

    it("should show alert when trimmed password is empty", async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "   ");
      fireEvent.changeText(confirmPasswordInput, "   ");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Password cannot start or end with spaces"
      );
      expect(mockAuth.resetPassword).not.toHaveBeenCalled();
    });

    it("should show alert when password is too weak", async () => {
      mockZxcvbn.mockReturnValue({ score: 1 }); // weak password

      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "weak123");
      fireEvent.changeText(confirmPasswordInput, "weak123");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Password Too Weak",
        "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
      );
      expect(mockAuth.resetPassword).not.toHaveBeenCalled();
    });

    it("should disable button when passwords do not match", () => {
      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "Different123");

      expect(submitButton.props.disabled).toBe(true);
    });

    it("should disable button when password is weak", () => {
      mockZxcvbn.mockReturnValue({ score: 1 });

      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "weak123");
      fireEvent.changeText(confirmPasswordInput, "weak123");

      expect(submitButton.props.disabled).toBe(true);
    });

    it("should enable button when all validation passes", () => {
      mockZxcvbn.mockReturnValue({ score: 4 });

      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");

      expect(submitButton.props.disabled).toBe(false);
    });

    it("should disable button when loading", () => {
      mockAuth.isLoading = true;
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByText } = render(<ResetPasswordScreen />);

      // Check that loading text is shown
      expect(getByText("Resetting...")).toBeTruthy();
    });
  });

  describe("successful password reset", () => {
    it("should call resetPassword with correct parameters", async () => {
      mockAuth.resetPassword.mockResolvedValue(undefined);
      mockZxcvbn.mockReturnValue({ score: 4 });

      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockAuth.resetPassword).toHaveBeenCalledWith(
        "valid-reset-token",
        "StrongP@ss123"
      );
    });

    it("should show success screen after successful reset", async () => {
      mockAuth.resetPassword.mockResolvedValue(undefined);
      mockZxcvbn.mockReturnValue({ score: 4 });

      const { getByTestId, getByText, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Should show success screen
      expect(getByText("Password Reset Successful")).toBeTruthy();
      expect(
        getByText("Your password has been successfully reset!")
      ).toBeTruthy();
      expect(
        getByText("You can now log in with your new password.")
      ).toBeTruthy();
      expect(getByTestId(TEST_IDS.auth.goToLoginButton)).toBeTruthy();
    });
  });

  describe("error handling", () => {
    it("should handle resetPassword errors gracefully", async () => {
      const errorMessage = "Invalid token";
      mockAuth.resetPassword.mockRejectedValue(new Error(errorMessage));
      mockZxcvbn.mockReturnValue({ score: 4 });

      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Should not crash and should stay on form
      expect(getByTestId(TEST_IDS.auth.resetPasswordTitle)).toBeTruthy();
      expect(mockAuth.resetPassword).toHaveBeenCalledWith(
        "valid-reset-token",
        "StrongP@ss123"
      );
    });

    it("should show fallback alert when context error handling fails", async () => {
      mockAuth.resetPassword.mockRejectedValue(null); // No error object
      mockZxcvbn.mockReturnValue({ score: 4 });

      const { getByTestId, getByPlaceholderText } = render(
        <ResetPasswordScreen />
      );
      const newPasswordInput = getByPlaceholderText("Enter new password");
      const confirmPasswordInput = getByPlaceholderText("Confirm new password");
      const submitButton = getByTestId(TEST_IDS.auth.resetPasswordButton);

      fireEvent.changeText(newPasswordInput, "StrongP@ss123");
      fireEvent.changeText(confirmPasswordInput, "StrongP@ss123");

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Failed to reset password. Please try again."
      );
    });
  });

  describe("password strength mapping", () => {
    it("should map zxcvbn scores correctly", () => {
      const testCases = [
        { score: 0, expected: "weak" },
        { score: 1, expected: "weak" },
        { score: 2, expected: "medium" },
        { score: 3, expected: "strong" },
        { score: 4, expected: "strong" },
      ];

      testCases.forEach(({ score, expected }) => {
        mockZxcvbn.mockReturnValue({ score });

        const { getByPlaceholderText, getByText } = render(
          <ResetPasswordScreen />
        );
        const newPasswordInput = getByPlaceholderText("Enter new password");

        fireEvent.changeText(newPasswordInput, "testpassword");

        expect(getByText(`Password strength: ${expected}`)).toBeTruthy();
      });
    });
  });
});
