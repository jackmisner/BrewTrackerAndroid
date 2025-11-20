/**
 * Device Utilities
 *
 * Helpers for device identification and platform detection
 */

import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { STORAGE_KEYS } from "@services/config";

/**
 * Get or create a unique device identifier
 *
 * Generates a persistent UUID for this device installation.
 * Stored in SecureStore to survive app updates but not reinstalls.

 *
 * @returns Unique device identifier
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to retrieve existing device ID
    let deviceId = await SecureStore.getItemAsync(
      STORAGE_KEYS.BIOMETRIC_DEVICE_ID
    );

    if (deviceId) {
      return deviceId;
    }

    // Generate new device ID (crypto-safe random UUID)
    deviceId = await generateUUID();

    // Store for future use
    await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_DEVICE_ID, deviceId);

    return deviceId;
  } catch (error) {
    // Fallback: generate temporary ID (won't persist across reinstalls)
    console.warn(
      "Failed to get/store device ID from SecureStore, using temporary ID:",
      error
    );
    return await generateUUID();
  }
}

/**
 * Get human-readable device name
 *
 * @returns Device name like "Pixel 6" or "Unknown Device"
 */
export async function getDeviceName(): Promise<string> {
  try {
    const modelName = Device.modelName || "Unknown Device";
    return modelName;
  } catch {
    return "Unknown Device";
  }
}

/**
 * Get platform identifier
 *
 * @returns "android", "ios", or "web"
 */
export function getPlatform(): "android" | "ios" | "web" {
  if (Device.osName === "Android") {
    return "android";
  } else if (Device.osName === "iOS") {
    return "ios";
  } else {
    return "web";
  }
}

/**
 * Generate a cryptographically secure UUID v4
 *
 * Uses crypto.randomUUID if available, otherwise falls back to expo-crypto's
 * getRandomBytesAsync to produce 16 secure random bytes formatted as an RFC4122 v4 UUID.
 *
 * @returns Promise resolving to a UUID string
 */
async function generateUUID(): Promise<string> {
  // Use crypto.randomUUID if available (modern environments)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Secure fallback: Use expo-crypto to generate 16 random bytes
  // and format them as an RFC4122 v4 UUID
  const randomBytes = await Crypto.getRandomBytesAsync(16);

  // Convert bytes to hex and format as UUID
  const bytes = Array.from(randomBytes);

  // Set version (4) and variant bits per RFC4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Format as UUID string: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = bytes.map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
