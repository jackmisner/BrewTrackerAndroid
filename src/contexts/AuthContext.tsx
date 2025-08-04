import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, LoginRequest, RegisterRequest } from "../types";
import ApiService from "../services/API/apiService";
import { STORAGE_KEYS } from "../services/config";

// Auth context interface
interface AuthContextValue {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;

  // Google Auth
  signInWithGoogle: (token: string) => Promise<void>;

  // Email verification
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
}

// Provider props interface
interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Check if we have a stored token
      const token = await ApiService.token.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Try to get user profile with the stored token
      const response = await ApiService.auth.getProfile();
      setUser(response.data.user);

      // Also load cached user data if available
      const cachedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        // Use the fresh data from API, but fallback to cached if API fails
        setUser(response.data.user || parsedUser);
      }
    } catch (error: any) {
      console.error("Failed to initialize auth:", error);

      // If token is invalid, clear it
      if (error.response?.status === 401) {
        await ApiService.token.removeToken();
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      }

      // Try to use cached user data as fallback
      try {
        const cachedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }
      } catch (cacheError) {
        console.error("Failed to load cached user:", cacheError);
      }

      setError("Failed to initialize authentication");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await ApiService.auth.login(credentials);
      const { access_token, user: userData } = response.data;

      // Store token securely
      await ApiService.token.setToken(access_token);

      // Cache user data
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );

      setUser(userData);
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.response?.data?.message || "Login failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await ApiService.auth.register(userData);

      // If registration includes auto-login (returns user data)
      if (response.data.user) {
        setUser(response.data.user);
        // Note: Token should be handled if provided
      }
    } catch (error: any) {
      console.error("Registration failed:", error);
      setError(error.response?.data?.message || "Registration failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await ApiService.auth.googleAuth({ token });
      const { access_token, user: userData } = response.data;

      // Store token securely
      await ApiService.token.setToken(access_token);

      // Cache user data
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );

      setUser(userData);
    } catch (error: any) {
      console.error("Google sign-in failed:", error);
      setError(error.response?.data?.message || "Google sign-in failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Clear secure storage
      await ApiService.token.removeToken();

      // Clear cached data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_SETTINGS,
        STORAGE_KEYS.OFFLINE_RECIPES,
        STORAGE_KEYS.CACHED_INGREDIENTS,
      ]);

      setUser(null);
      setError(null);
    } catch (error: any) {
      console.error("Logout failed:", error);
      // Even if logout fails, clear local state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (!user) return;

      const response = await ApiService.auth.getProfile();
      const userData = response.data.user;

      // Update cached data
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );

      setUser(userData);
    } catch (error: any) {
      console.error("Failed to refresh user:", error);
      // Don't set error state for refresh failures unless it's a 401
      if (error.response?.status === 401) {
        await logout();
      }
    }
  };

  const verifyEmail = async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await ApiService.auth.verifyEmail({ token });

      // If verification includes auto-login
      if (response.data.access_token && response.data.user) {
        await ApiService.token.setToken(response.data.access_token);
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(response.data.user)
        );
        setUser(response.data.user);
      } else if (user) {
        // Just refresh the current user to get updated verification status
        await refreshUser();
      }
    } catch (error: any) {
      console.error("Email verification failed:", error);
      setError(error.response?.data?.message || "Email verification failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async (): Promise<void> => {
    try {
      setError(null);
      await ApiService.auth.resendVerification();
    } catch (error: any) {
      console.error("Failed to resend verification:", error);
      setError(
        error.response?.data?.message || "Failed to resend verification"
      );
      throw error;
    }
  };

  const checkVerificationStatus = async (): Promise<void> => {
    try {
      const response = await ApiService.auth.getVerificationStatus();

      // Update user with verification status if needed
      if (user && user.email_verified !== response.data.email_verified) {
        const updatedUser = {
          ...user,
          email_verified: response.data.email_verified,
        };
        setUser(updatedUser);
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(updatedUser)
        );
      }
    } catch (error: any) {
      console.error("Failed to check verification status:", error);
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const contextValue: AuthContextValue = {
    // State
    user,
    isLoading,
    isAuthenticated: !!user,
    error,

    // Actions
    login,
    register,
    logout,
    refreshUser,
    clearError,

    // Google Auth
    signInWithGoogle,

    // Email verification
    verifyEmail,
    resendVerification,
    checkVerificationStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;
