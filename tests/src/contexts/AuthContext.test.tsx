import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "@services/api/apiService";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    token: {
      getToken: jest.fn(() => Promise.resolve(null)),
      setToken: jest.fn(() => Promise.resolve()),
      removeToken: jest.fn(() => Promise.resolve()),
    },
    auth: {
      login: jest.fn(),
      register: jest.fn(),
      getProfile: jest.fn(),
      googleAuth: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      getVerificationStatus: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    },
  },
}));

jest.mock("@services/config", () => ({
  STORAGE_KEYS: {
    USER_DATA: "userData",
    USER_SETTINGS: "userSettings",
    OFFLINE_RECIPES: "offlineRecipes",
    CACHED_INGREDIENTS: "cachedIngredients",
  },
}));

import { AuthProvider, useAuth } from "../../../src/contexts/AuthContext";
import { User, LoginRequest, RegisterRequest } from "@src/types";

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "user-123",
  username: "testuser",
  email: "test@example.com",
  email_verified: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  is_active: true,
  ...overrides,
});

const createWrapper = (initialAuthState?: any) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthProvider, { initialAuthState, children });
};

describe("AuthContext", () => {
  it("should throw error when useAuth used outside provider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });

  it("should initialize with provided initial state", () => {
    const mockUser = createMockUser();
    const initialState = {
      user: mockUser,
      isAuthenticated: true,
      error: null,
    };

    const wrapper = createWrapper(initialState);
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should provide all expected context methods", () => {
    const wrapper = createWrapper({ user: null });
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Check all expected methods exist
    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.register).toBe("function");
    expect(typeof result.current.logout).toBe("function");
    expect(typeof result.current.refreshUser).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
    expect(typeof result.current.signInWithGoogle).toBe("function");
    expect(typeof result.current.verifyEmail).toBe("function");
    expect(typeof result.current.resendVerification).toBe("function");
    expect(typeof result.current.checkVerificationStatus).toBe("function");
    expect(typeof result.current.forgotPassword).toBe("function");
    expect(typeof result.current.resetPassword).toBe("function");
  });

  it("should calculate isAuthenticated based on user presence", () => {
    const mockUser = createMockUser();

    const authenticatedWrapper = createWrapper({ user: mockUser });
    const { result: authenticatedResult } = renderHook(() => useAuth(), {
      wrapper: authenticatedWrapper,
    });
    expect(authenticatedResult.current.isAuthenticated).toBe(true);

    const unauthenticatedWrapper = createWrapper({ user: null });
    const { result: unauthenticatedResult } = renderHook(() => useAuth(), {
      wrapper: unauthenticatedWrapper,
    });
    expect(unauthenticatedResult.current.isAuthenticated).toBe(false);
  });

  it("should clear error when clearError is called", () => {
    const wrapper = createWrapper({ error: "Test error" });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.error).toBe("Test error");

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should initialize with correct default values", () => {
    const wrapper = createWrapper({
      user: null,
      isAuthenticated: false,
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  describe("initializeAuth", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should initialize auth when no token is stored", async () => {
      mockApiService.token.getToken.mockResolvedValue(null);
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(mockApiService.token.getToken).toHaveBeenCalled();
    });

    it("should initialize auth with valid token and user profile", async () => {
      const mockUser = createMockUser();
      mockApiService.token.getToken.mockResolvedValue("valid-token");
      mockApiService.auth.getProfile.mockResolvedValue({ data: mockUser });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockApiService.auth.getProfile).toHaveBeenCalled();
    });

    it("should handle 401 error by clearing token and user data", async () => {
      mockApiService.token.getToken.mockResolvedValue("invalid-token");
      mockApiService.auth.getProfile.mockRejectedValue({
        response: { status: 401 },
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockApiService.token.removeToken).toHaveBeenCalled();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("userData");
      expect(result.current.error).toBe("Failed to initialize authentication");
    });

    it("should use cached user data when API fails", async () => {
      const mockUser = createMockUser();
      mockApiService.token.getToken.mockResolvedValue("token");
      mockApiService.auth.getProfile.mockRejectedValue(new Error("Network error"));
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockUser));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.user).toEqual(mockUser);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("userData");
    });
  });

  describe("login", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should successfully login user", async () => {
      const mockUser = createMockUser();
      const credentials: LoginRequest = {
        username: "testuser",
        password: "password123",
      };
      const loginResponse = {
        data: {
          access_token: "new-token",
          user: mockUser,
        },
      };

      mockApiService.auth.login.mockResolvedValue(loginResponse);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockApiService.auth.login).toHaveBeenCalledWith(credentials);
      expect(mockApiService.token.setToken).toHaveBeenCalledWith("new-token");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "userData",
        JSON.stringify(mockUser)
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle login failure", async () => {
      const credentials: LoginRequest = {
        username: "testuser",
        password: "wrongpassword",
      };
      const error = {
        response: { data: { message: "Invalid credentials" } },
      };

      mockApiService.auth.login.mockRejectedValue(error);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Invalid credentials");
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should set generic error message when no specific message provided", async () => {
      const credentials: LoginRequest = {
        username: "testuser",
        password: "password",
      };

      mockApiService.auth.login.mockRejectedValue(new Error("Network error"));

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Login failed");
    });
  });

  describe("register", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should successfully register user", async () => {
      const mockUser = createMockUser();
      const userData: RegisterRequest = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      };
      const registerResponse = {
        data: { user: mockUser },
      };

      mockApiService.auth.register.mockResolvedValue(registerResponse);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(userData);
      });

      expect(mockApiService.auth.register).toHaveBeenCalledWith(userData);
      expect(result.current.user).toEqual(mockUser);
    });

    it("should handle registration without auto-login", async () => {
      const userData: RegisterRequest = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      };
      const registerResponse = {
        data: { message: "Registration successful" },
      };

      mockApiService.auth.register.mockResolvedValue(registerResponse);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(userData);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should handle registration failure", async () => {
      const userData: RegisterRequest = {
        username: "existinguser",
        email: "existing@example.com",
        password: "password123",
      };
      const error = {
        response: { data: { message: "Username already exists" } },
      };

      mockApiService.auth.register.mockRejectedValue(error);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.register(userData);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Username already exists");
    });
  });

  describe("signInWithGoogle", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should successfully sign in with Google", async () => {
      const mockUser = createMockUser();
      const googleToken = "google-auth-token";
      const googleResponse = {
        data: {
          access_token: "new-token",
          user: mockUser,
        },
      };

      mockApiService.auth.googleAuth.mockResolvedValue(googleResponse);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle(googleToken);
      });

      expect(mockApiService.auth.googleAuth).toHaveBeenCalledWith({ token: googleToken });
      expect(mockApiService.token.setToken).toHaveBeenCalledWith("new-token");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "userData",
        JSON.stringify(mockUser)
      );
      expect(result.current.user).toEqual(mockUser);
    });

    it("should handle Google sign-in failure", async () => {
      const googleToken = "invalid-google-token";
      const error = {
        response: { data: { message: "Invalid Google token" } },
      };

      mockApiService.auth.googleAuth.mockRejectedValue(error);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.signInWithGoogle(googleToken);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Invalid Google token");
    });
  });

  describe("logout", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should successfully logout user", async () => {
      const mockUser = createMockUser();
      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockApiService.token.removeToken).toHaveBeenCalled();
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        "userData",
        "userSettings",
        "offlineRecipes",
        "cachedIngredients",
      ]);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should clear user state even if logout fails", async () => {
      const mockUser = createMockUser();
      mockApiService.token.removeToken.mockRejectedValue(new Error("Logout failed"));

      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("refreshUser", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should refresh user profile", async () => {
      const mockUser = createMockUser();
      const updatedUser = { ...mockUser, username: "updateduser" };
      
      mockApiService.auth.getProfile.mockResolvedValue({ data: updatedUser });

      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockApiService.auth.getProfile).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "userData",
        JSON.stringify(updatedUser)
      );
      expect(result.current.user).toEqual(updatedUser);
    });

    it("should not refresh when no user is logged in", async () => {
      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockApiService.auth.getProfile).not.toHaveBeenCalled();
    });

    it("should logout on 401 error during refresh", async () => {
      const mockUser = createMockUser();
      mockApiService.auth.getProfile.mockRejectedValue({
        response: { status: 401 },
      });

      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockApiService.token.removeToken).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe("verifyEmail", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should verify email with auto-login", async () => {
      const mockUser = createMockUser({ email_verified: true });
      const verificationToken = "verification-token";
      const verifyResponse = {
        data: {
          access_token: "new-token",
          user: mockUser,
        },
      };

      mockApiService.auth.verifyEmail.mockResolvedValue(verifyResponse);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.verifyEmail(verificationToken);
      });

      expect(mockApiService.auth.verifyEmail).toHaveBeenCalledWith({ token: verificationToken });
      expect(mockApiService.token.setToken).toHaveBeenCalledWith("new-token");
      expect(result.current.user).toEqual(mockUser);
    });

    it("should verify email and refresh existing user", async () => {
      const mockUser = createMockUser({ email_verified: false });
      const verificationToken = "verification-token";
      const verifyResponse = { data: { message: "Email verified" } };
      const refreshedUser = { ...mockUser, email_verified: true };

      mockApiService.auth.verifyEmail.mockResolvedValue(verifyResponse);
      mockApiService.auth.getProfile.mockResolvedValue({ data: refreshedUser });

      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.verifyEmail(verificationToken);
      });

      expect(mockApiService.auth.getProfile).toHaveBeenCalled();
    });

    it("should handle email verification failure", async () => {
      const verificationToken = "invalid-token";
      const error = {
        response: { data: { message: "Invalid verification token" } },
      };

      mockApiService.auth.verifyEmail.mockRejectedValue(error);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.verifyEmail(verificationToken);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Invalid verification token");
    });
  });

  describe("resendVerification", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should resend verification email", async () => {
      mockApiService.auth.resendVerification.mockResolvedValue({ data: { message: "Email sent" } });

      const wrapper = createWrapper({ user: createMockUser() });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.resendVerification();
      });

      expect(mockApiService.auth.resendVerification).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it("should handle resend verification failure", async () => {
      const error = {
        response: { data: { message: "Too many requests" } },
      };

      mockApiService.auth.resendVerification.mockRejectedValue(error);

      const wrapper = createWrapper({ user: createMockUser() });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.resendVerification();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Too many requests");
    });
  });

  describe("checkVerificationStatus", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should update user verification status", async () => {
      const mockUser = createMockUser({ email_verified: false });
      const statusResponse = { data: { email_verified: true } };

      mockApiService.auth.getVerificationStatus.mockResolvedValue(statusResponse);

      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.checkVerificationStatus();
      });

      expect(result.current.user?.email_verified).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "userData",
        JSON.stringify({ ...mockUser, email_verified: true })
      );
    });

    it("should not update user if verification status unchanged", async () => {
      const mockUser = createMockUser({ email_verified: true });
      const statusResponse = { data: { email_verified: true } };

      mockApiService.auth.getVerificationStatus.mockResolvedValue(statusResponse);

      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.checkVerificationStatus();
      });

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("should handle verification status check failure silently", async () => {
      const mockUser = createMockUser();
      mockApiService.auth.getVerificationStatus.mockRejectedValue(new Error("Network error"));

      const wrapper = createWrapper({ user: mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.checkVerificationStatus();
      });

      // Should not set error or change user state
      expect(result.current.error).toBeNull();
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe("forgotPassword", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should send forgot password email", async () => {
      const email = "test@example.com";
      mockApiService.auth.forgotPassword.mockResolvedValue({ data: { message: "Email sent" } });

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.forgotPassword(email);
      });

      expect(mockApiService.auth.forgotPassword).toHaveBeenCalledWith({ email });
      expect(result.current.error).toBeNull();
    });

    it("should handle forgot password failure", async () => {
      const email = "nonexistent@example.com";
      const error = {
        response: { data: { error: "Email not found" } },
      };

      mockApiService.auth.forgotPassword.mockRejectedValue(error);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.forgotPassword(email);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Email not found");
    });
  });

  describe("resetPassword", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should reset password successfully", async () => {
      const token = "reset-token";
      const newPassword = "newpassword123";
      mockApiService.auth.resetPassword.mockResolvedValue({ data: { message: "Password reset" } });

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.resetPassword(token, newPassword);
      });

      expect(mockApiService.auth.resetPassword).toHaveBeenCalledWith({
        token,
        new_password: newPassword,
      });
      expect(result.current.error).toBeNull();
    });

    it("should handle password reset failure", async () => {
      const token = "invalid-token";
      const newPassword = "newpassword123";
      const error = {
        response: { data: { error: "Invalid or expired token" } },
      };

      mockApiService.auth.resetPassword.mockRejectedValue(error);

      const wrapper = createWrapper({ user: null });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.resetPassword(token, newPassword);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Invalid or expired token");
    });
  });
});
