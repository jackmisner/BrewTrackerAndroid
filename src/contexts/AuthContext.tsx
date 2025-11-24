/**
 * Authentication Context for BrewTracker Android
 *
 * Provides comprehensive authentication state management including:
 * - User login/logout with JWT token handling
 * - User registration and profile management
 * - Google OAuth authentication
 * - Email verification workflow
 * - Password reset functionality
 * - Secure token storage using Expo SecureStore
 * - Automatic token refresh and validation
 *
 * The context automatically persists user data and handles authentication
 * state initialization on app startup.
 *
 * @example
 * ```typescript
 * const { user, login, logout, isAuthenticated } = useAuth();
 *
 * // Login user
 * await login({ email: 'user@example.com', password: 'password' });
 *
 * // Check authentication status
 * if (isAuthenticated) {
 *   console.log('User logged in:', user.username);
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, LoginRequest, RegisterRequest } from "@src/types";
import ApiService from "@services/api/apiService";
import { STORAGE_KEYS, AUTH_CONFIG } from "@services/config";
import { extractUserIdFromJWT, debugJWTToken } from "@utils/jwtUtils";
import { cacheUtils } from "@services/api/queryClient";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import { BiometricService } from "@services/BiometricService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";
import { TokenValidationService } from "@services/auth/TokenValidationService";
import {
  PermissionService,
  type AuthStatus,
  type PermissionCheck,
} from "@services/auth/PermissionService";
import { DeviceTokenService } from "@services/auth/DeviceTokenService";

/**
 * Authentication context interface defining all available state and actions
 */
interface AuthContextValue {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  error: string | null;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;

  // Actions
  login: (credentials: LoginRequest, rememberDevice?: boolean) => Promise<void>;
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

  // Password reset
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;

  // Biometric authentication (token-based)
  loginWithBiometrics: () => Promise<void>;
  enableBiometrics: (username: string) => Promise<void>;
  disableBiometrics: () => Promise<void>;
  checkBiometricAvailability: () => Promise<void>;

  // Device token management ("Remember This Device")
  hasDeviceToken: () => Promise<boolean>;
  quickLoginWithDeviceToken: () => Promise<void>;

  // JWT utilities
  getUserId: () => Promise<string | null>;

  // Permission helpers
  canViewRecipes: () => PermissionCheck;
  canSaveRecipe: () => PermissionCheck;
  canEditRecipe: () => PermissionCheck;
  canDeleteRecipe: () => PermissionCheck;
  canSyncData: () => PermissionCheck;
}

/**
 * Props for the AuthProvider component
 * Allows for optional initial state injection (useful for testing)
 */
interface AuthProviderProps {
  children: ReactNode;
  initialAuthState?: Partial<Pick<AuthContextValue, "user" | "error">>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Custom hook to access authentication context
 * Must be used within an AuthProvider
 *
 * @returns AuthContextValue with all auth state and actions
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Authentication Provider Component
 *
 * Manages global authentication state and provides auth context to child components.
 * Automatically initializes auth state from stored tokens on app startup.
 * Handles token persistence, user data caching, and auth state synchronization.
 *
 * @param children - Child components that need access to auth context
 * @param initialAuthState - Optional initial state for testing purposes
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialAuthState,
}) => {
  const [user, setUser] = useState<User | null>(initialAuthState?.user || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialAuthState);
  const [error, setError] = useState<string | null>(
    initialAuthState?.error || null
  );
  const [authStatus, setAuthStatus] = useState<AuthStatus>("unauthenticated");
  const [isBiometricAvailable, setIsBiometricAvailable] =
    useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);

  // Initialize authentication state on app start (skip if initial state provided for testing)
  useEffect(() => {
    if (!initialAuthState) {
      initializeAuth();
    }
    // Check biometric availability on mount
    checkBiometricAvailability();
  }, [initialAuthState]);

  /**
   * Helper function to update auth status based on JWT token validation
   * Determines if user is authenticated, expired (grace period), or unauthenticated
   */
  const updateAuthStatus = async (token: string | null): Promise<void> => {
    if (!token) {
      setAuthStatus("unauthenticated");
      return;
    }

    const validation = TokenValidationService.validateToken(token);

    switch (validation.status) {
      case "VALID":
        setAuthStatus("authenticated");
        break;
      case "EXPIRED_IN_GRACE":
        setAuthStatus("expired");
        await UnifiedLogger.warn(
          "auth",
          "JWT token expired but within grace period",
          {
            daysSinceExpiry: validation.daysSinceExpiry,
            gracePeriodDays: TokenValidationService.GRACE_PERIOD_DAYS,
          }
        );
        break;
      case "EXPIRED_BEYOND_GRACE":
      case "INVALID":
        setAuthStatus("unauthenticated");
        // Clear expired/invalid token
        await ApiService.token.removeToken();
        setUser(null);
        await UnifiedLogger.info(
          "auth",
          "JWT token expired beyond grace period"
        );
        break;
    }
  };

  const initializeAuth = async (): Promise<void> => {
    let cachedUser = null;

    try {
      setIsLoading(true);

      // Step 1: Try device token exchange first (non-blocking, with timeout)
      // This enables quick login without requiring user input
      const hasDeviceToken = await DeviceTokenService.hasDeviceToken();
      if (hasDeviceToken) {
        await UnifiedLogger.info(
          "auth",
          "Device token found, attempting quick login"
        );

        try {
          // Set a timeout for device token exchange to avoid blocking on slow networks
          const deviceTokenPromise = DeviceTokenService.exchangeDeviceToken();
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(
              () => reject(new Error("Device token exchange timeout")),
              AUTH_CONFIG.DEVICE_TOKEN_TIMEOUT
            )
          );

          const result = await Promise.race([
            deviceTokenPromise,
            timeoutPromise,
          ]);

          if (result && result.success && result.access_token && result.user) {
            // Device token exchange successful - store new JWT and update user
            await ApiService.token.setToken(result.access_token);
            await AsyncStorage.setItem(
              STORAGE_KEYS.USER_DATA,
              JSON.stringify(result.user)
            );
            setUser(result.user as User);
            await updateAuthStatus(result.access_token);

            await UnifiedLogger.info(
              "auth",
              "Quick login with device token successful"
            );

            // Cache ingredients in background
            StaticDataService.updateIngredientsCache().catch(error =>
              console.warn(
                "Failed to cache ingredients after quick login:",
                error
              )
            );

            return; // Exit early - user is authenticated
          }
        } catch (deviceTokenError) {
          // Device token exchange failed/timed out - continue with JWT validation
          await UnifiedLogger.warn(
            "auth",
            "Device token exchange failed, falling back to JWT validation",
            deviceTokenError
          );
        }
      }

      // Step 2: Check if we have a stored JWT token
      const token = await ApiService.token.getToken();
      if (!token) {
        setAuthStatus("unauthenticated");
        return;
      }

      // Step 3: Validate JWT token offline
      await updateAuthStatus(token);

      // Step 4: Load cached user data for immediate UI hydration
      try {
        const cachedUserData = await AsyncStorage.getItem(
          STORAGE_KEYS.USER_DATA
        );
        if (cachedUserData) {
          cachedUser = JSON.parse(cachedUserData);
          setUser(cachedUser);
        }
      } catch (parseError) {
        await UnifiedLogger.warn(
          "auth",
          "Corrupted cached user data, removing",
          parseError
        );
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        cachedUser = null;
      }

      // Step 5: Try to fetch fresh profile data from API (with timeout)
      try {
        const profilePromise = ApiService.auth.getProfile();
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(
            () => reject(new Error("Profile fetch timeout")),
            AUTH_CONFIG.PROFILE_FETCH_TIMEOUT
          )
        );

        const response = await Promise.race([profilePromise, timeoutPromise]);

        if (response && response.data) {
          const apiUser = response.data;

          // Only update user state if API data differs from cached data
          if (
            !cachedUser ||
            JSON.stringify(cachedUser) !== JSON.stringify(apiUser)
          ) {
            setUser(apiUser);
            await AsyncStorage.setItem(
              STORAGE_KEYS.USER_DATA,
              JSON.stringify(apiUser)
            );
          }
        }
      } catch (profileError: any) {
        // Profile fetch failed/timed out - use cached data if available
        await UnifiedLogger.warn(
          "auth",
          "Profile fetch failed, using cached data",
          profileError
        );

        // If it's a 401, clear everything
        if (profileError?.response?.status === 401) {
          await ApiService.token.removeToken();
          await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
          setUser(null);
          setAuthStatus("unauthenticated");
          return;
        }

        // For other errors, if we have cached user, continue with that
        if (!cachedUser) {
          setError("Failed to load user profile");
        }
      }

      // Step 6: Cache ingredients in background (don't block initialization)
      StaticDataService.updateIngredientsCache()
        .then(() => {
          StaticDataService.getCacheStats()
            .then(stats => console.log("V2 Cache Status:", stats))
            .catch(error => console.warn("Failed to get cache stats:", error));
        })
        .catch(error => {
          console.warn(
            "Failed to cache ingredients during auth initialization:",
            error
          );
        });
    } catch (error: any) {
      await UnifiedLogger.error("auth", "Failed to initialize auth", error);

      // Handle 401 by clearing token/storage
      if (error.response?.status === 401) {
        await ApiService.token.removeToken();
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        setUser(null);
        setAuthStatus("unauthenticated");
      } else {
        // For non-401 errors, only set error if no cached user was available
        if (!cachedUser) {
          setError("Failed to initialize authentication");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    credentials: LoginRequest,
    rememberDevice: boolean = false
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await ApiService.auth.login(credentials);
      const { access_token, user: userData } = response.data;

      // Store token securely
      await ApiService.token.setToken(access_token);

      // Update auth status based on token validation
      await updateAuthStatus(access_token);

      // Debug JWT token structure (development only)
      if (__DEV__) {
        debugJWTToken(access_token);
      }

      // Cache user data
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );

      setUser(userData);

      // If "Remember Device" is enabled, create a device token for quick login
      if (rememberDevice) {
        try {
          const deviceTokenResult = await DeviceTokenService.createDeviceToken(
            userData.username
          );

          if (deviceTokenResult.success) {
            await UnifiedLogger.info(
              "auth",
              "Device token created for quick login",
              { deviceId: deviceTokenResult.device_id }
            );
          } else {
            await UnifiedLogger.warn(
              "auth",
              "Failed to create device token",
              deviceTokenResult.error
            );
          }
        } catch (deviceTokenError) {
          // Don't block login if device token creation fails
          await UnifiedLogger.warn(
            "auth",
            "Device token creation failed, continuing with login",
            deviceTokenError
          );
        }
      }

      // Cache ingredients now that user is authenticated using V2 system
      StaticDataService.updateIngredientsCache()
        .then(() => {
          // Log cache status for debugging
          StaticDataService.getCacheStats()
            .then(stats => {
              console.log("V2 Cache Status:", stats);
            })
            .catch(error => console.warn("Failed to get cache stats:", error));
        })
        .catch(error => {
          console.warn("Failed to cache ingredients after login:", error);
          // Don't throw - this shouldn't block login success
        });
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

      // Keep authStatus in sync with the new token
      await updateAuthStatus(access_token);

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

      // Get current user ID before clearing state for cache cleanup
      const userId = user?.id;

      await UnifiedLogger.info("auth", "Logout initiated", {
        userId,
        username: user?.username,
      });

      // Clear user state FIRST so components can check isAuthenticated
      // and avoid making API calls during cleanup
      setUser(null);
      setError(null);
      setAuthStatus("unauthenticated");

      // Clear JWT token from SecureStore
      await ApiService.token.removeToken();
      await UnifiedLogger.debug("auth", "JWT token removed from SecureStore");

      // Clear device token (but keep biometric credentials for backward compatibility)
      await DeviceTokenService.clearDeviceToken();
      await UnifiedLogger.debug(
        "auth",
        "Device token cleared from SecureStore"
      );

      // Clear cached data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_SETTINGS,
        STORAGE_KEYS.CACHED_INGREDIENTS,
      ]);
      await UnifiedLogger.debug("auth", "AsyncStorage cleared");

      // Clear React Query cache and persisted storage
      cacheUtils.clearAll();
      await cacheUtils.clearUserPersistedCache(userId);
      await UnifiedLogger.debug("auth", "React Query cache cleared");

      // Clear user-scoped offline data
      const { UserCacheService } = await import(
        "@services/offlineV2/UserCacheService"
      );
      await UserCacheService.clearUserData(userId);
      await UnifiedLogger.debug("auth", "User offline data cleared");

      await UnifiedLogger.info("auth", "Logout completed successfully", {
        userId,
      });
    } catch (error: any) {
      await UnifiedLogger.error(
        "auth",
        "Logout failed, performing fallback cleanup",
        { error: error.message, userId: user?.id }
      );

      // Even if logout fails, clear local state and cache
      setUser(null);
      cacheUtils.clearAll();
      // Clear persisted cache without user ID as fallback
      await cacheUtils.clearAllPersistedCache();
      // Clear all offline data as fallback
      const { UserCacheService } = await import(
        "@services/offlineV2/UserCacheService"
      );
      await UserCacheService.clearUserData();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (!user) {
        return;
      }

      const response = await ApiService.auth.getProfile();
      const userData = response.data;

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
        // Keep authStatus in sync with the new token
        await updateAuthStatus(response.data.access_token);
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

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await ApiService.auth.forgotPassword({ email });
    } catch (error: any) {
      console.error("Failed to send password reset:", error);
      setError(
        error.response?.data?.error || "Failed to send password reset email"
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (
    token: string,
    newPassword: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await ApiService.auth.resetPassword({ token, new_password: newPassword });
    } catch (error: any) {
      console.error("Failed to reset password:", error);
      setError(error.response?.data?.error || "Failed to reset password");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  /**
   * Check biometric availability and update state
   * Called on app initialization and when needed
   */
  const checkBiometricAvailability = async (): Promise<void> => {
    try {
      const available = await BiometricService.isBiometricAvailable();
      const enabled = await BiometricService.isBiometricEnabled();
      setIsBiometricAvailable(available);
      setIsBiometricEnabled(enabled);
    } catch (error) {
      console.error("Failed to check biometric availability:", error);
      setIsBiometricAvailable(false);
      setIsBiometricEnabled(false);
    }
  };

  /**
   * Login with biometric authentication
   * Retrieves stored credentials and performs full login (equivalent to password login)
   */
  const loginWithBiometrics = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await UnifiedLogger.info("auth", "Biometric login initiated");

      // Check biometric availability and enabled status
      const biometricAvailable = await BiometricService.isBiometricAvailable();
      const biometricEnabled = await BiometricService.isBiometricEnabled();
      const hasDeviceToken = await BiometricService.hasStoredDeviceToken();

      await UnifiedLogger.debug("auth", "Biometric pre-flight check", {
        biometricAvailable,
        biometricEnabled,
        hasDeviceToken,
      });

      if (!hasDeviceToken) {
        await UnifiedLogger.warn(
          "auth",
          "Biometric login failed: No device token found"
        );
        throw new Error(
          "No biometric authentication configured. Please login with your password to enable biometric authentication."
        );
      }

      // Authenticate with biometrics and exchange device token for access token
      await UnifiedLogger.debug(
        "auth",
        "Requesting biometric authentication from BiometricService"
      );

      const result = await BiometricService.authenticateWithBiometrics();

      await UnifiedLogger.debug("auth", "Biometric authentication result", {
        success: result.success,
        errorCode: result.errorCode,
        hasAccessToken: !!result.accessToken,
        hasUser: !!result.user,
      });

      if (!result.success || !result.accessToken || !result.user) {
        await UnifiedLogger.warn("auth", "Biometric authentication rejected", {
          error: result.error,
          errorCode: result.errorCode,
        });

        const error = new Error(
          result.error || "Biometric authentication failed"
        );
        // Preserve error code for structured error handling
        if (result.errorCode) {
          (error as any).errorCode = result.errorCode;
        }
        throw error;
      }

      await UnifiedLogger.debug(
        "auth",
        "Biometric authentication successful, device token exchanged for access token"
      );

      const { accessToken: access_token, user: userData } = result;

      // Validate user data structure
      if (!userData?.id || !userData?.username) {
        throw new Error("Invalid user data received from biometric login");
      }

      await UnifiedLogger.debug("auth", "Biometric login successful", {
        userId: userData.id,
        username: userData.username,
        hasAccessToken: true,
      });

      // Store token securely
      await ApiService.token.setToken(access_token);
      // Keep authStatus in sync with the new token
      await updateAuthStatus(access_token);
      await UnifiedLogger.debug("auth", "JWT token stored in SecureStore");

      // Cache user data
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );
      await UnifiedLogger.debug("auth", "User data cached in AsyncStorage");

      setUser(userData as User);

      await UnifiedLogger.info(
        "auth",
        "Biometric login completed successfully",
        {
          userId: userData.id,
          username: userData.username,
        }
      );

      // Cache ingredients using V2 system
      StaticDataService.updateIngredientsCache()
        .then(() => {
          StaticDataService.getCacheStats()
            .then(stats => {
              console.log("V2 Cache Status:", stats);
            })
            .catch(error => console.warn("Failed to get cache stats:", error));
        })
        .catch(error => {
          console.warn(
            "Failed to cache ingredients after biometric login:",
            error
          );
        });
    } catch (error: any) {
      await UnifiedLogger.error("auth", "Biometric login failed", {
        errorMessage: error.message,
        errorCode: (error as any).errorCode,
        stack: error.stack,
      });

      setError(error.message || "Biometric authentication failed");
      throw error;
    } finally {
      await checkBiometricAvailability();
      setIsLoading(false);
    }
  };

  /**
   * Enable biometric authentication with device token
   * Creates a device token on backend and stores it securely for future biometric logins
   * Device token is encrypted in Android's hardware-backed keystore
   * Requires user to be authenticated with valid JWT access token
   */
  const enableBiometrics = async (username: string): Promise<void> => {
    try {
      // Check if biometric authentication is available before attempting to enable
      const isAvailable = await BiometricService.isBiometricAvailable();
      if (!isAvailable) {
        setIsBiometricEnabled(false);
        throw new Error(
          "Biometric authentication is not available on this device"
        );
      }

      await BiometricService.enableBiometrics(username);
      await checkBiometricAvailability();
    } catch (error: any) {
      console.error("Failed to enable biometrics:", error);
      throw error;
    }
  };

  /**
   * Disable biometric authentication
   * Clears stored username and disables biometric login
   */
  const disableBiometrics = async (): Promise<void> => {
    try {
      await BiometricService.disableBiometricsLocally();
      await checkBiometricAvailability();
    } catch (error: any) {
      console.error("Failed to disable biometrics:", error);
      throw error;
    }
  };

  /**
   * Extract user ID from the stored JWT token
   * Useful for offline functionality where we need the user ID without making API calls
   *
   * @returns Promise resolving to user ID string or null if not available
   */
  const getUserId = async (): Promise<string | null> => {
    try {
      // First check if we have user data in state
      if (user?.id) {
        return user.id;
      }

      // Fallback to extracting from JWT token
      const token = await ApiService.token.getToken();
      if (!token) {
        return null;
      }

      return extractUserIdFromJWT(token);
    } catch (error) {
      console.warn("Failed to extract user ID:", error);
      return null;
    }
  };

  /**
   * Check if device token exists for quick login
   */
  const hasDeviceToken = async (): Promise<boolean> => {
    try {
      return await DeviceTokenService.hasDeviceToken();
    } catch (error) {
      await UnifiedLogger.error("auth", "Failed to check device token", error);
      return false;
    }
  };

  /**
   * Quick login with device token (for "Remember This Device" functionality)
   * Similar to biometric login but specifically for device token exchange
   */
  const quickLoginWithDeviceToken = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await DeviceTokenService.exchangeDeviceToken();

      if (!result.success || !result.access_token || !result.user) {
        throw new Error(result.error || "Device token login failed");
      }

      // Store new JWT token
      await ApiService.token.setToken(result.access_token);
      await updateAuthStatus(result.access_token);

      // Cache user data
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(result.user)
      );

      setUser(result.user as User);

      await UnifiedLogger.info(
        "auth",
        "Quick login with device token successful"
      );

      // Cache ingredients in background
      StaticDataService.updateIngredientsCache().catch(error =>
        console.warn("Failed to cache ingredients after quick login:", error)
      );
    } catch (error: any) {
      await UnifiedLogger.error("auth", "Quick login failed", error);
      setError(error.message || "Quick login failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Permission helper functions - delegates to PermissionService
   */
  const canViewRecipes = (): PermissionCheck => {
    return PermissionService.canViewRecipes(authStatus);
  };

  const canSaveRecipe = (): PermissionCheck => {
    return PermissionService.canSaveRecipe(authStatus);
  };

  const canEditRecipe = (): PermissionCheck => {
    return PermissionService.canEditRecipe(authStatus);
  };

  const canDeleteRecipe = (): PermissionCheck => {
    return PermissionService.canDeleteRecipe(authStatus);
  };

  const canSyncData = (): PermissionCheck => {
    return PermissionService.canSyncData(authStatus);
  };

  const contextValue: AuthContextValue = {
    // State
    user,
    isLoading,
    isAuthenticated: !!user,
    authStatus,
    error,
    isBiometricAvailable,
    isBiometricEnabled,

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

    // Password reset
    forgotPassword,
    resetPassword,

    // Biometric authentication
    loginWithBiometrics,
    enableBiometrics,
    disableBiometrics,
    checkBiometricAvailability,

    // Device token management
    hasDeviceToken,
    quickLoginWithDeviceToken,

    // JWT utilities
    getUserId,

    // Permission helpers
    canViewRecipes,
    canSaveRecipe,
    canEditRecipe,
    canDeleteRecipe,
    canSyncData,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;
