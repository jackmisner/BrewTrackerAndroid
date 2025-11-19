/**
 * Biometric Authentication Service for BrewTracker Android
 *
 * Provides secure biometric authentication (fingerprint, face recognition, iris) capabilities
 * using expo-local-authentication. Handles device capability detection, credential
 * storage/retrieval, and authentication flow management.
 *
 * Features:
 * - Device biometric capability detection
 * - Secure credential storage using SecureStore
 * - Biometric authentication prompts with customizable messages
 * - Enable/disable biometric authentication management
 * - Error handling and fallback logic
 *
 * Security:
 * - Credentials stored in hardware-backed Android SecureStore
 * - Biometric verification required before credential access
 * - Encrypted password storage in Android keystore
 * - User can disable anytime
 *
 * Architecture:
 * - Biometric authentication is equivalent to password authentication
 * - Successful biometric scan retrieves stored credentials
 * - Credentials are used for full login (not token refresh)
 * - Works indefinitely - no token expiration issues
 *
 * @example
 * ```typescript
 * // Check if biometrics are available
 * const isAvailable = await BiometricService.isBiometricAvailable();
 *
 * // Enable biometric login after successful password login
 * await BiometricService.enableBiometrics('username', 'password');
 *
 * // Authenticate with biometrics
 * const result = await BiometricService.authenticateWithBiometrics();
 * if (result.success && result.credentials) {
 *   // Login with retrieved credentials
 *   await login(result.credentials);
 * }
 * ```
 */

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";
import { STORAGE_KEYS } from "./config";

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
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Stored biometric credentials
 */
export interface BiometricCredentials {
  username: string;
  password: string;
}

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
  credentials?: BiometricCredentials;
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
  private static readonly BIOMETRIC_PASSWORD_KEY = "biometric_password";
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
   * Enable biometric authentication and store credentials
   *
   * Stores username and password in SecureStore after successful biometric enrollment.
   * Credentials are encrypted and stored in Android's hardware-backed keystore.
   *
   * @param username - User's username
   * @param password - User's password (will be encrypted)
   * @returns True if biometric authentication was enabled successfully
   * @throws Error with errorCode property for structured error handling
   */
  static async enableBiometrics(
    username: string,
    password: string
  ): Promise<boolean> {
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

      // Store credentials securely in Android keystore
      await SecureStore.setItemAsync(this.BIOMETRIC_USERNAME_KEY, username);
      await SecureStore.setItemAsync(this.BIOMETRIC_PASSWORD_KEY, password);
      await SecureStore.setItemAsync(this.BIOMETRIC_ENABLED_KEY, "true");

      await UnifiedLogger.info(
        "biometric",
        "Biometric authentication enabled successfully",
        {
          username: `${username.substring(0, 3)}***`,
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
   * Removes all biometric-related data from SecureStore including credentials.
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
      await SecureStore.deleteItemAsync(this.BIOMETRIC_PASSWORD_KEY);
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
   * Authenticate user with biometrics and retrieve stored credentials
   *
   * Prompts user for biometric authentication and returns stored credentials
   * on success. Credentials can then be used for full login authentication.
   * Handles various authentication scenarios and errors.
   *
   * @param promptMessage - Custom message to display in biometric prompt
   * @returns BiometricAuthResult with success status and credentials
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
        "Biometric authentication successful, retrieving stored credentials"
      );

      // Retrieve stored credentials from Android SecureStore
      const username = await SecureStore.getItemAsync(
        this.BIOMETRIC_USERNAME_KEY
      );
      const password = await SecureStore.getItemAsync(
        this.BIOMETRIC_PASSWORD_KEY
      );

      await UnifiedLogger.debug("biometric", "Stored credentials retrieval", {
        hasUsername: !!username,
        hasPassword: !!password,
        username: username ? `${username.substring(0, 3)}***` : "null",
      });

      if (!username || !password) {
        await UnifiedLogger.warn(
          "biometric",
          "Stored credentials incomplete, auto-disabling biometrics"
        );

        // Self-heal: disable biometrics to prevent future failed attempts
        try {
          await this.disableBiometrics();
          await UnifiedLogger.info(
            "biometric",
            "Auto-disabled biometrics due to missing stored credentials"
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
          error: "Stored credentials not found",
          errorCode: BiometricErrorCode.CREDENTIALS_NOT_FOUND,
        };
      }

      await UnifiedLogger.info(
        "biometric",
        "BiometricService.authenticateWithBiometrics successful",
        {
          username: `${username.substring(0, 3)}***`,
        }
      );

      return {
        success: true,
        credentials: {
          username,
          password,
        },
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

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Biometric authentication failed",
        errorCode: BiometricErrorCode.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Verify if stored credentials exist without triggering authentication
   *
   * Note: This method ONLY checks for the presence of stored username and password
   * in SecureStore. It does NOT verify if biometric authentication is currently
   * enabled (via the `biometric_enabled` flag). For a complete check including
   * the enabled state, use `isBiometricEnabled()` instead.
   *
   * Useful for checking raw credential storage state, such as during credential
   * migration or cleanup operations.
   *
   * @returns True if both username and password are stored in SecureStore
   */
  static async hasStoredCredentials(): Promise<boolean> {
    try {
      const username = await SecureStore.getItemAsync(
        this.BIOMETRIC_USERNAME_KEY
      );
      const password = await SecureStore.getItemAsync(
        this.BIOMETRIC_PASSWORD_KEY
      );

      return !!username && !!password;
    } catch (error) {
      console.error("Error checking stored credentials:", error);
      return false;
    }
  }

  /**
   * Update stored credentials (e.g., after password change)
   *
   * @param username - Updated username
   * @param password - Updated password
   * @returns True if credentials were updated successfully
   */
  static async updateStoredCredentials(
    username: string,
    password: string
  ): Promise<boolean> {
    try {
      // Only update if biometrics are currently enabled
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return false;
      }

      await SecureStore.setItemAsync(this.BIOMETRIC_USERNAME_KEY, username);
      await SecureStore.setItemAsync(this.BIOMETRIC_PASSWORD_KEY, password);

      return true;
    } catch (error) {
      console.error("Error updating stored credentials:", error);
      return false;
    }
  }
}

export default BiometricService;
