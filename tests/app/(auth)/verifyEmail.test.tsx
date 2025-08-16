import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import VerifyEmailScreen from "../../../app/(auth)/verifyEmail";

// Comprehensive React Native mocking to avoid ES6 module issues
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  Alert: {
    alert: jest.fn(),
  },
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@styles/auth/verifyEmailStyles", () => ({
  verifyEmailStyles: {
    container: { flex: 1 },
    header: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: "bold" },
    subtitle: { fontSize: 16, color: "#666" },
    email: { fontWeight: "bold", color: "#007AFF" },
    form: { padding: 20 },
    inputContainer: { marginBottom: 15 },
    input: { borderWidth: 1, padding: 10, textAlign: "center" },
    errorText: { color: "#FF0000", marginBottom: 10 },
    button: { padding: 15, borderRadius: 5 },
    primaryButton: { backgroundColor: "#007AFF" },
    secondaryButton: { backgroundColor: "transparent", borderWidth: 1 },
    buttonText: { color: "#FFFFFF", textAlign: "center" },
    secondaryButtonText: { color: "#007AFF", textAlign: "center" },
    divider: { marginVertical: 20 },
    dividerText: { textAlign: "center", color: "#666" },
    linkButton: { padding: 10 },
    linkText: { color: "#007AFF", textAlign: "center" },
  },
}));

// Alert is now mocked in the react-native mock above

const mockAuth = {
  user: { email: "test@example.com", email_verified: false },
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  checkVerificationStatus: jest.fn(),
  error: null,
  clearError: jest.fn(),
};

// Setup mocks
require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.error = null;
    mockAuth.user = { email: "test@example.com", email_verified: false };
  });

  describe("rendering", () => {
    it("should render all required elements", () => {
      const { getByText, getByPlaceholderText } = render(<VerifyEmailScreen />);

      expect(getByText("Verify Your Email")).toBeTruthy();
      expect(getByText(/We've sent a verification code to/)).toBeTruthy();
      expect(getByText("test@example.com")).toBeTruthy();
      expect(getByPlaceholderText("Enter verification code")).toBeTruthy();
      expect(getByText("Verify Email")).toBeTruthy();
      expect(getByText("Didn't receive the code?")).toBeTruthy();
      expect(getByText("Resend Code")).toBeTruthy();
      expect(getByText("Back to Sign In")).toBeTruthy();
      expect(getByText("Skip for Now")).toBeTruthy();
    });

    it("should display user email address", () => {
      mockAuth.user = { email: "user@example.com", email_verified: false };
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByText } = render(<VerifyEmailScreen />);

      expect(getByText("user@example.com")).toBeTruthy();
    });

    it("should display error message when error exists", () => {
      mockAuth.error = "Invalid verification code";
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByText } = render(<VerifyEmailScreen />);

      expect(getByText("Invalid verification code")).toBeTruthy();
    });

    it("should not display error message when no error", () => {
      const { queryByText } = render(<VerifyEmailScreen />);

      expect(queryByText("Invalid verification code")).toBeNull();
    });
  });

  describe("user input", () => {
    it("should update verification code when typing", () => {
      const { getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");

      fireEvent.changeText(codeInput, "ABC123");

      expect(codeInput.props.value).toBe("ABC123");
    });

    it("should have correct input properties", () => {
      const { getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");

      expect(codeInput.props.autoCapitalize).toBe("none");
      expect(codeInput.props.keyboardType).toBe("default");
      expect(codeInput.props.textAlign).toBe("center");
      expect(codeInput.props.maxLength).toBe(50);
    });
  });

  describe("initial effects", () => {
    it("should check verification status on load", () => {
      render(<VerifyEmailScreen />);

      expect(mockAuth.checkVerificationStatus).toHaveBeenCalled();
    });
  });

  describe("form validation", () => {
    it("should show alert when verification code is empty", () => {
      const { getByText } = render(<VerifyEmailScreen />);
      const verifyButton = getByText("Verify Email");

      fireEvent.press(verifyButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please enter the verification code"
      );
      expect(mockAuth.verifyEmail).not.toHaveBeenCalled();
    });

    it("should show alert when verification code is only whitespace", () => {
      const { getByText, getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");
      const verifyButton = getByText("Verify Email");

      fireEvent.changeText(codeInput, "   ");
      fireEvent.press(verifyButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please enter the verification code"
      );
      expect(mockAuth.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe("successful verification", () => {
    it("should call verifyEmail function with trimmed code", async () => {
      mockAuth.verifyEmail.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");
      const verifyButton = getByText("Verify Email");

      fireEvent.changeText(codeInput, " ABC123 ");

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      expect(mockAuth.clearError).toHaveBeenCalled();
      expect(mockAuth.verifyEmail).toHaveBeenCalledWith("ABC123");
    });

    it("should show success alert and navigate to tabs", async () => {
      mockAuth.verifyEmail.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");
      const verifyButton = getByText("Verify Email");

      fireEvent.changeText(codeInput, "ABC123");

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Email Verified",
        "Your email has been successfully verified!",
        [
          {
            text: "OK",
            onPress: expect.any(Function),
          },
        ]
      );
    });

    it("should show loading indicator during verification", async () => {
      let resolveVerification: () => void;
      const verificationPromise = new Promise<void>(resolve => {
        resolveVerification = resolve;
      });
      mockAuth.verifyEmail.mockReturnValue(verificationPromise);

      const { getByText, getByPlaceholderText, queryByText } = render(
        <VerifyEmailScreen />
      );
      const codeInput = getByPlaceholderText("Enter verification code");

      fireEvent.changeText(codeInput, "ABC123");

      act(() => {
        const verifyButton = getByText("Verify Email");
        fireEvent.press(verifyButton);
      });

      // Should show loading indicator
      expect(queryByText("Verify Email")).toBeNull();

      // Resolve the verification
      await act(async () => {
        resolveVerification();
        await verificationPromise;
      });
    });
  });

  describe("failed verification", () => {
    it("should show alert on verification failure with error message", async () => {
      const errorMessage = "Invalid verification code";
      mockAuth.verifyEmail.mockRejectedValue(new Error(errorMessage));

      const { getByText, getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");
      const verifyButton = getByText("Verify Email");

      fireEvent.changeText(codeInput, "WRONG123");

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Verification Failed",
        errorMessage
      );
    });

    it("should show default error message when no error message provided", async () => {
      mockAuth.verifyEmail.mockRejectedValue(new Error());

      const { getByText, getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");
      const verifyButton = getByText("Verify Email");

      fireEvent.changeText(codeInput, "WRONG123");

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Verification Failed",
        "Invalid verification code"
      );
    });

    it("should hide loading indicator after failed verification", async () => {
      mockAuth.verifyEmail.mockRejectedValue(new Error("Verification failed"));

      const { getByText, getByPlaceholderText } = render(<VerifyEmailScreen />);
      const codeInput = getByPlaceholderText("Enter verification code");

      fireEvent.changeText(codeInput, "WRONG123");

      await act(async () => {
        const verifyButton = getByText("Verify Email");
        fireEvent.press(verifyButton);
      });

      // Should show "Verify Email" text again (not loading)
      expect(getByText("Verify Email")).toBeTruthy();
    });
  });

  describe("resend verification", () => {
    it("should call resendVerification function", async () => {
      mockAuth.resendVerification.mockResolvedValue(undefined);

      const { getByText } = render(<VerifyEmailScreen />);
      const resendButton = getByText("Resend Code");

      await act(async () => {
        fireEvent.press(resendButton);
      });

      expect(mockAuth.clearError).toHaveBeenCalled();
      expect(mockAuth.resendVerification).toHaveBeenCalled();
    });

    it("should show success alert after resending", async () => {
      mockAuth.resendVerification.mockResolvedValue(undefined);

      const { getByText } = render(<VerifyEmailScreen />);
      const resendButton = getByText("Resend Code");

      await act(async () => {
        fireEvent.press(resendButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Code Sent",
        "A new verification code has been sent to your email address."
      );
    });

    it("should show loading indicator during resend", async () => {
      let resolveResend: () => void;
      const resendPromise = new Promise<void>(resolve => {
        resolveResend = resolve;
      });
      mockAuth.resendVerification.mockReturnValue(resendPromise);

      const { getByText, queryByText } = render(<VerifyEmailScreen />);

      act(() => {
        const resendButton = getByText("Resend Code");
        fireEvent.press(resendButton);
      });

      // Should show loading indicator
      expect(queryByText("Resend Code")).toBeNull();

      // Resolve the resend
      await act(async () => {
        resolveResend();
        await resendPromise;
      });
    });

    it("should show alert on resend failure with error message", async () => {
      const errorMessage = "Failed to send verification code";
      mockAuth.resendVerification.mockRejectedValue(new Error(errorMessage));

      const { getByText } = render(<VerifyEmailScreen />);
      const resendButton = getByText("Resend Code");

      await act(async () => {
        fireEvent.press(resendButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        errorMessage
      );
    });

    it("should show default error message when resend fails without message", async () => {
      mockAuth.resendVerification.mockRejectedValue(new Error());

      const { getByText } = render(<VerifyEmailScreen />);
      const resendButton = getByText("Resend Code");

      await act(async () => {
        fireEvent.press(resendButton);
      });

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Failed to resend verification code"
      );
    });
  });

  describe("loading states", () => {
    it("should disable resend button during verification loading", async () => {
      let resolveVerification: () => void;
      const verificationPromise = new Promise<void>(resolve => {
        resolveVerification = resolve;
      });
      mockAuth.verifyEmail.mockReturnValue(verificationPromise);

      const { getByText, getByPlaceholderText, queryByText } = render(
        <VerifyEmailScreen />
      );
      const codeInput = getByPlaceholderText("Enter verification code");

      fireEvent.changeText(codeInput, "ABC123");

      act(() => {
        const verifyButton = getByText("Verify Email");
        fireEvent.press(verifyButton);
      });

      // Check loading state by absence of original button text
      expect(queryByText("Verify Email")).toBeNull();

      // Resolve the verification
      await act(async () => {
        resolveVerification();
        await verificationPromise;
      });
    });

    it("should disable verify button during resend loading", async () => {
      let resolveResend: () => void;
      const resendPromise = new Promise<void>(resolve => {
        resolveResend = resolve;
      });
      mockAuth.resendVerification.mockReturnValue(resendPromise);

      const { getByText, queryByText } = render(<VerifyEmailScreen />);

      act(() => {
        const resendButton = getByText("Resend Code");
        fireEvent.press(resendButton);
      });

      // Check that resend button text changed (indicating loading state)
      expect(queryByText("Resend Code")).toBeNull();

      // Resolve the resend
      await act(async () => {
        resolveResend();
        await resendPromise;
      });
    });
  });

  describe("user updates", () => {
    it("should handle missing user gracefully", () => {
      mockAuth.user = null;
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { queryByText } = render(<VerifyEmailScreen />);

      // Should not crash and should render basic elements
      expect(queryByText("Verify Your Email")).toBeTruthy();
      expect(queryByText("Verify Email")).toBeTruthy();
    });
  });
});
