/**
 * Tests for BiometricService
 *
 * Tests biometric authentication capabilities, credential management,
 * and authentication flow for Android-only biometric features.
 */

import {
  BiometricService,
  BiometricErrorCode,
  BiometricAuthResult,
  BiometricCapability,
} from "@src/services/BiometricService";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import ApiService from "@services/api/apiService";
import * as DeviceUtils from "@utils/deviceUtils";

// Mock UnifiedLogger
jest.mock("@services/logger/UnifiedLogger", () => ({
  UnifiedLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock expo-local-authentication
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));

// Mock ApiService
jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    auth: {
      createDeviceToken: jest.fn(),
      biometricLogin: jest.fn(),
      revokeDeviceToken: jest.fn(),
    },
  },
}));

// Mock device utils
jest.mock("@utils/deviceUtils", () => ({
  getDeviceId: jest.fn(),
  getDeviceName: jest.fn(),
  getPlatform: jest.fn(),
}));

describe("BiometricService", () => {
  const mockHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
  const mockIsEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
  const mockSupportedTypes =
    LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock;
  const mockAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock;
  const mockGetItem = SecureStore.getItemAsync as jest.Mock;
  const mockSetItem = SecureStore.setItemAsync as jest.Mock;
  const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

  // API Service mocks
  const mockCreateDeviceToken = ApiService.auth.createDeviceToken as jest.Mock;
  const mockBiometricLogin = ApiService.auth.biometricLogin as jest.Mock;
  const mockRevokeDeviceToken = ApiService.auth.revokeDeviceToken as jest.Mock;

  // Device utils mocks
  const mockGetDeviceId = DeviceUtils.getDeviceId as jest.Mock;
  const mockGetDeviceName = DeviceUtils.getDeviceName as jest.Mock;
  const mockGetPlatform = DeviceUtils.getPlatform as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock returns
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    mockSupportedTypes.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);
    mockAuthenticate.mockResolvedValue({ success: true });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockDeleteItem.mockResolvedValue(undefined);

    // API Service mocks
    mockCreateDeviceToken.mockResolvedValue({
      data: {
        device_token: "mock-device-token-123",
        expires_at: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
        device_id: "test-device-123",
        message: "Device token created successfully",
      },
    });
    mockBiometricLogin.mockResolvedValue({
      data: {
        access_token: "mock-access-token",
        user: {
          id: "user-123",
          username: "testuser",
          email: "test@example.com",
        },
      },
    });
    mockRevokeDeviceToken.mockResolvedValue({
      data: { message: "Token revoked successfully" },
    });

    // Device utils mocks
    mockGetDeviceId.mockResolvedValue("test-device-123");
    mockGetDeviceName.mockResolvedValue("Test Device");
    mockGetPlatform.mockReturnValue("android");
  });

  describe("isBiometricAvailable", () => {
    it("should return true when hardware is available and user is enrolled", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);

      const result = await BiometricService.isBiometricAvailable();

      expect(result).toBe(true);
      expect(mockHasHardware).toHaveBeenCalled();
      expect(mockIsEnrolled).toHaveBeenCalled();
    });

    it("should return false when hardware is not available", async () => {
      mockHasHardware.mockResolvedValue(false);

      const result = await BiometricService.isBiometricAvailable();

      expect(result).toBe(false);
      expect(mockHasHardware).toHaveBeenCalled();
      expect(mockIsEnrolled).not.toHaveBeenCalled();
    });

    it("should return false when user is not enrolled", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(false);

      const result = await BiometricService.isBiometricAvailable();

      expect(result).toBe(false);
      expect(mockHasHardware).toHaveBeenCalled();
      expect(mockIsEnrolled).toHaveBeenCalled();
    });

    it("should handle errors and return false", async () => {
      mockHasHardware.mockRejectedValue(new Error("Hardware check failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await BiometricService.isBiometricAvailable();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error checking biometric availability:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getBiometricCapability", () => {
    it("should return unavailable capability when hardware is not present", async () => {
      mockHasHardware.mockResolvedValue(false);

      const result = await BiometricService.getBiometricCapability();

      expect(result).toEqual({
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      });
      expect(mockHasHardware).toHaveBeenCalled();
      expect(mockIsEnrolled).not.toHaveBeenCalled();
    });

    it("should return complete capability info for fingerprint", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await BiometricService.getBiometricCapability();

      expect(result).toEqual({
        isAvailable: true,
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [LocalAuthentication.AuthenticationType.FINGERPRINT],
        biometricType: "fingerprint",
      });
    });

    it("should identify face recognition type", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await BiometricService.getBiometricCapability();

      expect(result.biometricType).toBe("face");
    });

    it("should identify iris recognition type", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);

      const result = await BiometricService.getBiometricCapability();

      expect(result.biometricType).toBe("iris");
    });

    it("should identify multiple biometric types", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await BiometricService.getBiometricCapability();

      expect(result.biometricType).toBe("multiple");
    });

    it("should return unknown for empty supported types", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([]);

      const result = await BiometricService.getBiometricCapability();

      expect(result.biometricType).toBe("unknown");
    });

    it("should handle errors and return unavailable capability", async () => {
      mockHasHardware.mockRejectedValue(new Error("Capability check failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await BiometricService.getBiometricCapability();

      expect(result).toEqual({
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error getting biometric capability:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getBiometricTypeName", () => {
    it("should return Fingerprint for fingerprint type", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await BiometricService.getBiometricTypeName();

      expect(result).toBe("Fingerprint");
    });

    it("should return Face Recognition for face type", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await BiometricService.getBiometricTypeName();

      expect(result).toBe("Face Recognition");
    });

    it("should return Iris for iris type", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);

      const result = await BiometricService.getBiometricTypeName();

      expect(result).toBe("Iris");
    });

    it("should return Biometric for multiple types", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await BiometricService.getBiometricTypeName();

      expect(result).toBe("Biometric");
    });

    it("should return Biometric when not available", async () => {
      mockHasHardware.mockResolvedValue(false);

      const result = await BiometricService.getBiometricTypeName();

      expect(result).toBe("Biometric");
    });

    it("should return Biometric for unknown type", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([]);

      const result = await BiometricService.getBiometricTypeName();

      expect(result).toBe("Biometric");
    });
  });

  describe("isBiometricEnabled", () => {
    it("should return true when biometric is enabled", async () => {
      mockGetItem.mockResolvedValue("true");

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(true);
      expect(mockGetItem).toHaveBeenCalledWith("biometric_enabled");
    });

    it("should return false when biometric is not enabled", async () => {
      mockGetItem.mockResolvedValue("false");

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it("should return false when no value is stored", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it("should handle errors and return false", async () => {
      mockGetItem.mockRejectedValue(new Error("SecureStore error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error checking if biometric is enabled:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("enableBiometrics", () => {
    it("should enable biometrics successfully with valid authentication", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({ success: true });
      mockSetItem.mockResolvedValue(undefined);

      const result = await BiometricService.enableBiometrics("testuser");

      expect(result).toBe(true);
      expect(mockAuthenticate).toHaveBeenCalledWith({
        promptMessage: "Verify your biometric to enable this feature",
        cancelLabel: "Cancel",
        disableDeviceFallback: true,
      });

      // Verify device info was retrieved
      expect(mockGetDeviceId).toHaveBeenCalled();
      expect(mockGetDeviceName).toHaveBeenCalled();
      expect(mockGetPlatform).toHaveBeenCalled();

      // Verify API was called to create device token
      expect(mockCreateDeviceToken).toHaveBeenCalledWith({
        device_id: "test-device-123",
        device_name: "Test Device",
        platform: "android",
      });

      // Verify device token and metadata were stored
      expect(mockSetItem).toHaveBeenCalledWith(
        "biometric_device_token",
        "mock-device-token-123"
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        "biometric_device_id",
        "test-device-123"
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        "biometric_username",
        "testuser"
      );
      expect(mockSetItem).toHaveBeenCalledWith("biometric_enabled", "true");
    });

    it("should throw NOT_AVAILABLE error when biometrics not available", async () => {
      mockHasHardware.mockResolvedValue(false);

      await expect(
        BiometricService.enableBiometrics("testuser")
      ).rejects.toThrow("Biometric authentication is not available");

      await expect(
        BiometricService.enableBiometrics("testuser")
      ).rejects.toMatchObject({
        errorCode: BiometricErrorCode.NOT_AVAILABLE,
      });
    });

    it("should throw USER_CANCELLED error when user cancels authentication", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "user_cancel",
      });

      await expect(
        BiometricService.enableBiometrics("testuser")
      ).rejects.toThrow("Biometric verification failed");

      await expect(
        BiometricService.enableBiometrics("testuser")
      ).rejects.toMatchObject({
        errorCode: BiometricErrorCode.USER_CANCELLED,
      });
    });

    it("should throw SYSTEM_CANCELLED error on system cancellation", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "system_cancel",
      });

      await expect(
        BiometricService.enableBiometrics("testuser")
      ).rejects.toMatchObject({
        errorCode: BiometricErrorCode.SYSTEM_CANCELLED,
      });
    });

    it("should throw VERIFICATION_FAILED error on other authentication failures", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "unknown_error",
      });

      await expect(
        BiometricService.enableBiometrics("testuser")
      ).rejects.toMatchObject({
        errorCode: BiometricErrorCode.VERIFICATION_FAILED,
      });
    });

    it("should handle SecureStore errors and throw UNKNOWN_ERROR", async () => {
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({ success: true });
      mockSetItem.mockRejectedValue(new Error("Storage error"));

      await expect(
        BiometricService.enableBiometrics("testuser")
      ).rejects.toMatchObject({
        errorCode: BiometricErrorCode.UNKNOWN_ERROR,
      });
    });
  });

  describe("disableBiometrics", () => {
    it("should disable biometrics successfully and clear all data", async () => {
      mockDeleteItem.mockResolvedValue(undefined);

      const result = await BiometricService.disableBiometricsLocally();

      expect(result).toBe(true);
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_username");
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_device_token");
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_device_id");
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_enabled");
    });

    it("should return false on SecureStore errors", async () => {
      mockDeleteItem.mockRejectedValue(new Error("Delete error"));

      const result = await BiometricService.disableBiometricsLocally();

      expect(result).toBe(false);
    });
  });

  describe("authenticateWithBiometrics", () => {
    it("should authenticate successfully and return access token", async () => {
      mockGetItem
        .mockResolvedValueOnce("true") // isBiometricEnabled
        .mockResolvedValueOnce("mock-device-token-123"); // stored device token (username retrieval removed)
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockSupportedTypes.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      mockAuthenticate.mockResolvedValue({ success: true });

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: true,
        accessToken: "mock-access-token",
        user: {
          id: "user-123",
          username: "testuser",
          email: "test@example.com",
        },
      });
      expect(mockAuthenticate).toHaveBeenCalledWith({
        promptMessage: "Authenticate with Fingerprint",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });
      expect(mockBiometricLogin).toHaveBeenCalledWith({
        device_token: "mock-device-token-123",
      });
    });

    it("should use custom prompt message when provided", async () => {
      mockGetItem
        .mockResolvedValueOnce("true") // isBiometricEnabled
        .mockResolvedValueOnce("mock-device-token"); // device token
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({ success: true });
      mockBiometricLogin.mockResolvedValue({
        data: {
          access_token: "mock-access-token",
          user: {
            user_id: "user-123",
            username: "testuser",
            email: "test@example.com",
          },
        },
      });

      await BiometricService.authenticateWithBiometrics("Custom message");

      expect(mockAuthenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: "Custom message",
        })
      );
    });

    it("should return NOT_ENABLED error when biometrics not enabled", async () => {
      mockGetItem.mockResolvedValueOnce("false"); // isBiometricEnabled returns false

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error: "Biometric authentication is not enabled",
        errorCode: BiometricErrorCode.NOT_ENABLED,
      });
    });

    it("should return NOT_AVAILABLE error when biometrics unavailable", async () => {
      mockGetItem.mockResolvedValueOnce("true"); // isBiometricEnabled returns true
      mockHasHardware.mockResolvedValue(false);

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error: "Biometric authentication is not available",
        errorCode: BiometricErrorCode.NOT_AVAILABLE,
      });
    });

    it("should return USER_CANCELLED error on user cancellation", async () => {
      mockGetItem.mockResolvedValue("true");
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "user_cancel",
      });

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error: "Authentication cancelled",
        errorCode: BiometricErrorCode.USER_CANCELLED,
      });
    });

    it("should return SYSTEM_CANCELLED error on system cancellation", async () => {
      mockGetItem.mockResolvedValue("true");
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "system_cancel",
      });

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error: "Authentication cancelled by system",
        errorCode: BiometricErrorCode.SYSTEM_CANCELLED,
      });
    });

    it("should return LOCKOUT error when too many attempts", async () => {
      mockGetItem.mockResolvedValue("true");
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "lockout",
      });

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error: "Too many attempts. Please try again later",
        errorCode: BiometricErrorCode.LOCKOUT,
      });
    });

    it("should return NOT_ENROLLED error when no biometric data", async () => {
      mockGetItem.mockResolvedValue("true");
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "not_enrolled",
      });

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error: "No biometric data enrolled",
        errorCode: BiometricErrorCode.NOT_ENROLLED,
      });
    });

    it("should return USER_FALLBACK error when user chooses password", async () => {
      mockGetItem.mockResolvedValue("true");
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "user_fallback",
      });

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error: "User chose to use password",
        errorCode: BiometricErrorCode.USER_FALLBACK,
      });
    });

    it("should return CREDENTIALS_NOT_FOUND and auto-disable when device token missing", async () => {
      mockGetItem
        .mockResolvedValueOnce("true") // isBiometricEnabled
        .mockResolvedValueOnce(null); // no stored device token (username retrieval removed)
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({ success: true });
      mockDeleteItem.mockResolvedValue(undefined);

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result).toEqual({
        success: false,
        error:
          "Device token not found. Please re-enroll biometric authentication.",
        errorCode: BiometricErrorCode.CREDENTIALS_NOT_FOUND,
      });
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_username");
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_device_token");
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_device_id");
      expect(mockDeleteItem).toHaveBeenCalledWith("biometric_enabled");
    });

    it("should handle auto-disable errors gracefully when device token missing", async () => {
      mockGetItem
        .mockResolvedValueOnce("true") // isBiometricEnabled
        .mockResolvedValueOnce(null); // no device token (username retrieval removed from code)
      mockHasHardware.mockResolvedValue(true);
      mockIsEnrolled.mockResolvedValue(true);
      mockAuthenticate.mockResolvedValue({ success: true });
      mockDeleteItem.mockRejectedValue(new Error("Delete error"));

      const result = await BiometricService.authenticateWithBiometrics();

      expect(result.errorCode).toBe(BiometricErrorCode.CREDENTIALS_NOT_FOUND);
    });
  });

  describe("hasStoredDeviceToken", () => {
    it("should return true when device token is stored", async () => {
      mockGetItem.mockResolvedValueOnce("mock-device-token-123");

      const result = await BiometricService.hasStoredDeviceToken();

      expect(result).toBe(true);
      expect(mockGetItem).toHaveBeenCalledWith("biometric_device_token");
    });

    it("should return false when no device token is stored", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await BiometricService.hasStoredDeviceToken();

      expect(result).toBe(false);
    });

    it("should handle errors and return false", async () => {
      mockGetItem.mockRejectedValueOnce(new Error("SecureStore error"));

      const result = await BiometricService.hasStoredDeviceToken();

      expect(result).toBe(false);
      // Note: UnifiedLogger.error is mocked at the top of the file
      // The actual console.error is not called in the implementation
    });
  });
});
