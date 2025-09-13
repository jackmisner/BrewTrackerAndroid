/**
 * JWT Utilities for BrewTracker Android
 *
 * Provides client-side JWT token parsing and validation utilities.
 * Used for extracting user information from stored JWT tokens without requiring server calls.
 *
 * Features:
 * - Base64 URL decoding for JWT payload parsing
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

/**
 * Standard JWT payload interface for BrewTracker tokens
 * Contains common JWT claims plus BrewTracker-specific fields
 */
export interface JWTPayload {
  // Standard JWT claims
  iss?: string; // Issuer
  sub?: string; // Subject (usually user ID)
  aud?: string; // Audience
  exp?: number; // Expiration time (Unix timestamp)
  nbf?: number; // Not before time
  iat?: number; // Issued at time
  jti?: string; // JWT ID

  // BrewTracker-specific claims
  user_id: string; // User ID (primary identifier)
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

    // Decode and parse JSON
    const decoded = atob(base64);
    const parsed = JSON.parse(decoded) as JWTPayload;

    // Validate that we have the required user_id field
    if (!parsed.user_id) {
      console.warn("JWT payload missing required user_id field");
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
 *
 * @param token - The JWT token
 * @returns User ID string or null if extraction fails
 */
export function extractUserIdFromJWT(token: string): string | null {
  const payload = decodeJWTPayload(token);
  return payload?.user_id || null;
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
