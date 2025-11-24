/**
 * JWT Utilities for BrewTracker Android
 *
 * Provides client-side JWT token parsing and validation utilities.
 * Used for extracting user information from stored JWT tokens without requiring server calls.
 *
 * Features:
 * - Base64 URL decoding for JWT payload parsing (with environment compatibility)
 * - Type-safe token payload interface
 * - Token expiration checking
 * - Error handling for malformed tokens
 *
 * Note: This is client-side parsing only - server validation is still required for security.
 *
 * @example
 * ```typescript
 * const payload = decodeJWTPayload(token);
 * if (payload && !isTokenExpired(payload)) {
 *   console.log('User ID:', payload.user_id);
 * }
 * ```
 */

import { base64Decode } from "./base64";

/**
 * Standard JWT payload interface for BrewTracker tokens
 * Contains common JWT claims plus BrewTracker-specific fields
 */
export interface JWTPayload {
  // Standard JWT claims
  iss?: string; // Issuer
  sub?: string; // Subject (primary user identifier in Flask-JWT-Extended)
  aud?: string; // Audience
  exp?: number; // Expiration time (Unix timestamp)
  nbf?: number; // Not before time
  iat?: number; // Issued at time
  jti?: string; // JWT ID

  // Alternative user ID fields (for compatibility)
  user_id?: string; // Alternative user ID field
  id?: string; // Common alternative
  userId?: string; // CamelCase alternative
  uid?: string; // Another common format
  email?: string; // User email
  username?: string; // Username
  email_verified?: boolean; // Email verification status
}

/**
 * Decodes a JWT token payload without verification
 *
 * IMPORTANT: This only decodes the payload for client-side use.
 * Server-side verification is still required for security.
 *
 * @param token - The JWT token to decode
 * @returns Decoded payload or null if token is malformed
 */
export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.warn("Invalid JWT format: expected 3 parts");
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // JWT uses base64url encoding, which is slightly different from base64
    // Replace URL-safe characters and add padding if needed
    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");

    // Decode and parse JSON (uses environment-compatible base64Decode)
    const decoded = base64Decode(base64);
    const parsed = JSON.parse(decoded) as JWTPayload;

    // Validate that the payload contains at least one user identification field
    const hasUserIdentification = [
      "sub",
      "user_id",
      "id",
      "userId",
      "uid",
    ].some(field => {
      const value = (parsed as any)[field];
      return (
        value !== undefined && value !== null && String(value).trim() !== ""
      );
    });

    if (!hasUserIdentification) {
      console.warn("JWT payload missing user identification field");
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("Failed to decode JWT payload:", error);
    return null;
  }
}

/**
 * Extracts the user ID from a JWT token
 * Tries multiple common field names for user identification
 *
 * @param token - The JWT token
 * @returns User ID string or null if extraction fails
 */
export function extractUserIdFromJWT(token: string): string | null {
  try {
    const parsed = decodeJWTPayload(token);
    if (!parsed) {
      return null;
    }

    // Try multiple possible field names for user ID
    // Priority order based on backend JWT implementation
    const possibleUserIdFields = [
      "sub", // JWT standard subject field (Flask-JWT-Extended uses this)
      "user_id", // BrewTracker expected format
      "id", // Common alternative
      "userId", // CamelCase alternative
      "uid", // Another common format
    ];

    for (const field of possibleUserIdFields) {
      const v = (parsed as any)[field];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }

    // No user ID found in any expected field
    return null;
  } catch {
    // Silent failure - token is malformed but we don't want to spam logs
    return null;
  }
}

/**
 * Checks if a JWT token is expired
 *
 * @param payload - The decoded JWT payload
 * @returns True if token is expired, false otherwise
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) {
    // No expiration claim - treat as non-expiring (though this is unusual)
    return false;
  }

  // Convert exp (seconds since Unix epoch) to milliseconds and compare with now
  const expirationTime = payload.exp * 1000;
  const now = Date.now();

  return now >= expirationTime;
}

/**
 * Checks if a JWT token will expire within the specified time period
 *
 * @param payload - The decoded JWT payload
 * @param bufferMs - Time buffer in milliseconds (default: 5 minutes)
 * @returns True if token will expire soon, false otherwise
 */
export function isTokenExpiringSoon(
  payload: JWTPayload,
  bufferMs: number = 5 * 60 * 1000
): boolean {
  if (!payload.exp) {
    return false;
  }

  const expirationTime = payload.exp * 1000;
  const now = Date.now();

  return now >= expirationTime - bufferMs;
}

/**
 * Gets the remaining time until token expiration
 *
 * @param payload - The decoded JWT payload
 * @returns Milliseconds until expiration, or null if no expiration
 */
export function getTokenTimeRemaining(payload: JWTPayload): number | null {
  if (!payload.exp) {
    return null;
  }

  const expirationTime = payload.exp * 1000;
  const now = Date.now();

  return Math.max(0, expirationTime - now);
}

/**
 * Validates JWT token format and basic structure
 * Does NOT verify cryptographic signature - use for client-side parsing only
 *
 * @param token - The token to validate
 * @returns Validation result with status and optional payload
 */
export function validateJWTStructure(token: string): {
  isValid: boolean;
  payload: JWTPayload | null;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return {
      isValid: false,
      payload: null,
      error: "Token is empty or not a string",
    };
  }

  const payload = decodeJWTPayload(token);
  if (!payload) {
    return {
      isValid: false,
      payload: null,
      error: "Failed to decode token payload",
    };
  }

  if (isTokenExpired(payload)) {
    return { isValid: false, payload, error: "Token has expired" };
  }

  return { isValid: true, payload };
}

/**
 * Debug function to inspect JWT token structure
 * Only use in development for troubleshooting
 */
export function debugJWTToken(token: string): void {
  if (!__DEV__) {
    return;
  }

  try {
    const parsed = decodeJWTPayload(token);
    if (!parsed) {
      console.log("JWT Debug: Invalid token format/payload");
      return;
    }

    console.log("=== JWT Token Debug ===");
    console.log("Full payload:", parsed);
    console.log("Available user ID fields:");

    const userIdFields = ["sub", "user_id", "id", "userId", "uid"] as const;
    userIdFields.forEach(field => {
      if (parsed[field]) {
        console.log(`  ${field}: ${parsed[field]}`);
      }
    });

    console.log("Extracted User ID:", extractUserIdFromJWT(token));
    console.log("======================");
  } catch (error) {
    console.log("JWT Debug: Failed to decode token", error);
  }
}
