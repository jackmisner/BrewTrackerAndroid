/**
 * Base64 Utilities with Environment Compatibility
 *
 * Provides base64 encoding/decoding that works in both browser and Node.js/React Native environments.
 * Polyfills atob/btoa when they're not available (Node.js < 16, React Native tests).
 */

/**
 * Decodes a base64 string to a regular string
 * Works in both browser and Node.js environments
 *
 * @param base64 - Base64 encoded string
 * @returns Decoded string
 */
export function base64Decode(base64: string): string {
  // Try native atob first (available in browsers)
  if (typeof atob === "function") {
    return atob(base64);
  }

  // Fallback for Node.js/React Native environments
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("binary");
  }

  throw new Error("No base64 decoder available in this environment");
}

/**
 * Encodes a string to base64
 * Works in both browser and Node.js environments
 *
 * @param str - String to encode
 * @returns Base64 encoded string
 */
export function base64Encode(str: string): string {
  // Try native btoa first (available in browsers)
  if (typeof btoa === "function") {
    return btoa(str);
  }

  // Fallback for Node.js/React Native environments
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "binary").toString("base64");
  }

  throw new Error("No base64 encoder available in this environment");
}

/**
 * Decodes a base64url string (JWT-style base64) and parses as UTF-8
 * Handles URL-safe characters and missing padding
 *
 * @param base64url - Base64url encoded string
 * @returns Decoded UTF-8 string
 */
export function base64urlDecodeToUTF8(base64url: string): string {
  // Convert base64url to standard base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Decode base64 to binary string
  const binaryString = base64Decode(base64);

  // Convert binary string to UTF-8 using decodeURIComponent + percent encoding
  // This handles non-ASCII characters correctly
  return decodeURIComponent(
    binaryString
      .split("")
      .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}
