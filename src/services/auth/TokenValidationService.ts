/**
 * TokenValidationService
 *
 * Handles JWT token validation and expiration checking for offline scenarios.
 * Decodes JWT tokens to extract expiration information and determines authentication
 * status based on grace period configuration.
 */

import { UnifiedLogger } from "@services/logger/UnifiedLogger";

export type TokenStatus =
  | "VALID" // Token not expired
  | "EXPIRED_IN_GRACE" // Expired < GRACE_PERIOD_DAYS ago
  | "EXPIRED_BEYOND_GRACE" // Expired > GRACE_PERIOD_DAYS ago
  | "INVALID"; // Corrupted/tampered/malformed token

export interface TokenPayload {
  user_id: string;
  username: string;
  email: string;
  exp: number; // Unix timestamp (seconds)
  iat: number; // Unix timestamp (seconds)
}

export interface TokenValidation {
  status: TokenStatus;
  payload: TokenPayload | null;
  expiresAt: number | null; // Unix timestamp
  issuedAt: number | null; // Unix timestamp
  secondsUntilExpiry: number | null;
  daysUntilExpiry: number | null;
  daysSinceExpiry: number | null;
}

export class TokenValidationService {
  /**
   * Grace period in days after token expiration during which
   * users can still access the app with limited permissions
   */
  static readonly GRACE_PERIOD_DAYS = 7;

  /**
   * Days before expiration to show warning messages
   */
  static readonly WARNING_THRESHOLD_DAYS = 2;

  /**
   * Decode JWT payload without verification
   * This is safe for offline validation since we're only reading expiration
   * and the backend will still validate tokens on all API calls
   *
   * @param token - JWT token string
   * @returns Decoded payload or null if invalid format
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      // JWT format: header.payload.signature
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      // Decode base64url payload (middle part)
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      const payload = JSON.parse(jsonPayload);

      // Validate required fields
      if (!payload.user_id || !payload.exp) {
        return null;
      }

      return payload as TokenPayload;
    } catch (error) {
      // Invalid base64, JSON parsing error, or missing fields
      void UnifiedLogger.debug(
        "TokenValidationService",
        "Failed to decode token",
        error
      );
      return null;
    }
  }

  /**
   * Validate token and determine authentication status
   *
   * @param token - JWT token string
   * @returns Token validation result with status and metadata
   */
  static validateToken(token: string): TokenValidation {
    const payload = this.decodeToken(token);

    if (!payload || !payload.exp) {
      return {
        status: "INVALID",
        payload: null,
        expiresAt: null,
        issuedAt: null,
        secondsUntilExpiry: null,
        daysUntilExpiry: null,
        daysSinceExpiry: null,
      };
    }

    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const expiresAt = payload.exp;
    const issuedAt = payload.iat || null;
    const secondsUntilExpiry = expiresAt - now;

    // Token is still valid
    if (secondsUntilExpiry > 0) {
      return {
        status: "VALID",
        payload,
        expiresAt,
        issuedAt,
        secondsUntilExpiry,
        daysUntilExpiry: secondsUntilExpiry / (60 * 60 * 24),
        daysSinceExpiry: null,
      };
    }

    // Token is expired - check grace period
    const secondsSinceExpiry = Math.abs(secondsUntilExpiry);
    const daysSinceExpiry = secondsSinceExpiry / (60 * 60 * 24);

    if (daysSinceExpiry <= this.GRACE_PERIOD_DAYS) {
      return {
        status: "EXPIRED_IN_GRACE",
        payload,
        expiresAt,
        issuedAt,
        secondsUntilExpiry: null,
        daysUntilExpiry: null,
        daysSinceExpiry,
      };
    }

    return {
      status: "EXPIRED_BEYOND_GRACE",
      payload,
      expiresAt,
      issuedAt,
      secondsUntilExpiry: null,
      daysUntilExpiry: null,
      daysSinceExpiry,
    };
  }

  /**
   * Check if token will expire soon (within WARNING_THRESHOLD_DAYS)
   *
   * @param token - JWT token string
   * @returns True if token expires within warning threshold
   */
  static isExpiringSoon(token: string): boolean {
    const validation = this.validateToken(token);

    if (validation.status !== "VALID" || !validation.daysUntilExpiry) {
      return false;
    }

    return validation.daysUntilExpiry <= this.WARNING_THRESHOLD_DAYS;
  }

  /**
   * Get human-readable expiration message
   *
   * @param token - JWT token string
   * @returns User-friendly message about token expiration status
   */
  static getExpirationMessage(token: string): string {
    const validation = this.validateToken(token);

    switch (validation.status) {
      case "VALID":
        if (!validation.daysUntilExpiry) {
          return "Session active";
        }

        if (validation.daysUntilExpiry < 1) {
          const hours = Math.floor((validation.secondsUntilExpiry || 0) / 3600);
          return `Session expires in ${hours} hour${hours !== 1 ? "s" : ""}`;
        }

        const days = Math.floor(validation.daysUntilExpiry);
        return `Session expires in ${days} day${days !== 1 ? "s" : ""}`;

      case "EXPIRED_IN_GRACE":
        if (!validation.daysSinceExpiry) {
          return "Session expired recently";
        }

        const expiredDays = Math.floor(validation.daysSinceExpiry);
        return `Session expired ${expiredDays} day${expiredDays !== 1 ? "s" : ""} ago`;

      case "EXPIRED_BEYOND_GRACE":
        return "Session expired - reconnect required";

      case "INVALID":
        return "Invalid session";

      default:
        return "Unknown session status";
    }
  }

  /**
   * Get user-friendly status text for UI display
   *
   * @param status - Token status
   * @returns Display text for the given status
   */
  static getStatusDisplayText(status: TokenStatus): string {
    switch (status) {
      case "VALID":
        return "Connected";
      case "EXPIRED_IN_GRACE":
        return "Limited Access";
      case "EXPIRED_BEYOND_GRACE":
        return "Read-Only Mode";
      case "INVALID":
        return "Not Authenticated";
      default:
        return "Unknown";
    }
  }
}
