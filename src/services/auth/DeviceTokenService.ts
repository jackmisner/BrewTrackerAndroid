/**
 * DeviceTokenService
 *
 * Manages device tokens for "Remember This Device" functionality.
 * Device tokens are long-lived (90 days) and can be exchanged for JWT access tokens
 * without requiring username/password input.
 *
 * This service is authentication-method-agnostic:
 * - Works with password-based login (new functionality)
 * - Works with biometric authentication (existing functionality)
 * - Backend treats all device tokens identically
 */

import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import ApiService from "@services/api/apiService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

// SecureStore keys for device token storage
const STORAGE_KEYS = {
  DEVICE_TOKEN: "device_token",
  DEVICE_ID: "device_token_device_id",
  USERNAME: "device_token_username",
  ENABLED: "device_token_enabled",
} as const;

export interface DeviceTokenInfo {
  device_id: string;
  device_name?: string;
  platform: string;
  created_at: string;
  last_used?: string;
  expires_at: string;
  is_revoked?: boolean;
}

export interface CreateDeviceTokenResult {
  success: boolean;
  device_token?: string;
  device_id?: string;
  expires_at?: string;
  error?: string;
}

export interface ExchangeTokenResult {
  success: boolean;
  access_token?: string;
  user?: any;
  error?: string;
  error_code?: "NETWORK_ERROR" | "INVALID_TOKEN" | "EXPIRED_TOKEN" | "UNKNOWN";
}

export class DeviceTokenService {
  /**
   * Check if a device token exists in storage
   */
  static async hasDeviceToken(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_TOKEN);
      const enabled = await SecureStore.getItemAsync(STORAGE_KEYS.ENABLED);
      return token !== null && enabled === "true";
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error checking device token",
        error
      );
      return false;
    }
  }

  /**
   * Get stored device token
   */
  static async getDeviceToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_TOKEN);
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error getting device token",
        error
      );
      return null;
    }
  }

  /**
   * Get stored username associated with device token
   */
  static async getStoredUsername(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.USERNAME);
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error getting stored username",
        error
      );
      return null;
    }
  }

  /**
   * Get stored device ID
   */
  static async getDeviceId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error getting device ID",
        error
      );
      return null;
    }
  }

  /**
   * Generate a unique device ID
   * Uses device name + timestamp for uniqueness
   */
  private static generateDeviceId(): string {
    const deviceName = Device.deviceName || "Unknown Device";
    const timestamp = Date.now();
    return `android-${deviceName}-${timestamp}`.replace(/\s+/g, "-");
  }

  /**
   * Get device name for display
   */
  private static getDeviceName(): string {
    return Device.deviceName || "Android Device";
  }

  /**
   * Create a new device token on the backend
   * Requires an active JWT token (user must be authenticated)
   *
   * @param username - Username to associate with device token
   * @returns Result indicating success or failure
   */
  static async createDeviceToken(
    username: string
  ): Promise<CreateDeviceTokenResult> {
    try {
      // Generate device ID
      const device_id = this.generateDeviceId();
      const device_name = this.getDeviceName();
      const platform = "android";

      await UnifiedLogger.info("DeviceTokenService", "Creating device token", {
        device_id,
        device_name,
        platform,
        username,
      });

      // Call backend to create device token
      const response = await ApiService.auth.createDeviceToken({
        device_id,
        device_name,
        platform,
      });

      const { device_token, expires_at } = response.data;

      // Store device token and metadata in SecureStore
      await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_TOKEN, device_token);
      await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, device_id);
      await SecureStore.setItemAsync(STORAGE_KEYS.USERNAME, username);
      await SecureStore.setItemAsync(STORAGE_KEYS.ENABLED, "true");

      await UnifiedLogger.info(
        "DeviceTokenService",
        "Device token created successfully"
      );

      return {
        success: true,
        device_token,
        device_id,
        expires_at,
      };
    } catch (error: any) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error creating device token",
        error
      );

      return {
        success: false,
        error:
          error?.response?.data?.error ||
          error?.message ||
          "Failed to create device token",
      };
    }
  }

  /**
   * Exchange device token for JWT access token
   * This is the key operation that enables "Remember This Device" functionality
   *
   * @param deviceToken - Optional device token (defaults to stored token)
   * @returns Result with access token and user data, or error
   */
  static async exchangeDeviceToken(
    deviceToken?: string
  ): Promise<ExchangeTokenResult> {
    try {
      // Get device token from storage if not provided
      const token = deviceToken || (await this.getDeviceToken());

      if (!token) {
        return {
          success: false,
          error: "No device token found",
          error_code: "INVALID_TOKEN",
        };
      }

      await UnifiedLogger.info(
        "DeviceTokenService",
        "Exchanging device token for JWT"
      );

      // Call backend to exchange device token for access token
      const response = await ApiService.auth.biometricLogin({
        device_token: token,
      });

      await UnifiedLogger.info(
        "DeviceTokenService",
        "Device token exchanged successfully"
      );

      return {
        success: true,
        access_token: response.data.access_token,
        user: response.data.user,
      };
    } catch (error: any) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error exchanging device token",
        error
      );

      // Determine error code
      let error_code: ExchangeTokenResult["error_code"] = "UNKNOWN";

      if (error?.response?.status === 401) {
        error_code = "INVALID_TOKEN";
      } else if (error?.response?.status === 403) {
        error_code = "EXPIRED_TOKEN";
      } else if (!error?.response) {
        error_code = "NETWORK_ERROR";
      }

      return {
        success: false,
        error:
          error?.response?.data?.error ||
          error?.message ||
          "Failed to exchange device token",
        error_code,
      };
    }
  }

  /**
   * Clear all device token data from storage
   * Used during logout or when device token is revoked
   */
  static async clearDeviceToken(): Promise<void> {
    try {
      await UnifiedLogger.info("DeviceTokenService", "Clearing device token");

      await SecureStore.deleteItemAsync(STORAGE_KEYS.DEVICE_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.DEVICE_ID);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USERNAME);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ENABLED);

      await UnifiedLogger.info(
        "DeviceTokenService",
        "Device token cleared successfully"
      );
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error clearing device token",
        error
      );
    }
  }

  /**
   * List all device tokens for the current user
   * Requires authentication (JWT token must be valid)
   */
  static async listDeviceTokens(
    includeRevoked: boolean = false
  ): Promise<DeviceTokenInfo[]> {
    try {
      const response = await ApiService.auth.listDeviceTokens(includeRevoked);
      return response.data.tokens || [];
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error listing device tokens",
        error
      );
      return [];
    }
  }

  /**
   * Revoke a specific device token by device ID
   * Requires authentication (JWT token must be valid)
   */
  static async revokeDeviceToken(deviceId: string): Promise<boolean> {
    try {
      await UnifiedLogger.info(
        "DeviceTokenService",
        "Revoking device token",
        deviceId
      );

      await ApiService.auth.revokeDeviceToken(deviceId);

      // If revoking current device, clear local storage
      const currentDeviceId = await this.getDeviceId();
      if (currentDeviceId === deviceId) {
        await this.clearDeviceToken();
      }

      await UnifiedLogger.info(
        "DeviceTokenService",
        "Device token revoked successfully"
      );
      return true;
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error revoking device token",
        error
      );
      return false;
    }
  }

  /**
   * Revoke all device tokens for the current user
   * Requires authentication (JWT token must be valid)
   */
  static async revokeAllDeviceTokens(): Promise<boolean> {
    try {
      await UnifiedLogger.info(
        "DeviceTokenService",
        "Revoking all device tokens"
      );

      await ApiService.auth.revokeAllDeviceTokens();

      // Clear local device token storage
      await this.clearDeviceToken();

      await UnifiedLogger.info(
        "DeviceTokenService",
        "All device tokens revoked successfully"
      );
      return true;
    } catch (error) {
      await UnifiedLogger.error(
        "DeviceTokenService",
        "Error revoking all device tokens",
        error
      );
      return false;
    }
  }

  /**
   * Check if device token is enabled
   * (For backward compatibility with BiometricService)
   */
  static async isEnabled(): Promise<boolean> {
    return this.hasDeviceToken();
  }

  /**
   * Get comprehensive device token status for debugging
   */
  static async getDebugInfo(): Promise<{
    hasToken: boolean;
    hasDeviceId: boolean;
    hasUsername: boolean;
    isEnabled: boolean;
    username: string | null;
    deviceId: string | null;
  }> {
    return {
      hasToken: (await this.getDeviceToken()) !== null,
      hasDeviceId: (await this.getDeviceId()) !== null,
      hasUsername: (await this.getStoredUsername()) !== null,
      isEnabled: await this.isEnabled(),
      username: await this.getStoredUsername(),
      deviceId: await this.getDeviceId(),
    };
  }
}
