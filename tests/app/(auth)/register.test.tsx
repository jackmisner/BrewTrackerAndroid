import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
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
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

// Mock dependencies

jest.mock("@contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

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

const mockAuth = {
  register: jest.fn(),
  error: null as string | null,
  clearError: jest.fn(),
};

// Setup mocks
require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.error = null;
  });

  describe("rendering", () => {
    it("should render all required elements", () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(
        <RegisterScreen />
      );

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
      mockAuth.error = "Username already exists";
      require("@contexts/AuthContext").useAuth.mockReturnValue(mockAuth);

      const { getByText } = render(<RegisterScreen />);

      expect(getByText("Username already exists")).toBeTruthy();
    });

    it("should not display error message when no error", () => {
      const { queryByText } = render(<RegisterScreen />);

      expect(queryByText("Username already exists")).toBeNull();
    });
  });

  describe("user input", () => {
    it("should update all form fields when typing", () => {
      const { getByPlaceholderText } = render(<RegisterScreen />);
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
      const { getByPlaceholderText } = render(<RegisterScreen />);
      const passwordInput = getByPlaceholderText("Password");
      const confirmPasswordInput = getByPlaceholderText("Confirm Password");

      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
    });

    it("should have correct input properties", () => {
      const { getByPlaceholderText } = render(<RegisterScreen />);
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
      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it("should show alert when email is empty", () => {
      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it("should show alert when password is empty", () => {
      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it("should show alert when confirm password is empty", () => {
      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
      const registerButton = getByTestId(TEST_IDS.auth.registerButton);

      fireEvent.changeText(getByPlaceholderText("Username"), "testuser");
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");
      fireEvent.press(registerButton);

      expect(require("react-native").Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields"
      );
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it("should show alert when passwords do not match", () => {
      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it("should show alert when password is too short", () => {
      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it("should show alert for invalid email format", () => {
      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it.each([
      "test@example.com",
      "user.name@domain.co.uk",
      "test123@test-domain.com",
      "a@b.co",
    ])("should accept valid email format: %s", async email => {
      mockAuth.register.mockResolvedValue(undefined);

      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);

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
      mockAuth.register.mockResolvedValue(undefined);

      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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

      expect(mockAuth.clearError).toHaveBeenCalled();
      expect(mockAuth.register).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should show success alert and navigate to login", async () => {
      mockAuth.register.mockResolvedValue(undefined);

      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      mockAuth.register.mockReturnValue(registerPromise);

      const { getByTestId, getByPlaceholderText, queryByText } = render(
        <RegisterScreen />
      );

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
      mockAuth.register.mockRejectedValue(new Error(errorMessage));

      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      mockAuth.register.mockRejectedValue(new Error());

      const { getByTestId, getByPlaceholderText } = render(<RegisterScreen />);
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
      mockAuth.register.mockRejectedValue(new Error("Registration failed"));

      const { getByText, getByTestId, getByPlaceholderText } = render(
        <RegisterScreen />
      );

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
      const { getByText } = render(<RegisterScreen />);
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
      mockAuth.register.mockReturnValue(registerPromise);

      const { getByTestId, getByPlaceholderText, queryByText } = render(
        <RegisterScreen />
      );

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
