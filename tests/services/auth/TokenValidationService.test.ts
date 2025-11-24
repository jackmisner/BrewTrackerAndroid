/**
 * Tests for TokenValidationService
 *
 * Tests JWT token validation, expiration checking, and grace period logic
 */

import {
  TokenValidationService,
  type TokenStatus,
} from "@services/auth/TokenValidationService";

describe("TokenValidationService", () => {
  // Helper to create a mock JWT token
  const createMockToken = (payload: any): string => {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = "mock-signature";
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  };

  // Helper to get current unix timestamp
  const now = (): number => Math.floor(Date.now() / 1000);

  describe("decodeToken", () => {
    it("should decode valid JWT token", () => {
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + 3600,
        iat: now(),
      };

      const token = createMockToken(payload);
      const decoded = TokenValidationService.decodeToken(token);

      expect(decoded).toEqual(payload);
    });

    it("should return null for malformed token (not 3 parts)", () => {
      const invalidToken = "invalid.token";
      const decoded = TokenValidationService.decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should return null for token with invalid base64", () => {
      const invalidToken = "header.!!!invalid-base64!!!.signature";
      const decoded = TokenValidationService.decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should return null for token missing required fields", () => {
      const payload = { username: "testuser" }; // Missing user_id and exp
      const token = createMockToken(payload);
      const decoded = TokenValidationService.decodeToken(token);

      expect(decoded).toBeNull();
    });

    it("should return null for empty string token", () => {
      const decoded = TokenValidationService.decodeToken("");

      expect(decoded).toBeNull();
    });
  });

  describe("validateToken", () => {
    it("should return VALID for non-expired token", () => {
      const expiresIn = 7200; // 2 hours from now
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      expect(validation.status).toBe("VALID");
      expect(validation.payload).toEqual(payload);
      expect(validation.expiresAt).toBe(payload.exp);
      expect(validation.issuedAt).toBe(payload.iat);
      expect(validation.secondsUntilExpiry).toBeGreaterThan(7000);
      expect(validation.secondsUntilExpiry).toBeLessThanOrEqual(expiresIn);
      expect(validation.daysUntilExpiry).toBeGreaterThan(0);
      expect(validation.daysSinceExpiry).toBeNull();
    });

    it("should return EXPIRED_IN_GRACE for token expired within grace period", () => {
      const expiredDaysAgo = 3; // 3 days ago (within 7-day grace)
      const expiredSeconds = expiredDaysAgo * 24 * 60 * 60;
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() - expiredSeconds,
        iat: now() - expiredSeconds - 7200,
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      expect(validation.status).toBe("EXPIRED_IN_GRACE");
      expect(validation.payload).toEqual(payload);
      expect(validation.expiresAt).toBe(payload.exp);
      expect(validation.secondsUntilExpiry).toBeNull();
      expect(validation.daysUntilExpiry).toBeNull();
      expect(validation.daysSinceExpiry).toBeGreaterThan(2.9);
      expect(validation.daysSinceExpiry).toBeLessThan(3.1);
    });

    it("should return EXPIRED_IN_GRACE for token expired exactly at grace period", () => {
      const expiredDaysAgo = 7; // Exactly 7 days (edge of grace period)
      const expiredSeconds = expiredDaysAgo * 24 * 60 * 60;
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() - expiredSeconds,
        iat: now() - expiredSeconds - 7200,
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      expect(validation.status).toBe("EXPIRED_IN_GRACE");
      expect(validation.daysSinceExpiry).toBeGreaterThanOrEqual(6.9);
      expect(validation.daysSinceExpiry).toBeLessThanOrEqual(7);
    });

    it("should return EXPIRED_BEYOND_GRACE for token expired beyond grace period", () => {
      const expiredDaysAgo = 10; // 10 days ago (beyond 7-day grace)
      const expiredSeconds = expiredDaysAgo * 24 * 60 * 60;
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() - expiredSeconds,
        iat: now() - expiredSeconds - 7200,
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      expect(validation.status).toBe("EXPIRED_BEYOND_GRACE");
      expect(validation.payload).toEqual(payload);
      expect(validation.secondsUntilExpiry).toBeNull();
      expect(validation.daysUntilExpiry).toBeNull();
      expect(validation.daysSinceExpiry).toBeGreaterThan(9.9);
      expect(validation.daysSinceExpiry).toBeLessThan(10.1);
    });

    it("should return INVALID for malformed token", () => {
      const validation = TokenValidationService.validateToken("invalid-token");

      expect(validation.status).toBe("INVALID");
      expect(validation.payload).toBeNull();
      expect(validation.expiresAt).toBeNull();
      expect(validation.issuedAt).toBeNull();
      expect(validation.secondsUntilExpiry).toBeNull();
      expect(validation.daysUntilExpiry).toBeNull();
      expect(validation.daysSinceExpiry).toBeNull();
    });

    it("should return INVALID for token missing exp field", () => {
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        // Missing exp field
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      expect(validation.status).toBe("INVALID");
    });

    it("should handle token without iat field gracefully", () => {
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + 3600,
        // Missing iat field (optional)
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      expect(validation.status).toBe("VALID");
      expect(validation.issuedAt).toBeNull();
    });
  });

  describe("isExpiringSoon", () => {
    it("should return true for token expiring within warning threshold", () => {
      const expiresIn = 1.5 * 24 * 60 * 60; // 1.5 days (< 2 day threshold)
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };

      const token = createMockToken(payload);
      const isExpiringSoon = TokenValidationService.isExpiringSoon(token);

      expect(isExpiringSoon).toBe(true);
    });

    it("should return false for token expiring beyond warning threshold", () => {
      const expiresIn = 5 * 24 * 60 * 60; // 5 days (> 2 day threshold)
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };

      const token = createMockToken(payload);
      const isExpiringSoon = TokenValidationService.isExpiringSoon(token);

      expect(isExpiringSoon).toBe(false);
    });

    it("should return false for already expired token", () => {
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() - 3600, // Expired 1 hour ago
        iat: now() - 7200,
      };

      const token = createMockToken(payload);
      const isExpiringSoon = TokenValidationService.isExpiringSoon(token);

      expect(isExpiringSoon).toBe(false);
    });

    it("should return false for invalid token", () => {
      const isExpiringSoon =
        TokenValidationService.isExpiringSoon("invalid-token");

      expect(isExpiringSoon).toBe(false);
    });
  });

  describe("getExpirationMessage", () => {
    it("should return message with hours for token expiring within 1 day", () => {
      const expiresIn = 5 * 60 * 60; // 5 hours
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };
      const token = createMockToken(payload);
      const message = TokenValidationService.getExpirationMessage(token);
      expect(message).toMatch(/Session expires in \d+ hours?/);
    });
    it("should return message with days for token expiring in multiple days", () => {
      const expiresIn = 5 * 24 * 60 * 60; // 5 days
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };
      const token = createMockToken(payload);
      const message = TokenValidationService.getExpirationMessage(token);
      expect(message).toMatch(/Session expires in \d+ days?/);
    });

    it("should return message for expired token within grace period", () => {
      const expiredDaysAgo = 3;
      const expiredSeconds = expiredDaysAgo * 24 * 60 * 60;
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() - expiredSeconds,
        iat: now() - expiredSeconds - 7200,
      };

      const token = createMockToken(payload);
      const message = TokenValidationService.getExpirationMessage(token);

      expect(message).toContain("3 days");
      expect(message).toContain("Session expired");
    });

    it("should return message for expired token beyond grace period", () => {
      const expiredDaysAgo = 10;
      const expiredSeconds = expiredDaysAgo * 24 * 60 * 60;
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() - expiredSeconds,
        iat: now() - expiredSeconds - 7200,
      };

      const token = createMockToken(payload);
      const message = TokenValidationService.getExpirationMessage(token);

      expect(message).toBe("Session expired - reconnect required");
    });

    it("should return message for invalid token", () => {
      const message =
        TokenValidationService.getExpirationMessage("invalid-token");

      expect(message).toBe("Invalid session");
    });

    it("should use singular form for 1 hour", () => {
      const expiresIn = 1 * 60 * 60; // 1 hour
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };

      const token = createMockToken(payload);
      const message = TokenValidationService.getExpirationMessage(token);

      expect(message).toContain("1 hour");
      expect(message).not.toContain("hours");
    });

    it("should use singular form for 1 day", () => {
      const expiresIn = 1 * 24 * 60 * 60; // 1 day
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };

      const token = createMockToken(payload);
      const message = TokenValidationService.getExpirationMessage(token);

      expect(message).toContain("1 day");
      expect(message).not.toContain("days");
    });
  });

  describe("getStatusDisplayText", () => {
    it("should return display text for each status", () => {
      expect(TokenValidationService.getStatusDisplayText("VALID")).toBe(
        "Connected"
      );
      expect(
        TokenValidationService.getStatusDisplayText("EXPIRED_IN_GRACE")
      ).toBe("Limited Access");
      expect(
        TokenValidationService.getStatusDisplayText("EXPIRED_BEYOND_GRACE")
      ).toBe("Read-Only Mode");
      expect(TokenValidationService.getStatusDisplayText("INVALID")).toBe(
        "Not Authenticated"
      );
    });

    it("should handle unknown status", () => {
      expect(
        TokenValidationService.getStatusDisplayText("UNKNOWN" as TokenStatus)
      ).toBe("Unknown");
    });
  });

  describe("edge cases", () => {
    it("should handle token expiring in exactly 0 seconds", () => {
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now(), // Expires right now
        iat: now() - 3600,
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      // Should be treated as expired (not valid)
      expect(validation.status).not.toBe("VALID");
    });

    it("should handle token with very long expiration", () => {
      const expiresIn = 365 * 24 * 60 * 60; // 1 year
      const payload = {
        user_id: "123",
        username: "testuser",
        email: "test@example.com",
        exp: now() + expiresIn,
        iat: now(),
      };

      const token = createMockToken(payload);
      const validation = TokenValidationService.validateToken(token);

      expect(validation.status).toBe("VALID");
      expect(validation.daysUntilExpiry).toBeGreaterThan(364);
    });

    it("should handle base64url encoding (with - and _ chars)", () => {
      // JWT uses base64url encoding which replaces + with - and / with _
      const payload = {
        user_id: "123-with-dashes",
        username: "test_user",
        email: "test@example.com",
        exp: now() + 3600,
        iat: now(),
      };

      const token = createMockToken(payload);
      const decoded = TokenValidationService.decodeToken(token);

      expect(decoded).toEqual(payload);
    });
  });
});
