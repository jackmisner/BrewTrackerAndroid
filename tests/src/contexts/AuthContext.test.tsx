import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Text, TouchableOpacity } from "react-native";

// Mock ApiService using manual mock file
jest.mock("@services/API/apiService");

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("@services/config", () => ({
  API_CONFIG: {
    BASE_URL: "http://localhost:5000/api",
    TIMEOUT: 10000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    DEBUG_MODE: false,
    LOG_LEVEL: "info",
  },
  STORAGE_KEYS: {
    ACCESS_TOKEN: "access_token",
    USER_DATA: "user_data",
    USER_SETTINGS: "user_settings",
    OFFLINE_RECIPES: "offline_recipes",
    CACHED_INGREDIENTS: "cached_ingredients",
    LAST_SYNC: "last_sync",
  },
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      REGISTER: "/auth/register",
      GOOGLE_AUTH: "/auth/google",
      PROFILE: "/auth/profile",
      VERIFY_EMAIL: "/auth/verify-email",
      RESEND_VERIFICATION: "/auth/resend-verification",
      VALIDATE_USERNAME: "/auth/validate-username",
    },
  },
}));

// Now import the modules after mocking
import { AuthProvider, useAuth } from "@src/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "@services/API/apiService";

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

// Get direct references to the mock functions for easier access
const mockTokenService = mockApiService.token;
const mockAuthService = mockApiService.auth;

// Test component that uses AuthContext
interface TestComponentProps {
  onAuthStateChange?: (isAuthenticated: boolean) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ onAuthStateChange }) => {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    refreshUser,
    clearError,
    signInWithGoogle,
    verifyEmail,
    resendVerification,
    checkVerificationStatus,
  } = useAuth();

  React.useEffect(() => {
    onAuthStateChange?.(isAuthenticated);
  }, [isAuthenticated, onAuthStateChange]);

  return (
    <>
      <Text testID="loading">{isLoading ? "loading" : "not-loading"}</Text>
      <Text testID="authenticated">
        {isAuthenticated ? "authenticated" : "not-authenticated"}
      </Text>
      <Text testID="user">{user ? user.username : "no-user"}</Text>
      <Text testID="error">{error || "no-error"}</Text>
      <TouchableOpacity
        testID="login-button"
        onPress={() => login({ username: "testuser", password: "password123" })}
      >
        <Text>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="register-button"
        onPress={() =>
          register({
            username: "newuser",
            email: "new@example.com",
            password: "password",
          })
        }
      >
        <Text>Register</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="logout-button" onPress={() => logout()}>
        <Text>Logout</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="refresh-button" onPress={() => refreshUser()}>
        <Text>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="clear-error-button"
        onPress={() => clearError()}
      >
        <Text>Clear Error</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="google-login-button"
        onPress={() => signInWithGoogle("google-token")}
      >
        <Text>Google Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="verify-email-button"
        onPress={() => verifyEmail("verification-token")}
      >
        <Text>Verify Email</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="resend-verification-button"
        onPress={() => resendVerification()}
      >
        <Text>Resend Verification</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="check-verification-button"
        onPress={() => checkVerificationStatus()}
      >
        <Text>Check Verification</Text>
      </TouchableOpacity>
    </>
  );
};

// Test data
const mockUser = {
  user_id: "test-user-id",
  username: "testuser",
  email: "test@example.com",
  email_verified: true,
};

const mockCredentials = {
  username: "testuser",
  password: "password123",
};

const mockRegistrationData = {
  username: "newuser",
  email: "new@example.com",
  password: "password",
};

describe("AuthContext", () => {
  const renderTestComponent = (
    onAuthStateChange?: (isAuthenticated: boolean) => void
  ) => {
    return render(
      <AuthProvider>
        <TestComponent onAuthStateChange={onAuthStateChange} />
      </AuthProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mock implementations
    mockTokenService.getToken.mockResolvedValue(null);
    mockTokenService.setToken.mockResolvedValue(undefined);
    mockTokenService.removeToken.mockResolvedValue(undefined);

    // Mock auth service methods with safe default implementations
    mockAuthService.login.mockImplementation(() =>
      Promise.reject(new Error("Mock not configured for this test"))
    );
    mockAuthService.register.mockImplementation(() =>
      Promise.reject(new Error("Mock not configured for this test"))
    );
    mockAuthService.getProfile.mockImplementation(() =>
      Promise.reject(new Error("Mock not configured for this test"))
    );
    mockAuthService.googleAuth.mockImplementation(() =>
      Promise.reject(new Error("Mock not configured for this test"))
    );
    mockAuthService.verifyEmail.mockImplementation(() =>
      Promise.reject(new Error("Mock not configured for this test"))
    );
    mockAuthService.resendVerification.mockImplementation(() =>
      Promise.reject(new Error("Mock not configured for this test"))
    );
    mockAuthService.getVerificationStatus.mockImplementation(() =>
      Promise.reject(new Error("Mock not configured for this test"))
    );
    mockAuthService.validateUsername.mockResolvedValue({
      data: { valid: true },
    });

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined);
  });

  describe("Initial State", () => {
    it("should initialize with unauthenticated state", async () => {
      const { getByTestId } = renderTestComponent();

      await waitFor(() => {
        expect(getByTestId("loading")).toHaveTextContent("not-loading");
        expect(getByTestId("authenticated")).toHaveTextContent(
          "not-authenticated"
        );
        expect(getByTestId("user")).toHaveTextContent("no-user");
        expect(getByTestId("error")).toHaveTextContent("no-error");
      });
    });

    it("should restore authenticated state from stored token", async () => {
      mockTokenService.getToken.mockResolvedValue("stored-token");
      mockAuthService.getProfile.mockResolvedValue({ data: mockUser });

      const { getByTestId } = renderTestComponent();

      await waitFor(() => {
        expect(getByTestId("authenticated")).toHaveTextContent("authenticated");
        expect(getByTestId("user")).toHaveTextContent("testuser");
      });

      expect(mockTokenService.getToken).toHaveBeenCalled();
      expect(mockAuthService.getProfile).toHaveBeenCalled();
    });
  });

  describe("Login Flow", () => {
    it("should successfully log in user and update state", async () => {
      mockAuthService.login.mockResolvedValue({
        data: { access_token: "new-token", user: mockUser },
      });

      const authStateChangeSpy = jest.fn();
      const { getByTestId } = renderTestComponent(authStateChangeSpy);

      await act(async () => {
        fireEvent.press(getByTestId("login-button"));
      });

      await waitFor(() => {
        expect(getByTestId("authenticated")).toHaveTextContent("authenticated");
        expect(getByTestId("user")).toHaveTextContent("testuser");
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(mockCredentials);
      expect(mockTokenService.setToken).toHaveBeenCalledWith("new-token");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "user_data",
        JSON.stringify(mockUser)
      );
      expect(authStateChangeSpy).toHaveBeenCalledWith(true);
    });
  });

  describe("Registration Flow", () => {
    it("should successfully register user", async () => {
      mockAuthService.register.mockResolvedValue({
        data: { user: mockUser },
      });

      const { getByTestId } = renderTestComponent();

      await act(async () => {
        fireEvent.press(getByTestId("register-button"));
      });

      await waitFor(() => {
        expect(getByTestId("user")).toHaveTextContent("testuser");
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(
        mockRegistrationData
      );
    });
  });

  describe("Logout Flow", () => {
    it("should successfully log out user and clear state", async () => {
      // First log in
      mockAuthService.login.mockResolvedValue({
        data: { access_token: "token", user: mockUser },
      });

      const authStateChangeSpy = jest.fn();
      const { getByTestId } = renderTestComponent(authStateChangeSpy);

      await act(async () => {
        fireEvent.press(getByTestId("login-button"));
      });

      await waitFor(() => {
        expect(getByTestId("authenticated")).toHaveTextContent("authenticated");
      });

      // Then log out
      await act(async () => {
        fireEvent.press(getByTestId("logout-button"));
      });

      await waitFor(() => {
        expect(getByTestId("authenticated")).toHaveTextContent(
          "not-authenticated"
        );
        expect(getByTestId("user")).toHaveTextContent("no-user");
      });

      expect(mockTokenService.removeToken).toHaveBeenCalled();
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        "user_data",
        "user_settings",
        "offline_recipes",
        "cached_ingredients",
      ]);
      expect(authStateChangeSpy).toHaveBeenCalledWith(false);
    });
  });

  describe("Google Authentication", () => {
    it("should successfully sign in with Google", async () => {
      mockAuthService.googleAuth.mockResolvedValue({
        data: { access_token: "google-token", user: mockUser },
      });

      const { getByTestId } = renderTestComponent();

      await act(async () => {
        fireEvent.press(getByTestId("google-login-button"));
      });

      await waitFor(() => {
        expect(getByTestId("authenticated")).toHaveTextContent("authenticated");
        expect(getByTestId("user")).toHaveTextContent("testuser");
      });

      expect(mockAuthService.googleAuth).toHaveBeenCalledWith({
        token: "google-token",
      });
      expect(mockTokenService.setToken).toHaveBeenCalledWith("google-token");
    });
  });

  describe("Email Verification", () => {
    it("should successfully verify email with auto-login", async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        data: { access_token: "verify-token", user: mockUser },
      });

      const { getByTestId } = renderTestComponent();

      await act(async () => {
        fireEvent.press(getByTestId("verify-email-button"));
      });

      await waitFor(() => {
        expect(getByTestId("authenticated")).toHaveTextContent("authenticated");
      });

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith({
        token: "verification-token",
      });
      expect(mockTokenService.setToken).toHaveBeenCalledWith("verify-token");
    });

    it("should resend verification email", async () => {
      mockAuthService.resendVerification.mockResolvedValue({ data: {} });

      const { getByTestId } = renderTestComponent();

      await act(async () => {
        fireEvent.press(getByTestId("resend-verification-button"));
      });

      expect(mockAuthService.resendVerification).toHaveBeenCalled();
    });
  });

  describe("User Refresh", () => {
    it("should refresh user profile when logged in", async () => {
      // First log in
      mockAuthService.login.mockResolvedValue({
        data: { access_token: "token", user: mockUser },
      });

      const { getByTestId } = renderTestComponent();

      await act(async () => {
        fireEvent.press(getByTestId("login-button"));
      });

      await waitFor(() => {
        expect(getByTestId("authenticated")).toHaveTextContent("authenticated");
      });

      // Setup refresh response
      const updatedUser = { ...mockUser, username: "updated-user" };
      mockAuthService.getProfile.mockResolvedValue({ data: updatedUser });

      // Refresh user
      await act(async () => {
        fireEvent.press(getByTestId("refresh-button"));
      });

      await waitFor(() => {
        expect(getByTestId("user")).toHaveTextContent("updated-user");
      });

      expect(mockAsyncStorage.setItem).toHaveBeenLastCalledWith(
        "user_data",
        JSON.stringify(updatedUser)
      );
    });
  });

  describe("Context Provider", () => {
    it("should throw error when useAuth is used outside AuthProvider", () => {
      const TestOutsideProvider = () => {
        const auth = useAuth();
        return (
          <Text>
            {auth.isAuthenticated ? "authenticated" : "not-authenticated"}
          </Text>
        );
      };

      expect(() => render(<TestOutsideProvider />)).toThrow(
        "useAuth must be used within an AuthProvider"
      );
    });
  });

  describe("Verification Status", () => {
    it("should check and update verification status", async () => {
      // First log in with unverified user
      const unverifiedUser = { ...mockUser, email_verified: false };
      mockAuthService.login.mockResolvedValue({
        data: { access_token: "token", user: unverifiedUser },
      });

      const { getByTestId } = renderTestComponent();

      await act(async () => {
        fireEvent.press(getByTestId("login-button"));
      });

      // Setup verification status response
      mockAuthService.getVerificationStatus.mockResolvedValue({
        data: { email_verified: true },
      });

      // Check verification status
      await act(async () => {
        fireEvent.press(getByTestId("check-verification-button"));
      });

      expect(mockAuthService.getVerificationStatus).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "user_data",
        JSON.stringify({ ...unverifiedUser, email_verified: true })
      );
    });
  });
});
