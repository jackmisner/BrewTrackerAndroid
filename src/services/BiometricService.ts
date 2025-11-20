/**
 * Biometric Authentication Service for BrewTracker Android
 *
 * Provides secure biometric authentication (fingerprint, face recognition, iris) capabilities
 * using expo-local-authentication and device token-based authentication. Handles device
 * capability detection, device token management, and authentication flow.
 *
 * Features:
 * - Device biometric capability detection
 * - Secure device token storage using SecureStore
 * - Biometric authentication prompts with customizable messages
 * - Enable/disable biometric authentication management
 * - Error handling and fallback logic
 *
 * Security:
 * - Device tokens stored in hardware-backed Android SecureStore
 * - Biometric verification required before token access
 * - No passwords stored on device (token-based authentication)
 * - Tokens can be revoked server-side
 * - 90-day token expiration with automatic refresh
 * - User can disable anytime
 *
 * Architecture:
 * - Token-based authentication following OAuth2 refresh token pattern
 * - Successful biometric scan retrieves device token from SecureStore
 * - Device token exchanged with backend for access token
 * - Server stores only SHA-256 hash of device token
 * - Prevents pass-the-hash attacks
 *
 * @example
 * ```typescript
 * // Check if biometrics are available
 * const isAvailable = await BiometricService.isBiometricAvailable();
 *
 * // Enable biometric login after successful password login (requires access token)
 * await BiometricService.enableBiometrics('username');
 *
 * // Authenticate with biometrics (returns access token)
 * const result = await BiometricService.authenticateWithBiometrics();
 * if (result.success && result.accessToken) {
 *   // Store access token and update auth state
 *   await handleBiometricLogin(result.accessToken, result.user);
 * }
 * ```
 */

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";
import { STORAGE_KEYS } from "./config";
import ApiService from "./api/apiService";
import { getDeviceId, getDeviceName, getPlatform } from "@utils/deviceUtils";

/**
 * Biometric error codes
 */
export enum BiometricErrorCode {
  USER_CANCELLED = "USER_CANCELLED",
  SYSTEM_CANCELLED = "SYSTEM_CANCELLED",
  LOCKOUT = "LOCKOUT",
  NOT_ENROLLED = "NOT_ENROLLED",
  USER_FALLBACK = "USER_FALLBACK",
  NOT_ENABLED = "NOT_ENABLED",
  NOT_AVAILABLE = "NOT_AVAILABLE",
  CREDENTIALS_NOT_FOUND = "CREDENTIALS_NOT_FOUND",
  VERIFICATION_FAILED = "VERIFICATION_FAILED",
  TOKEN_ERROR = "TOKEN_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Biometric authentication result with access token
 */
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
  accessToken?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    [key: string]: any;
  };
}

/**
 * Biometric capability information
 */
export interface BiometricCapability {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricType?: "fingerprint" | "face" | "iris" | "multiple" | "unknown";
}

/**
 * Biometric Service Class
 *
 * Handles all biometric authentication operations including capability detection,
 * credential management, and authentication flow.
 */
export class BiometricService {
  // SecureStore keys for biometric authentication
  private static readonly BIOMETRIC_USERNAME_KEY =
    STORAGE_KEYS.BIOMETRIC_USERNAME;
  private static readonly BIOMETRIC_DEVICE_TOKEN_KEY =
    STORAGE_KEYS.BIOMETRIC_DEVICE_TOKEN;
  private static readonly BIOMETRIC_DEVICE_ID_KEY =
    STORAGE_KEYS.BIOMETRIC_DEVICE_ID;
  private static readonly BIOMETRIC_ENABLED_KEY =
    STORAGE_KEYS.BIOMETRIC_ENABLED;

  /**
   * Check if biometric authentication is available on the device
   *
   * Verifies both hardware availability and user enrollment.
   *
   * @returns True if biometrics are available and enrolled
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return false;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return isEnrolled;
    } catch (error) {
      console.error("Error checking biometric availability:", error);
      return false;
    }
  }

  /**
   * Get detailed biometric capability information
   *
   * Provides comprehensive information about device biometric capabilities
   * including hardware support, enrollment status, and supported authentication types.
   *
   * @returns BiometricCapability object with detailed information
   */
  static async getBiometricCapability(): Promise<BiometricCapability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          isAvailable: false,
          hasHardware: false,
          isEnrolled: false,
          supportedTypes: [],
        };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Determine biometric type based on supported types
      let biometricType: BiometricCapability["biometricType"] = "unknown";
      if (supportedTypes.length > 1) {
        biometricType = "multiple";
      } else if (supportedTypes.length === 1) {
        const type = supportedTypes[0];
        if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) {
          biometricType = "fingerprint";
        } else if (
          type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        ) {
          biometricType = "face";
        } else if (type === LocalAuthentication.AuthenticationType.IRIS) {
          biometricType = "iris";
        }
      }

      return {
        isAvailable: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        supportedTypes,
        biometricType,
      };
    } catch (error) {
      console.error("Error getting biometric capability:", error);
      return {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  }

  /**
   * Get user-friendly biometric type name
   *
   * @returns Human-readable biometric type name
   */
  static async getBiometricTypeName(): Promise<string> {
    const capability = await this.getBiometricCapability();

    if (!capability.isAvailable) {
      return "Biometric";
    }

    switch (capability.biometricType) {
      case "fingerprint":
        return "Fingerprint";
      case "face":
        return "Face Recognition";
      case "iris":
        return "Iris";
      case "multiple":
        return "Biometric";
      default:
        return "Biometric";
    }
  }

  /**
   * Check if biometric authentication is currently enabled by user
   *
   * @returns True if user has enabled biometric authentication
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(
        this.BIOMETRIC_ENABLED_KEY
      );
      return enabled === "true";
    } catch (error) {
      console.error("Error checking if biometric is enabled:", error);
      return false;
    }
  }

  /**
   * Enable biometric authentication with device token
   *
   * Creates a device token on the backend and stores it in SecureStore after successful
   * biometric enrollment. Requires user to be authenticated with valid JWT access token.
   *
   * @param username - User's username for display purposes
   * @returns True if biometric authentication was enabled successfully
   * @throws Error with errorCode property for structured error handling
   */
  static async enableBiometrics(username: string): Promise<boolean> {
    try {
      await UnifiedLogger.info(
        "biometric",
        "Enabling biometric authentication",
        {
          username: `${username.substring(0, 3)}***`,
        }
      );

      // Verify biometrics are available
      const isAvailable = await this.isBiometricAvailable();
      await UnifiedLogger.debug("biometric", "Biometric availability check", {
        isAvailable,
      });

      if (!isAvailable) {
        await UnifiedLogger.warn(
          "biometric",
          "Cannot enable biometrics - hardware not available"
        );
        const error = new Error("Biometric authentication is not available");
        (error as any).errorCode = BiometricErrorCode.NOT_AVAILABLE;
        throw error;
      }

      await UnifiedLogger.debug(
        "biometric",
        "Prompting user to verify biometric for enrollment"
      );

      // Verify user can authenticate with biometrics before enabling
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify your biometric to enable this feature",
        cancelLabel: "Cancel",
        disableDeviceFallback: true,
      });

      await UnifiedLogger.debug("biometric", "Biometric verification result", {
        success: authResult.success,
        error: !authResult.success ? authResult.error : undefined,
      });

      if (!authResult.success) {
        await UnifiedLogger.warn("biometric", "Biometric verification failed", {
          platformError: authResult.error,
        });

        const error = new Error("Biometric verification failed");
        // Map platform error to structured code
        if (authResult.error === "user_cancel") {
          (error as any).errorCode = BiometricErrorCode.USER_CANCELLED;
        } else if (authResult.error === "system_cancel") {
          (error as any).errorCode = BiometricErrorCode.SYSTEM_CANCELLED;
        } else {
          (error as any).errorCode = BiometricErrorCode.VERIFICATION_FAILED;
        }
        throw error;
      }

      // Get device information
      const deviceId = await getDeviceId();
      const deviceName = await getDeviceName();
      const platform = getPlatform();

      await UnifiedLogger.debug("biometric", "Creating device token", {
        deviceId: `${deviceId.substring(0, 8)}...`,
        deviceName,
        platform,
      });

      // Create device token on backend (requires valid JWT access token)
      const response = await ApiService.auth.createDeviceToken({
        device_id: deviceId,
        device_name: deviceName,
        platform,
      });

      const { device_token, expires_at } = response.data;

      await UnifiedLogger.debug("biometric", "Device token created", {
        expiresAt: expires_at,
      });

      // Store device token and metadata in SecureStore
      await SecureStore.setItemAsync(
        this.BIOMETRIC_DEVICE_TOKEN_KEY,
        device_token
      );
      await SecureStore.setItemAsync(this.BIOMETRIC_DEVICE_ID_KEY, deviceId);
      await SecureStore.setItemAsync(this.BIOMETRIC_USERNAME_KEY, username);
      await SecureStore.setItemAsync(this.BIOMETRIC_ENABLED_KEY, "true");

      await UnifiedLogger.info(
        "biometric",
        "Biometric authentication enabled successfully",
        {
          username: `${username.substring(0, 3)}***`,
          expiresAt: expires_at,
        }
      );

      return true;
    } catch (error) {
      await UnifiedLogger.error("biometric", "Failed to enable biometrics", {
        error: error instanceof Error ? error.message : String(error),
        errorCode: (error as any).errorCode,
      });

      // Preserve errorCode if it exists, otherwise add UNKNOWN_ERROR
      if (error instanceof Error && !(error as any).errorCode) {
        (error as any).errorCode = BiometricErrorCode.UNKNOWN_ERROR;
      }
      throw error;
    }
  }

  /**
   * Disable biometric authentication and clear stored data
   *
   * Removes all biometric-related data from SecureStore including device token.
   * Note: This does NOT revoke the token on the backend - token remains valid until
   * expiration or manual revocation via settings.
   *
   * @returns True if biometric authentication was disabled successfully
   */
  static async disableBiometrics(): Promise<boolean> {
    try {
      await UnifiedLogger.info(
        "biometric",
        "Disabling biometric authentication"
      );

      await SecureStore.deleteItemAsync(this.BIOMETRIC_USERNAME_KEY);
      await SecureStore.deleteItemAsync(this.BIOMETRIC_DEVICE_TOKEN_KEY);
      await SecureStore.deleteItemAsync(this.BIOMETRIC_DEVICE_ID_KEY);
      await SecureStore.deleteItemAsync(this.BIOMETRIC_ENABLED_KEY);

      await UnifiedLogger.info(
        "biometric",
        "Biometric authentication disabled successfully"
      );

      return true;
    } catch (error) {
      await UnifiedLogger.error("biometric", "Failed to disable biometrics", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Authenticate user with biometrics using device token
   *
   * Prompts user for biometric authentication, retrieves device token from SecureStore,
   * and exchanges it with backend for an access token. Returns access token and user data
   * on success. Handles various authentication scenarios and errors.
   *
   * @param promptMessage - Custom message to display in biometric prompt
   * @returns BiometricAuthResult with success status, access token, and user data
   */
  static async authenticateWithBiometrics(
    promptMessage?: string
  ): Promise<BiometricAuthResult> {
    try {
      await UnifiedLogger.debug(
        "biometric",
        "BiometricService.authenticateWithBiometrics called",
        { hasCustomPrompt: !!promptMessage }
      );

      // Check if biometrics are enabled
      const isEnabled = await this.isBiometricEnabled();
      await UnifiedLogger.debug("biometric", "Biometric enabled check", {
        isEnabled,
      });

      if (!isEnabled) {
        await UnifiedLogger.warn(
          "biometric",
          "Biometric authentication not enabled"
        );
        return {
          success: false,
          error: "Biometric authentication is not enabled",
          errorCode: BiometricErrorCode.NOT_ENABLED,
        };
      }

      // Check if biometrics are available
      const isAvailable = await this.isBiometricAvailable();
      await UnifiedLogger.debug("biometric", "Biometric hardware check", {
        isAvailable,
      });

      if (!isAvailable) {
        await UnifiedLogger.warn(
          "biometric",
          "Biometric hardware not available"
        );
        return {
          success: false,
          error: "Biometric authentication is not available",
          errorCode: BiometricErrorCode.NOT_AVAILABLE,
        };
      }

      // Get biometric type for custom prompt message
      const biometricType = await this.getBiometricTypeName();
      const defaultMessage = `Authenticate with ${biometricType}`;

      await UnifiedLogger.debug(
        "biometric",
        "Prompting user for biometric authentication",
        {
          biometricType,
          promptMessage: promptMessage || defaultMessage,
        }
      );

      // Attempt biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || defaultMessage,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      await UnifiedLogger.debug(
        "biometric",
        "LocalAuthentication.authenticateAsync result",
        {
          success: result.success,
          error: !result.success ? result.error : undefined,
        }
      );

      if (!result.success) {
        // Handle authentication failure - map platform errors to structured codes
        let errorMessage = "Authentication failed";
        let errorCode = BiometricErrorCode.UNKNOWN_ERROR;

        if (result.error === "user_cancel") {
          errorMessage = "Authentication cancelled";
          errorCode = BiometricErrorCode.USER_CANCELLED;
        } else if (result.error === "system_cancel") {
          errorMessage = "Authentication cancelled by system";
          errorCode = BiometricErrorCode.SYSTEM_CANCELLED;
        } else if (result.error === "lockout") {
          errorMessage = "Too many attempts. Please try again later";
          errorCode = BiometricErrorCode.LOCKOUT;
        } else if (result.error === "not_enrolled") {
          errorMessage = "No biometric data enrolled";
          errorCode = BiometricErrorCode.NOT_ENROLLED;
        } else if (result.error === "user_fallback") {
          errorMessage = "User chose to use password";
          errorCode = BiometricErrorCode.USER_FALLBACK;
        }

        await UnifiedLogger.warn(
          "biometric",
          "Biometric authentication failed",
          {
            platformError: result.error,
            mappedErrorCode: errorCode,
            errorMessage,
          }
        );

        return {
          success: false,
          error: errorMessage,
          errorCode,
        };
      }

      await UnifiedLogger.debug(
        "biometric",
        "Biometric authentication successful, retrieving device token"
      );

      // Retrieve device token from SecureStore
      const deviceToken = await SecureStore.getItemAsync(
        this.BIOMETRIC_DEVICE_TOKEN_KEY
      );
      const username = await SecureStore.getItemAsync(
        this.BIOMETRIC_USERNAME_KEY
      );

      await UnifiedLogger.debug("biometric", "Device token retrieval", {
        hasDeviceToken: !!deviceToken,
        hasUsername: !!username,
        username: username ? `${username.substring(0, 3)}***` : "null",
      });

      if (!deviceToken) {
        await UnifiedLogger.warn(
          "biometric",
          "Device token not found, auto-disabling biometrics"
        );

        // Self-heal: disable biometrics to prevent future failed attempts
        try {
          await this.disableBiometrics();
          await UnifiedLogger.info(
            "biometric",
            "Auto-disabled biometrics due to missing device token"
          );
        } catch (disableError) {
          await UnifiedLogger.error(
            "biometric",
            "Failed to auto-disable biometrics",
            {
              error:
                disableError instanceof Error
                  ? disableError.message
                  : String(disableError),
            }
          );
        }

        return {
          success: false,
          error:
            "Device token not found. Please re-enroll biometric authentication.",
          errorCode: BiometricErrorCode.CREDENTIALS_NOT_FOUND,
        };
      }

      await UnifiedLogger.debug(
        "biometric",
        "Exchanging device token for access token"
      );

      // Exchange device token for access token via backend
      const loginResponse = await ApiService.auth.biometricLogin({
        device_token: deviceToken,
      });

      const { access_token, user } = loginResponse.data;

      await UnifiedLogger.info(
        "biometric",
        "BiometricService.authenticateWithBiometrics successful",
        {
          username: user?.username
            ? `${user.username.substring(0, 3)}***`
            : "unknown",
          userId: user?.id,
        }
      );

      return {
        success: true,
        accessToken: access_token,
        user,
      };
    } catch (error) {
      await UnifiedLogger.error(
        "biometric",
        "BiometricService.authenticateWithBiometrics threw exception",
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Biometric authentication failed";

      // Check for structured error code from API
      const isTokenError =
        (error as any)?.response?.data?.code === "TOKEN_EXPIRED" ||
        (error as any)?.response?.data?.code === "TOKEN_REVOKED" ||
        (error as any)?.response?.data?.code === "TOKEN_INVALID" ||
        (error as any)?.response?.status === 401;

      if (isTokenError) {
        await UnifiedLogger.warn(
          "biometric",
          "Device token expired or revoked, auto-disabling biometrics"
        );

        // Auto-disable biometrics if token is invalid
        try {
          await this.disableBiometrics();
          await UnifiedLogger.info(
            "biometric",
            "Auto-disabled biometrics due to invalid device token"
          );
        } catch (disableError) {
          await UnifiedLogger.error(
            "biometric",
            "Failed to auto-disable biometrics",
            {
              error:
                disableError instanceof Error
                  ? disableError.message
                  : String(disableError),
            }
          );
        }

        return {
          success: false,
          error:
            "Device token expired. Please re-enroll biometric authentication.",
          errorCode: BiometricErrorCode.TOKEN_ERROR,
        };
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: BiometricErrorCode.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Verify if device token exists without triggering authentication
   *
   * Note: This method ONLY checks for the presence of stored device token
   * in SecureStore. It does NOT verify if biometric authentication is currently
   * enabled (via the `biometric_enabled` flag). For a complete check including
   * the enabled state, use `isBiometricEnabled()` instead.
   *
   * Useful for checking device token storage state, such as during token
   * migration or cleanup operations.
   *
   * @returns True if device token is stored in SecureStore
   */
  static async hasStoredDeviceToken(): Promise<boolean> {
    try {
      const deviceToken = await SecureStore.getItemAsync(
        this.BIOMETRIC_DEVICE_TOKEN_KEY
      );

      return !!deviceToken;
    } catch (error) {
      console.error("Error checking stored device token:", error);
      return false;
    }
  }

  /**
   * Revoke device token on the backend and disable biometrics locally
   *
   * This method revokes the device token on the backend (invalidating it server-side)
   * and then disables biometric authentication locally by removing all stored data.
   *
   * Use this when user wants to completely remove biometric authentication, such as
   * during password change or account security update.
   *
   * @returns True if device token was revoked and biometrics disabled successfully
   */
  static async revokeAndDisableBiometrics(): Promise<boolean> {
    try {
      await UnifiedLogger.info(
        "biometric",
        "Revoking device token and disabling biometrics"
      );

      // Get device ID before disabling
      const deviceId = await SecureStore.getItemAsync(
        this.BIOMETRIC_DEVICE_ID_KEY
      );

      if (deviceId) {
        try {
          // Revoke device token on backend
          await ApiService.auth.revokeDeviceToken(deviceId);
          await UnifiedLogger.info(
            "biometric",
            "Device token revoked on backend",
            {
              deviceId: `${deviceId.substring(0, 8)}...`,
            }
          );
        } catch (error) {
          await UnifiedLogger.warn(
            "biometric",
            "Failed to revoke device token on backend (continuing with local disable)",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }

      // Disable biometrics locally
      const success = await this.disableBiometrics();

      if (success) {
        await UnifiedLogger.info(
          "biometric",
          "Device token revoked and biometrics disabled successfully"
        );
      }

      return success;
    } catch (error) {
      await UnifiedLogger.error(
        "biometric",
        "Failed to revoke and disable biometrics",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return false;
    }
  }
}

export default BiometricService;
