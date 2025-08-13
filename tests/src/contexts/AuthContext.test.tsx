import React from "react";
import { renderHook, act } from "@testing-library/react-native";

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
import { User } from "@src/types";

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
});
