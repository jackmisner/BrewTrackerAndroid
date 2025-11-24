/**
 * Tests for DeviceTokenService
 *
 * Tests device token management including creation, exchange, storage, and revocation
 */

import { DeviceTokenService } from "@services/auth/DeviceTokenService";
import * as SecureStore from "expo-secure-store";
import ApiService from "@services/api/apiService";

// Mock SecureStore
jest.mock("expo-secure-store");

// Mock ApiService (default export)
jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    auth: {
      createDeviceToken: jest.fn(),
      biometricLogin: jest.fn(),
      listDeviceTokens: jest.fn(),
      revokeDeviceToken: jest.fn(),
      revokeAllDeviceTokens: jest.fn(),
    },
  },
}));

// Mock expo-device
jest.mock("expo-device", () => ({
  deviceName: "Test Device",
}));

describe("DeviceTokenService", () => {
  const mockDeviceToken = "mock-device-token-abc123";
  const mockUsername = "testuser";
  const mockDeviceId = "android-Test-Device-1234567890";

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console logs to reduce test noise
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("hasDeviceToken", () => {
    it("should return true when device token exists and is enabled", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(
        async (key: string) => {
          if (key === "device_token") {
            return mockDeviceToken;
          }
          if (key === "device_token_enabled") {
            return "true";
          }
          return null;
        }
      );

      const hasToken = await DeviceTokenService.hasDeviceToken();

      expect(hasToken).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("device_token");
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "device_token_enabled"
      );
    });

    it("should return false when device token does not exist", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const hasToken = await DeviceTokenService.hasDeviceToken();

      expect(hasToken).toBe(false);
    });

    it("should return false when device token exists but is not enabled", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(
        async (key: string) => {
          if (key === "device_token") {
            return mockDeviceToken;
          }
          if (key === "device_token_enabled") {
            return null;
          }
          return null;
        }
      );

      const hasToken = await DeviceTokenService.hasDeviceToken();

      expect(hasToken).toBe(false);
    });

    it("should return false on SecureStore error", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error("SecureStore error")
      );

      const hasToken = await DeviceTokenService.hasDeviceToken();

      expect(hasToken).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("getDeviceToken", () => {
    it("should return device token when it exists", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        mockDeviceToken
      );

      const token = await DeviceTokenService.getDeviceToken();

      expect(token).toBe(mockDeviceToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("device_token");
    });

    it("should return null when device token does not exist", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await DeviceTokenService.getDeviceToken();

      expect(token).toBeNull();
    });

    it("should return null on SecureStore error", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error("SecureStore error")
      );

      const token = await DeviceTokenService.getDeviceToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("getStoredUsername", () => {
    it("should return stored username when it exists", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockUsername);

      const username = await DeviceTokenService.getStoredUsername();

      expect(username).toBe(mockUsername);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "device_token_username"
      );
    });

    it("should return null when username does not exist", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const username = await DeviceTokenService.getStoredUsername();

      expect(username).toBeNull();
    });
  });

  describe("getDeviceId", () => {
    it("should return device ID when it exists", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockDeviceId);

      const deviceId = await DeviceTokenService.getDeviceId();

      expect(deviceId).toBe(mockDeviceId);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "device_token_device_id"
      );
    });

    it("should return null when device ID does not exist", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const deviceId = await DeviceTokenService.getDeviceId();

      expect(deviceId).toBeNull();
    });
  });

  describe("createDeviceToken", () => {
    const mockResponse = {
      data: {
        device_token: mockDeviceToken,
        expires_at: "2025-03-01T00:00:00Z",
        device_id: mockDeviceId,
        message: "Device token created successfully",
      },
    };

    beforeEach(() => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it("should create device token successfully", async () => {
      (ApiService.auth.createDeviceToken as jest.Mock).mockResolvedValue(
        mockResponse
      );

      const result = await DeviceTokenService.createDeviceToken(mockUsername);

      expect(result.success).toBe(true);
      expect(result.device_token).toBe(mockDeviceToken);
      expect(result.expires_at).toBe("2025-03-01T00:00:00Z");

      // Verify API was called with correct parameters
      expect(ApiService.auth.createDeviceToken).toHaveBeenCalledWith(
        expect.objectContaining({
          device_name: "Test Device",
          platform: "android",
        })
      );

      // Verify device token was stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "device_token",
        mockDeviceToken
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "device_token_username",
        mockUsername
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "device_token_enabled",
        "true"
      );
    });

    it("should handle API error gracefully", async () => {
      const mockError = {
        response: {
          data: {
            error: "Failed to create device token",
          },
        },
      };

      (ApiService.auth.createDeviceToken as jest.Mock).mockRejectedValue(
        mockError
      );

      const result = await DeviceTokenService.createDeviceToken(mockUsername);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create device token");
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it("should handle network error", async () => {
      (ApiService.auth.createDeviceToken as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const result = await DeviceTokenService.createDeviceToken(mockUsername);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should generate unique device IDs", async () => {
      (ApiService.auth.createDeviceToken as jest.Mock).mockResolvedValue(
        mockResponse
      );

      await DeviceTokenService.createDeviceToken(mockUsername);
      const firstCall = (ApiService.auth.createDeviceToken as jest.Mock).mock
        .calls[0][0];

      // Clear mocks and create another token
      jest.clearAllMocks();
      (ApiService.auth.createDeviceToken as jest.Mock).mockResolvedValue(
        mockResponse
      );

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await DeviceTokenService.createDeviceToken(mockUsername);
      const secondCall = (ApiService.auth.createDeviceToken as jest.Mock).mock
        .calls[0][0];

      // Device IDs should be different due to timestamp
      expect(firstCall.device_id).not.toBe(secondCall.device_id);
    });
  });

  describe("exchangeDeviceToken", () => {
    const mockLoginResponse = {
      data: {
        access_token: "mock-jwt-token",
        user: {
          id: "123",
          username: mockUsername,
          email: "test@example.com",
        },
      },
    };

    it("should exchange device token successfully", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        mockDeviceToken
      );
      (ApiService.auth.biometricLogin as jest.Mock).mockResolvedValue(
        mockLoginResponse
      );

      const result = await DeviceTokenService.exchangeDeviceToken();

      expect(result.success).toBe(true);
      expect(result.access_token).toBe("mock-jwt-token");
      expect(result.user).toEqual(mockLoginResponse.data.user);

      expect(ApiService.auth.biometricLogin).toHaveBeenCalledWith({
        device_token: mockDeviceToken,
      });
    });

    it("should exchange provided device token", async () => {
      const providedToken = "provided-device-token";
      (ApiService.auth.biometricLogin as jest.Mock).mockResolvedValue(
        mockLoginResponse
      );

      const result =
        await DeviceTokenService.exchangeDeviceToken(providedToken);

      expect(result.success).toBe(true);
      expect(ApiService.auth.biometricLogin).toHaveBeenCalledWith({
        device_token: providedToken,
      });
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it("should return error when no device token found", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await DeviceTokenService.exchangeDeviceToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No device token found");
      expect(result.error_code).toBe("INVALID_TOKEN");
      expect(ApiService.auth.biometricLogin).not.toHaveBeenCalled();
    });

    it("should handle 401 invalid token error", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        mockDeviceToken
      );
      (ApiService.auth.biometricLogin as jest.Mock).mockRejectedValue({
        response: {
          status: 401,
          data: { error: "Invalid device token" },
        },
      });

      const result = await DeviceTokenService.exchangeDeviceToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid device token");
      expect(result.error_code).toBe("INVALID_TOKEN");
    });

    it("should handle 403 expired token error", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        mockDeviceToken
      );
      (ApiService.auth.biometricLogin as jest.Mock).mockRejectedValue({
        response: {
          status: 403,
          data: { error: "Device token expired" },
        },
      });

      const result = await DeviceTokenService.exchangeDeviceToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Device token expired");
      expect(result.error_code).toBe("EXPIRED_TOKEN");
    });

    it("should handle network error", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        mockDeviceToken
      );
      (ApiService.auth.biometricLogin as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const result = await DeviceTokenService.exchangeDeviceToken();

      expect(result.success).toBe(false);
      expect(result.error_code).toBe("NETWORK_ERROR");
    });
  });

  describe("clearDeviceToken", () => {
    it("should clear all device token data", async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await DeviceTokenService.clearDeviceToken();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("device_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "device_token_device_id"
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "device_token_username"
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "device_token_enabled"
      );
    });

    it("should handle SecureStore errors gracefully", async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error("SecureStore error")
      );

      // Should not throw
      await expect(
        DeviceTokenService.clearDeviceToken()
      ).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("listDeviceTokens", () => {
    const mockTokens = [
      {
        device_id: "device-1",
        device_name: "Device 1",
        platform: "android",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-04-01T00:00:00Z",
      },
      {
        device_id: "device-2",
        device_name: "Device 2",
        platform: "android",
        created_at: "2025-01-15T00:00:00Z",
        expires_at: "2025-04-15T00:00:00Z",
      },
    ];

    it("should list device tokens successfully", async () => {
      (ApiService.auth.listDeviceTokens as jest.Mock).mockResolvedValue({
        data: { tokens: mockTokens },
      });

      const tokens = await DeviceTokenService.listDeviceTokens();

      expect(tokens).toEqual(mockTokens);
      expect(ApiService.auth.listDeviceTokens).toHaveBeenCalledWith(false);
    });

    it("should include revoked tokens when requested", async () => {
      (ApiService.auth.listDeviceTokens as jest.Mock).mockResolvedValue({
        data: { tokens: mockTokens },
      });

      await DeviceTokenService.listDeviceTokens(true);

      expect(ApiService.auth.listDeviceTokens).toHaveBeenCalledWith(true);
    });

    it("should return empty array on API error", async () => {
      (ApiService.auth.listDeviceTokens as jest.Mock).mockRejectedValue(
        new Error("API error")
      );

      const tokens = await DeviceTokenService.listDeviceTokens();

      expect(tokens).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle missing tokens in response", async () => {
      (ApiService.auth.listDeviceTokens as jest.Mock).mockResolvedValue({
        data: {},
      });

      const tokens = await DeviceTokenService.listDeviceTokens();

      expect(tokens).toEqual([]);
    });
  });

  describe("revokeDeviceToken", () => {
    const deviceIdToRevoke = "device-123";

    it("should revoke device token successfully", async () => {
      (ApiService.auth.revokeDeviceToken as jest.Mock).mockResolvedValue({
        data: { message: "Device token revoked" },
      });
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        "different-device-id"
      );

      const success =
        await DeviceTokenService.revokeDeviceToken(deviceIdToRevoke);

      expect(success).toBe(true);
      expect(ApiService.auth.revokeDeviceToken).toHaveBeenCalledWith(
        deviceIdToRevoke
      );
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it("should clear local storage when revoking current device", async () => {
      (ApiService.auth.revokeDeviceToken as jest.Mock).mockResolvedValue({
        data: { message: "Device token revoked" },
      });
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        deviceIdToRevoke
      );
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const success =
        await DeviceTokenService.revokeDeviceToken(deviceIdToRevoke);

      expect(success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("device_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "device_token_device_id"
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "device_token_username"
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "device_token_enabled"
      );
    });

    it("should return false on API error", async () => {
      (ApiService.auth.revokeDeviceToken as jest.Mock).mockRejectedValue(
        new Error("API error")
      );

      const success =
        await DeviceTokenService.revokeDeviceToken(deviceIdToRevoke);

      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("revokeAllDeviceTokens", () => {
    it("should revoke all device tokens successfully", async () => {
      (ApiService.auth.revokeAllDeviceTokens as jest.Mock).mockResolvedValue({
        data: { message: "All tokens revoked" },
      });
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const success = await DeviceTokenService.revokeAllDeviceTokens();

      expect(success).toBe(true);
      expect(ApiService.auth.revokeAllDeviceTokens).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(4);
    });

    it("should return false on API error", async () => {
      (ApiService.auth.revokeAllDeviceTokens as jest.Mock).mockRejectedValue(
        new Error("API error")
      );

      const success = await DeviceTokenService.revokeAllDeviceTokens();

      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("isEnabled", () => {
    it("should return true when device token is enabled", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(
        async (key: string) => {
          if (key === "device_token") {
            return mockDeviceToken;
          }
          if (key === "device_token_enabled") {
            return "true";
          }
          return null;
        }
      );

      const isEnabled = await DeviceTokenService.isEnabled();

      expect(isEnabled).toBe(true);
    });

    it("should return false when device token is not enabled", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const isEnabled = await DeviceTokenService.isEnabled();

      expect(isEnabled).toBe(false);
    });
  });

  describe("getDebugInfo", () => {
    it("should return comprehensive debug information", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(
        async (key: string) => {
          switch (key) {
            case "device_token":
              return mockDeviceToken;
            case "device_token_device_id":
              return mockDeviceId;
            case "device_token_username":
              return mockUsername;
            case "device_token_enabled":
              return "true";
            default:
              return null;
          }
        }
      );

      const debugInfo = await DeviceTokenService.getDebugInfo();

      expect(debugInfo).toEqual({
        hasToken: true,
        hasDeviceId: true,
        hasUsername: true,
        isEnabled: true,
        username: mockUsername,
        deviceId: mockDeviceId,
      });
    });

    it("should show missing data in debug info", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const debugInfo = await DeviceTokenService.getDebugInfo();

      expect(debugInfo).toEqual({
        hasToken: false,
        hasDeviceId: false,
        hasUsername: false,
        isEnabled: false,
        username: null,
        deviceId: null,
      });
    });
  });
});
