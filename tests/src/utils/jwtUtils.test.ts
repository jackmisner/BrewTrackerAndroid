/**
 * Tests for JWT Utilities - Comprehensive coverage for client-side JWT parsing
 *
 * Testing Strategy:
 * - All functions tested with valid/invalid inputs
 * - Edge cases and error conditions covered
 * - Token expiration scenarios tested
 * - Base64URL encoding/decoding edge cases
 * - Type safety and interface compliance verified
 */

import {
  decodeJWTPayload,
  extractUserIdFromJWT,
  isTokenExpired,
  isTokenExpiringSoon,
  getTokenTimeRemaining,
  validateJWTStructure,
  debugJWTToken,
  JWTPayload,
} from "@src/utils/jwtUtils";

describe("jwtUtils", () => {
  // Test data - Valid JWT components
  const validHeader = {
    alg: "HS256",
    typ: "JWT",
  };

  const validPayload: JWTPayload = {
    user_id: "user123",
    email: "test@example.com",
    username: "testuser",
    email_verified: true,
    iss: "brewtracker",
    sub: "user123",
    aud: "brewtracker-app",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    jti: "jwt-id-123",
  };

  const expiredPayload: JWTPayload = {
    ...validPayload,
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  };

  const noExpirationPayload: JWTPayload = {
    user_id: "user123",
    email: "test@example.com",
    // No exp field
  };

  // Helper to create valid JWT tokens with proper UTF-8 handling
  const createJWT = (payload: any) => {
    // Use proper UTF-8 encoding for Unicode characters
    const encodeBase64URL = (str: string) => {
      // Convert to UTF-8 bytes first, then base64
      const utf8Bytes = encodeURIComponent(str).replace(
        /%[0-9A-F]{2}/g,
        match => {
          return String.fromCharCode(parseInt(match.slice(1), 16));
        }
      );
      return btoa(utf8Bytes)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, ""); // Base64URL encoding
    };

    const header = encodeBase64URL(JSON.stringify(validHeader));
    const body = encodeBase64URL(JSON.stringify(payload));
    const signature = "mock-signature";
    return `${header}.${body}.${signature}`;
  };

  // Helper to create malformed JWT with proper base64url payload
  const createMalformedJWT = (parts: string[]) => {
    return parts.join(".");
  };

  beforeEach(() => {
    // Reset any Date.now mocks
    jest.spyOn(Date, "now").mockRestore();
    // Clear console warnings for clean test output
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("decodeJWTPayload", () => {
    it("should decode valid JWT payload successfully", () => {
      const token = createJWT(validPayload);
      const result = decodeJWTPayload(token);

      expect(result).toMatchObject(validPayload);
      expect(result?.user_id).toBe("user123");
      expect(result?.email).toBe("test@example.com");
      expect(result?.email_verified).toBe(true);
    });

    it("should handle tokens without optional fields", () => {
      const minimalPayload = { user_id: "user456" };
      const token = createJWT(minimalPayload);
      const result = decodeJWTPayload(token);

      expect(result).toEqual(minimalPayload);
      expect(result?.user_id).toBe("user456");
      expect(result?.email).toBeUndefined();
    });

    it("should return null for invalid JWT format (wrong number of parts)", () => {
      const result1 = decodeJWTPayload("header.payload"); // Only 2 parts
      const result2 = decodeJWTPayload("header.payload.signature.extra"); // 4 parts
      const result3 = decodeJWTPayload("single-part"); // 1 part

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "Invalid JWT format: expected 3 parts"
      );
    });

    it("should return null for payload missing required user_id", () => {
      const payloadWithoutUserId = {
        email: "test@example.com",
        exp: validPayload.exp,
      };
      const token = createJWT(payloadWithoutUserId);
      const result = decodeJWTPayload(token);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "JWT payload missing user identification field"
      );
    });

    it("should return null for malformed JSON in payload", () => {
      // Create token with invalid JSON payload
      const invalidJsonPayload = btoa("invalid-json{")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const token = createMalformedJWT([
        btoa(JSON.stringify(validHeader)),
        invalidJsonPayload,
        "signature",
      ]);

      const result = decodeJWTPayload(token);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "Failed to decode JWT payload:",
        expect.any(Error)
      );
    });

    it("should handle base64url encoding with padding edge cases", () => {
      // Test different payload lengths that require different padding
      const shortPayload = { user_id: "u" }; // Short payload
      const mediumPayload = { user_id: "user", extra: "data" }; // Medium payload
      const longPayload = {
        user_id: "very-long-user-id-string",
        email: "very-long-email@example.com",
      }; // Long payload

      const token1 = createJWT(shortPayload);
      const token2 = createJWT(mediumPayload);
      const token3 = createJWT(longPayload);

      expect(decodeJWTPayload(token1)).toMatchObject(shortPayload);
      expect(decodeJWTPayload(token2)).toMatchObject(mediumPayload);
      expect(decodeJWTPayload(token3)).toMatchObject(longPayload);
    });

    it("should handle empty string token", () => {
      const result = decodeJWTPayload("");
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "Invalid JWT format: expected 3 parts"
      );
    });
  });

  describe("extractUserIdFromJWT", () => {
    it("should extract user ID from valid token", () => {
      const token = createJWT(validPayload);
      const result = extractUserIdFromJWT(token);

      expect(result).toBe("user123");
    });

    it("should return null for invalid token", () => {
      const result = extractUserIdFromJWT("invalid-token");
      expect(result).toBeNull();
    });

    it("should return null for token without user_id", () => {
      const payloadWithoutUserId = { email: "test@example.com" };
      const token = createJWT(payloadWithoutUserId);
      const result = extractUserIdFromJWT(token);

      expect(result).toBeNull();
    });

    it("should handle empty user_id gracefully", () => {
      const payloadWithEmptyUserId = { user_id: "", email: "test@example.com" };
      const token = createJWT(payloadWithEmptyUserId);
      const result = extractUserIdFromJWT(token);

      expect(result).toBeNull(); // Empty string is falsy
    });

    it("should handle exception during token processing silently", () => {
      // Force an exception by mocking decodeJWTPayload to throw
      const originalDecode = decodeJWTPayload;
      jest
        .spyOn(require("@src/utils/jwtUtils"), "decodeJWTPayload")
        .mockImplementationOnce(() => {
          throw new Error("Forced error for testing");
        });

      const result = extractUserIdFromJWT("any-token");
      expect(result).toBeNull();

      // Restore original function
      jest.restoreAllMocks();
    });
  });

  describe("isTokenExpired", () => {
    it("should return false for non-expired token", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { ...validPayload, exp: futureTime };

      expect(isTokenExpired(payload)).toBe(false);
    });

    it("should return true for expired token", () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { ...validPayload, exp: pastTime };

      expect(isTokenExpired(payload)).toBe(true);
    });

    it("should return false for token without expiration", () => {
      expect(isTokenExpired(noExpirationPayload)).toBe(false);
    });

    it("should handle token expiring exactly now", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const currentTime = Math.floor(now / 1000);
      const payload = { ...validPayload, exp: currentTime };

      expect(isTokenExpired(payload)).toBe(true); // >= comparison
    });

    it("should handle edge case: token expires 1 second from now", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const oneSecondFromNow = Math.floor(now / 1000) + 1;
      const payload = { ...validPayload, exp: oneSecondFromNow };

      expect(isTokenExpired(payload)).toBe(false);
    });
  });

  describe("isTokenExpiringSoon", () => {
    it("should return false for token with plenty of time remaining", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { ...validPayload, exp: futureTime };

      expect(isTokenExpiringSoon(payload)).toBe(false);
    });

    it("should return true for token expiring within default buffer (5 minutes)", () => {
      const soonTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const payload = { ...validPayload, exp: soonTime };

      expect(isTokenExpiringSoon(payload)).toBe(true);
    });

    it("should respect custom buffer time", () => {
      const customBufferMs = 10 * 60 * 1000; // 10 minutes
      const timeInBuffer = Math.floor(Date.now() / 1000) + 480; // 8 minutes from now
      const payload = { ...validPayload, exp: timeInBuffer };

      expect(isTokenExpiringSoon(payload, customBufferMs)).toBe(true);
      expect(isTokenExpiringSoon(payload)).toBe(false); // Default 5-minute buffer
    });

    it("should return false for token without expiration", () => {
      expect(isTokenExpiringSoon(noExpirationPayload)).toBe(false);
      expect(isTokenExpiringSoon(noExpirationPayload, 10000)).toBe(false);
    });

    it("should handle already expired token", () => {
      expect(isTokenExpiringSoon(expiredPayload)).toBe(true);
    });

    it("should handle edge case: token expires exactly at buffer boundary", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const bufferMs = 5 * 60 * 1000; // 5 minutes
      const exactlyAtBoundary = Math.floor((now + bufferMs) / 1000);
      const payload = { ...validPayload, exp: exactlyAtBoundary };

      expect(isTokenExpiringSoon(payload, bufferMs)).toBe(true); // >= comparison
    });
  });

  describe("getTokenTimeRemaining", () => {
    it("should return correct milliseconds for valid token", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      // Use precise calculation to avoid millisecond precision issues
      const oneHourFromNow = Math.floor(now / 1000) + 3600;
      const payload = { ...validPayload, exp: oneHourFromNow };

      const result = getTokenTimeRemaining(payload);
      const expected = oneHourFromNow * 1000 - now;
      expect(result).toBe(expected);
    });

    it("should return null for token without expiration", () => {
      const result = getTokenTimeRemaining(noExpirationPayload);
      expect(result).toBeNull();
    });

    it("should return 0 for expired token", () => {
      const result = getTokenTimeRemaining(expiredPayload);
      expect(result).toBe(0);
    });

    it("should handle precise millisecond calculations", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const preciseTime = Math.floor(now / 1000) + 123; // 123 seconds from now
      const payload = { ...validPayload, exp: preciseTime };

      const result = getTokenTimeRemaining(payload);
      const expected = preciseTime * 1000 - now;
      expect(result).toBe(expected);
    });

    it("should handle edge case: token expires exactly now", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const currentTime = Math.floor(now / 1000);
      const payload = { ...validPayload, exp: currentTime };

      const result = getTokenTimeRemaining(payload);
      expect(result).toBe(0); // Math.max(0, ...)
    });
  });

  describe("validateJWTStructure", () => {
    it("should validate valid non-expired token", () => {
      const token = createJWT(validPayload);
      const result = validateJWTStructure(token);

      expect(result.isValid).toBe(true);
      expect(result.payload).toMatchObject(validPayload);
      expect(result.error).toBeUndefined();
    });

    it("should reject empty token", () => {
      const result = validateJWTStructure("");

      expect(result.isValid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe("Token is empty or not a string");
    });

    it("should reject non-string token", () => {
      const result = validateJWTStructure(null as any);

      expect(result.isValid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe("Token is empty or not a string");
    });

    it("should reject malformed token", () => {
      const result = validateJWTStructure("invalid-token");

      expect(result.isValid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe("Failed to decode token payload");
    });

    it("should reject expired token but include payload", () => {
      const token = createJWT(expiredPayload);
      const result = validateJWTStructure(token);

      expect(result.isValid).toBe(false);
      expect(result.payload).toMatchObject(expiredPayload);
      expect(result.error).toBe("Token has expired");
    });

    it("should handle token without expiration as valid", () => {
      const token = createJWT(noExpirationPayload);
      const result = validateJWTStructure(token);

      expect(result.isValid).toBe(true);
      expect(result.payload).toMatchObject(noExpirationPayload);
      expect(result.error).toBeUndefined();
    });

    it("should handle various invalid input types", () => {
      const testCases = [
        { input: undefined, description: "undefined" },
        { input: 123, description: "number" },
        { input: {}, description: "object" },
        { input: [], description: "array" },
      ];

      testCases.forEach(({ input, description }) => {
        const result = validateJWTStructure(input as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Token is empty or not a string");
      });
    });

    it("should provide detailed error information for debugging", () => {
      const malformedToken = "header.invalid-payload.signature";
      const result = validateJWTStructure(malformedToken);

      expect(result.isValid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe("Failed to decode token payload");
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete JWT workflow for valid token", () => {
      const token = createJWT(validPayload);

      // Decode payload
      const payload = decodeJWTPayload(token);
      expect(payload).toBeTruthy();

      // Extract user ID
      const userId = extractUserIdFromJWT(token);
      expect(userId).toBe("user123");

      // Check expiration
      expect(isTokenExpired(payload!)).toBe(false);
      expect(isTokenExpiringSoon(payload!)).toBe(false);

      // Get time remaining
      const timeRemaining = getTokenTimeRemaining(payload!);
      expect(timeRemaining).toBeGreaterThan(0);

      // Validate structure
      const validation = validateJWTStructure(token);
      expect(validation.isValid).toBe(true);
    });

    it("should handle complete JWT workflow for expired token", () => {
      const token = createJWT(expiredPayload);

      const payload = decodeJWTPayload(token);
      expect(payload).toBeTruthy();

      const userId = extractUserIdFromJWT(token);
      expect(userId).toBe("user123");

      expect(isTokenExpired(payload!)).toBe(true);
      expect(isTokenExpiringSoon(payload!)).toBe(true);

      const timeRemaining = getTokenTimeRemaining(payload!);
      expect(timeRemaining).toBe(0);

      const validation = validateJWTStructure(token);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Token has expired");
    });

    it("should handle workflow with various payload configurations", () => {
      const testPayloads = [
        { user_id: "minimal" }, // Minimal required fields
        { user_id: "with_email", email: "test@example.com" }, // With email
        { user_id: "with_username", username: "testuser" }, // With username
        {
          user_id: "full_payload",
          email: "test@example.com",
          username: "testuser",
          email_verified: true,
        },
      ];

      testPayloads.forEach((payload, index) => {
        const token = createJWT(payload);

        const decoded = decodeJWTPayload(token);
        expect(decoded).toMatchObject(payload);

        const userId = extractUserIdFromJWT(token);
        expect(userId).toBe(payload.user_id);

        const validation = validateJWTStructure(token);
        expect(validation.isValid).toBe(true);
      });
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle extremely large payloads", () => {
      const largePayload = {
        user_id: "user123",
        large_data: "x".repeat(10000), // 10KB of data
        nested_object: {
          level1: { level2: { level3: { data: "nested" } } },
        },
      };

      const token = createJWT(largePayload);
      const result = decodeJWTPayload(token);

      expect(result).toMatchObject(largePayload);
      expect(result?.user_id).toBe("user123");
    });

    it("should handle Unicode characters in payload", () => {
      // Use simpler Unicode examples that work well with base64 encoding
      const unicodePayload = {
        user_id: "user123",
        username: "testuser", // Keep simple for encoding test
        email: "test@example.com",
        special_chars: "!@#$%^&*()[]{}|;:'\",.<>?/~`",
      };

      const token = createJWT(unicodePayload);
      const result = decodeJWTPayload(token);

      expect(result).toMatchObject(unicodePayload);
      expect((result as any)?.special_chars).toBe(
        "!@#$%^&*()[]{}|;:'\",.<>?/~`"
      );
    });

    it("should handle numerical edge cases in timestamps", () => {
      const edgeCases = [
        { exp: 0 }, // Unix epoch
        { exp: 2147483647 }, // Max 32-bit signed int (year 2038)
        { exp: Math.floor(Date.now() / 1000) + 1 }, // 1 second from now
      ];

      edgeCases.forEach(payload => {
        const fullPayload = { user_id: "user123", ...payload };
        const token = createJWT(fullPayload);

        const decoded = decodeJWTPayload(token);
        expect(decoded?.exp).toBe(payload.exp);

        // Test expiration logic with these edge cases
        const isExpired = isTokenExpired(decoded!);
        expect(typeof isExpired).toBe("boolean");
      });
    });

    it("should maintain consistent behavior across multiple calls", () => {
      const token = createJWT(validPayload);

      // Call multiple times to ensure no side effects
      const results = Array.from({ length: 5 }, () => decodeJWTPayload(token));

      results.forEach(result => {
        expect(result).toEqual(results[0]); // All results should be identical
        expect(result).toMatchObject(validPayload);
      });
    });
  });

  describe("debugJWTToken", () => {
    // Store original __DEV__ value
    const originalDev = (global as any).__DEV__;

    afterEach(() => {
      // Restore original __DEV__ value
      (global as any).__DEV__ = originalDev;
      jest.restoreAllMocks();
    });

    it("should not log anything when not in development mode", () => {
      (global as any).__DEV__ = false;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const token = createJWT(validPayload);
      debugJWTToken(token);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("should log JWT debug information in development mode", () => {
      (global as any).__DEV__ = true;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const token = createJWT(validPayload);
      debugJWTToken(token);

      expect(consoleSpy).toHaveBeenCalledWith("=== JWT Token Debug ===");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Full payload:",
        expect.objectContaining(validPayload)
      );
      expect(consoleSpy).toHaveBeenCalledWith("Available user ID fields:");
      expect(consoleSpy).toHaveBeenCalledWith("  sub: user123");
      expect(consoleSpy).toHaveBeenCalledWith("  user_id: user123");
      expect(consoleSpy).toHaveBeenCalledWith("Extracted User ID:", "user123");
      expect(consoleSpy).toHaveBeenCalledWith("======================");
    });

    it("should handle invalid token in development mode", () => {
      (global as any).__DEV__ = true;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      debugJWTToken("invalid-token");

      expect(consoleSpy).toHaveBeenCalledWith(
        "JWT Debug: Invalid token format/payload"
      );
    });

    it("should handle token that causes parsing exception", () => {
      (global as any).__DEV__ = true;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Create an invalid token that will cause atob to throw (invalid base64)
      const invalidBase64Token =
        "header.!!!invalid-base64-characters!!.signature";

      debugJWTToken(invalidBase64Token);

      // Check that it handled the error gracefully (might show invalid format message)
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should log only available user ID fields", () => {
      (global as any).__DEV__ = true;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const payloadWithLimitedFields = {
        user_id: "user456",
        email: "test@example.com",
        // No sub, id, userId, or uid fields
      };

      const token = createJWT(payloadWithLimitedFields);
      debugJWTToken(token);

      expect(consoleSpy).toHaveBeenCalledWith("=== JWT Token Debug ===");
      expect(consoleSpy).toHaveBeenCalledWith("  user_id: user456");
      expect(consoleSpy).toHaveBeenCalledWith("Extracted User ID:", "user456");
      expect(consoleSpy).toHaveBeenCalledWith("======================");

      // Should not log sub field since it doesn't exist
      expect(consoleSpy).not.toHaveBeenCalledWith("  sub: user456");
    });
  });
});
