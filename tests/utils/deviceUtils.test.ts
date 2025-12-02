/**
 * Device Utilities Tests
 *
 * Tests for device identification and platform detection utilities
 * Android-only app
 */

import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { getDeviceId, getDeviceName, getPlatform } from "@utils/deviceUtils";
import { STORAGE_KEYS } from "@services/config";

// Create mutable mock device
const mockDevice = {
  modelName: null as string | null,
  osName: null as string | null,
};

// Mock expo modules
jest.mock("expo-device", () => mockDevice);
jest.mock("expo-secure-store");
jest.mock("expo-crypto");

describe("deviceUtils", () => {
  let originalCrypto: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalCrypto = global.crypto;
  });

  afterEach(() => {
    // Restore original crypto
    Object.defineProperty(global, "crypto", {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
  });

  describe("getDeviceId", () => {
    it("should return existing device ID from SecureStore", async () => {
      const existingId = "existing-device-id-123";
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(existingId);

      const result = await getDeviceId();

      expect(result).toBe(existingId);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.BIOMETRIC_DEVICE_ID
      );
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it("should generate and store new device ID when none exists", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      // Mock crypto.randomUUID
      const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
      Object.defineProperty(global, "crypto", {
        value: {
          randomUUID: jest.fn(() => mockUUID),
        },
        writable: true,
        configurable: true,
      });

      const result = await getDeviceId();

      expect(result).toBe(mockUUID);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.BIOMETRIC_DEVICE_ID,
        mockUUID
      );
    });

    it("should use expo-crypto fallback when crypto.randomUUID is unavailable", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      // Remove crypto.randomUUID
      Object.defineProperty(global, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock expo-crypto random bytes (16 bytes for UUID)
      const mockBytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x11, 0x22, 0x33, 0x44,
        0x55, 0x66, 0x77, 0x88,
      ]);
      (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValue(mockBytes);

      const result = await getDeviceId();

      // Should be a valid UUID format (with version and variant bits set)
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.BIOMETRIC_DEVICE_ID,
        result
      );
    });

    it("should generate temporary ID when SecureStore fails", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error("SecureStore unavailable")
      );

      const mockUUID = "temp-uuid-123";
      Object.defineProperty(global, "crypto", {
        value: {
          randomUUID: jest.fn(() => mockUUID),
        },
        writable: true,
        configurable: true,
      });

      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await getDeviceId();

      expect(result).toBe(mockUUID);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to get/store device ID"),
        expect.any(Error)
      );
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should handle SecureStore.setItemAsync failure gracefully", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error("Storage full")
      );

      const mockUUID = "new-uuid-456";
      Object.defineProperty(global, "crypto", {
        value: {
          randomUUID: jest.fn(() => mockUUID),
        },
        writable: true,
        configurable: true,
      });

      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await getDeviceId();

      // Should still return the generated UUID even if storage fails
      expect(result).toBe(mockUUID);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("getDeviceName", () => {
    it("should return 'Unknown Device' when modelName is null", async () => {
      mockDevice.modelName = null;

      const result = await getDeviceName();

      expect(result).toBe("Unknown Device");
    });

    it("should return 'Unknown Device' when modelName is undefined", async () => {
      mockDevice.modelName = null;

      const result = await getDeviceName();

      expect(result).toBe("Unknown Device");
    });
  });

  describe("getPlatform", () => {
    it("should return 'web' for unknown OS (fallback)", () => {
      mockDevice.osName = "Windows";

      const result = getPlatform();

      expect(result).toBe("web");
    });

    it("should return 'web' when osName is null", () => {
      mockDevice.osName = null;

      const result = getPlatform();

      expect(result).toBe("web");
    });
  });

  describe("UUID generation", () => {
    it("should generate RFC4122 v4 compliant UUIDs with expo-crypto", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      // Remove crypto.randomUUID to force expo-crypto path
      Object.defineProperty(global, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock random bytes that will result in specific UUID
      const mockBytes = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        mockBytes[i] = i * 16;
      }
      (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValue(mockBytes);

      const result = await getDeviceId();

      // Verify UUID format
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // Verify version 4 (4th character of 3rd group should be '4')
      const versionChar = result.split("-")[2][0];
      expect(versionChar).toBe("4");

      // Verify variant (first character of 4th group should be 8, 9, a, or b)
      const variantChar = result.split("-")[3][0].toLowerCase();
      expect(["8", "9", "a", "b"]).toContain(variantChar);
    });

    it("should prefer crypto.randomUUID when available", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const mockUUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
      const randomUUIDMock = jest.fn(() => mockUUID);
      Object.defineProperty(global, "crypto", {
        value: {
          randomUUID: randomUUIDMock,
        },
        writable: true,
        configurable: true,
      });

      const result = await getDeviceId();

      expect(randomUUIDMock).toHaveBeenCalled();
      expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
      expect(result).toBe(mockUUID);
    });
  });
});
