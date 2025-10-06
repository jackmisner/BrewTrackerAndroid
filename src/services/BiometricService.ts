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
 * - Credentials stored in hardware-backed SecureStore
 * - Biometric verification required before credential access
 * - No plaintext password storage
 * - User can disable anytime
 *
 * @example
 * ```typescript
 * // Check if biometrics are available
 * const isAvailable = await BiometricService.isBiometricAvailable();
 *
 * // Enable biometric login
 * await BiometricService.enableBiometrics('username');
 *
 * // Authenticate with biometrics
 * const credentials = await BiometricService.authenticateWithBiometrics();
 * if (credentials) {
 *   // Login with credentials
 * }
 * ```
 */

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

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
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
  username?: string;
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
  private static readonly BIOMETRIC_USERNAME_KEY = "biometric_username";
  private static readonly BIOMETRIC_ENABLED_KEY = "biometric_enabled";

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
   * Enable biometric authentication and store username
   *
   * Stores username in SecureStore after successful biometric enrollment.
   * Does NOT store password - relies on JWT token refresh for re-authentication.
   *
   * @param username - User's username (for display purposes)
   * @returns True if biometric authentication was enabled successfully
   * @throws Error with errorCode property for structured error handling
   */
  static async enableBiometrics(username: string): Promise<boolean> {
    try {
      // Verify biometrics are available
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        const error = new Error("Biometric authentication is not available");
        (error as any).errorCode = BiometricErrorCode.NOT_AVAILABLE;
        throw error;
      }
      // Verify user can authenticate with biometrics before enabling
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify your biometric to enable this feature",
        cancelLabel: "Cancel",
        disableDeviceFallback: true,
      });

      if (!authResult.success) {
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

      // Store username for display purposes only
      await SecureStore.setItemAsync(this.BIOMETRIC_USERNAME_KEY, username);
      await SecureStore.setItemAsync(this.BIOMETRIC_ENABLED_KEY, "true");

      return true;
    } catch (error) {
      console.error("Error enabling biometrics:", error);
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
   * Removes all biometric-related data from SecureStore.
   *
   * @returns True if biometric authentication was disabled successfully
   */
  static async disableBiometrics(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(this.BIOMETRIC_USERNAME_KEY);
      await SecureStore.deleteItemAsync(this.BIOMETRIC_ENABLED_KEY);

      return true;
    } catch (error) {
      console.error("Error disabling biometrics:", error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics and retrieve stored username
   *
   * Prompts user for biometric authentication and returns stored username
   * on success. Actual authentication is handled via JWT token refresh.
   * Handles various authentication scenarios and errors.
   *
   * @param promptMessage - Custom message to display in biometric prompt
   * @returns BiometricAuthResult with success status and username
   */
  static async authenticateWithBiometrics(
    promptMessage?: string
  ): Promise<BiometricAuthResult> {
    try {
      // Check if biometrics are enabled
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: "Biometric authentication is not enabled",
          errorCode: BiometricErrorCode.NOT_ENABLED,
        };
      }

      // Check if biometrics are available
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: "Biometric authentication is not available",
          errorCode: BiometricErrorCode.NOT_AVAILABLE,
        };
      }

      // Get biometric type for custom prompt message
      const biometricType = await this.getBiometricTypeName();
      const defaultMessage = `Authenticate with ${biometricType}`;

      // Attempt biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || defaultMessage,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

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

        return {
          success: false,
          error: errorMessage,
          errorCode,
        };
      }

      // Retrieve stored username
      const username = await SecureStore.getItemAsync(
        this.BIOMETRIC_USERNAME_KEY
      );

      if (!username) {
        // Self-heal: disable biometrics to prevent future failed attempts
        try {
          await this.disableBiometrics();
          console.log(
            "BiometricService: Auto-disabled biometrics due to missing stored credentials"
          );
        } catch (disableError) {
          console.error(
            "BiometricService: Failed to auto-disable biometrics:",
            disableError
          );
        }

        return {
          success: false,
          error: "Stored username not found",
          errorCode: BiometricErrorCode.CREDENTIALS_NOT_FOUND,
        };
      }

      return {
        success: true,
        username,
      };
    } catch (error) {
      console.error("Error authenticating with biometrics:", error);
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
   * Verify if stored username exists without triggering authentication
   *
   * Useful for checking if user has previously enabled biometrics.
   *
   * @returns True if username is stored
   */
  static async hasStoredCredentials(): Promise<boolean> {
    try {
      const username = await SecureStore.getItemAsync(
        this.BIOMETRIC_USERNAME_KEY
      );

      return !!username;
    } catch (error) {
      console.error("Error checking stored username:", error);
      return false;
    }
  }

  /**
   * Update stored username (e.g., after username change)
   *
   * @param username - Updated username
   * @returns True if username was updated successfully
   */
  static async updateStoredUsername(username: string): Promise<boolean> {
    try {
      // Only update if biometrics are currently enabled
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return false;
      }

      await SecureStore.setItemAsync(this.BIOMETRIC_USERNAME_KEY, username);

      return true;
    } catch (error) {
      console.error("Error updating stored username:", error);
      return false;
    }
  }
}

export default BiometricService;
