/**
 * Tests for PII Redaction Utility
 */

import {
  redactSensitiveData,
  redactLogEntry,
  redactLogs,
  getDebugDataWarning,
} from "@utils/redactPII";

describe("redactSensitiveData", () => {
  describe("Primitive values", () => {
    it("should redact sensitive string fields with preview", () => {
      const data = {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        apiKey: "sk_live_1234567890abcdef",
        email: "user@example.com",
      };

      const redacted = redactSensitiveData(data);

      expect(redacted.token).toContain("[REDACTED]");
      expect(redacted.token).toContain("eyJh...VCJ9"); // Preview
      expect(redacted.apiKey).toContain("[REDACTED]");
      expect(redacted.email).toContain("[REDACTED]");
    });

    it("should completely redact short sensitive strings", () => {
      const data = { password: "pass123" };
      const redacted = redactSensitiveData(data);
      expect(redacted.password).toBe("[REDACTED]");
    });

    it("should truncate long non-sensitive strings", () => {
      const longString = "a".repeat(300);
      const data = { description: longString };
      const redacted = redactSensitiveData(data);

      expect(redacted.description).toContain("truncated");
      expect(redacted.description.length).toBeLessThan(longString.length);
    });

    it("should preserve short non-sensitive strings", () => {
      const data = { name: "My Recipe", style: "IPA" };
      const redacted = redactSensitiveData(data);

      expect(redacted.name).toBe("My Recipe");
      expect(redacted.style).toBe("IPA");
    });

    it("should preserve numbers and booleans for non-sensitive fields", () => {
      const data = { abv: 5.5, ibu: 40, isPublic: true };
      const redacted = redactSensitiveData(data);

      expect(redacted.abv).toBe(5.5);
      expect(redacted.ibu).toBe(40);
      expect(redacted.isPublic).toBe(true);
    });

    it("should redact numbers in sensitive fields", () => {
      const data = { userId: 12345, sessionId: 98765 };
      const redacted = redactSensitiveData(data);

      expect(redacted.userId).toBe("[REDACTED]");
      expect(redacted.sessionId).toBe("[REDACTED]");
    });
  });

  describe("Arrays", () => {
    it("should redact items in arrays", () => {
      const data = {
        tokens: [
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
          "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ",
        ],
      };

      const redacted = redactSensitiveData(data);

      expect(Array.isArray(redacted.tokens)).toBe(true);
      expect(redacted.tokens[0]).toContain("[REDACTED]");
      expect(redacted.tokens[1]).toContain("[REDACTED]");
    });

    it("should truncate long arrays", () => {
      const data = {
        items: Array(20).fill("item"),
      };

      const redacted = redactSensitiveData(data);

      expect(redacted.items.length).toBe(11); // 10 items + truncation message
      expect(redacted.items[10]).toContain("more items truncated");
    });

    it("should preserve short arrays", () => {
      const data = {
        ingredients: ["Pale Malt", "Cascade Hops", "US-05"],
      };

      const redacted = redactSensitiveData(data);

      expect(redacted.ingredients).toEqual([
        "Pale Malt",
        "Cascade Hops",
        "US-05",
      ]);
    });
  });

  describe("Nested objects", () => {
    it("should recursively redact nested sensitive data", () => {
      const data = {
        userData: {
          name: "John Doe",
          email: "john@example.com",
          auth: {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            session: "abc123def456",
          },
        },
      };

      const redacted = redactSensitiveData(data);

      // Note: "user" key as exact match gets redacted entirely
      // Using "userData" instead to test nested redaction
      expect(redacted.userData.name).toBe("John Doe");
      expect(redacted.userData.email).toContain("[REDACTED]");
      expect(redacted.userData.auth.token).toContain("[REDACTED]");
      expect(redacted.userData.auth.session).toContain("[REDACTED]");
    });

    it("should prevent infinite recursion", () => {
      const circular: any = { name: "Test" };
      circular.self = circular;

      // Should not throw, should handle gracefully
      expect(() => redactSensitiveData(circular)).not.toThrow();
    });
  });

  describe("Special cases", () => {
    it("should preserve recipe author usernames in recipe context", () => {
      const data = {
        recipe: {
          name: "My IPA",
          username: "brewmaster123",
          email: "brewmaster@example.com",
        },
      };

      const redacted = redactSensitiveData(data);

      expect(redacted.recipe.username).toBe("brewmaster123");
      expect(redacted.recipe.email).toContain("[REDACTED]");
    });

    it("should redact entire user profile objects", () => {
      const data = {
        user: {
          id: 123,
          name: "John Doe",
          email: "john@example.com",
          profile: { bio: "I love brewing" },
        },
      };

      const redacted = redactSensitiveData(data);

      expect(redacted.user).toBe("[REDACTED]");
    });

    it("should handle null and undefined", () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: "",
      };

      const redacted = redactSensitiveData(data);

      expect(redacted.nullValue).toBeNull();
      expect(redacted.undefinedValue).toBeUndefined();
      expect(redacted.emptyString).toBe("");
    });
  });

  describe("Sensitive field patterns", () => {
    it("should redact common authentication fields", () => {
      const data = {
        token: "abc",
        jwt: "def",
        authToken: "ghi",
        sessionId: "jkl",
        apiKey: "mno",
        api_key: "pqr",
        secret: "stu",
        password: "vwx",
        credential: "yz",
      };

      const redacted = redactSensitiveData(data);

      Object.values(redacted).forEach(value => {
        expect(value).toBe("[REDACTED]");
      });
    });

    it("should redact personal information fields", () => {
      const data = {
        email: "user@example.com",
        e_mail: "user@example.com",
        phone: "555-1234",
        address: "123 Main St",
      };

      const redacted = redactSensitiveData(data);

      Object.values(redacted).forEach(value => {
        expect(value).toContain("[REDACTED]");
      });
    });

    it("should handle case-insensitive patterns", () => {
      const data = {
        TOKEN: "abc",
        Email: "user@example.com",
        ApiKey: "xyz",
      };

      const redacted = redactSensitiveData(data);

      expect(redacted.TOKEN).toBe("[REDACTED]");
      expect(redacted.Email).toContain("[REDACTED]");
      expect(redacted.ApiKey).toBe("[REDACTED]");
    });
  });
});

describe("redactLogEntry", () => {
  it("should redact tokens in log entries", () => {
    const log =
      "User logged in with token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const redacted = redactLogEntry(log);

    expect(redacted).toContain("token=[REDACTED]");
    expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });

  it("should redact email addresses", () => {
    const log = "User registered: email=user@example.com";
    const redacted = redactLogEntry(log);

    expect(redacted).toContain("email=[REDACTED]");
    expect(redacted).not.toContain("user@example.com");
  });

  it("should redact email addresses anywhere in logs", () => {
    const log = "Error sending notification to user@example.com failed";
    const redacted = redactLogEntry(log);

    expect(redacted).toContain("[REDACTED]@example.com");
    expect(redacted).not.toContain("user@example.com");
  });

  it("should redact passwords and secrets", () => {
    const log = 'Authentication failed: password="secret123"';
    const redacted = redactLogEntry(log);

    expect(redacted).toContain("password=[REDACTED]");
    expect(redacted).not.toContain("secret123");
  });

  it("should handle multiple sensitive patterns in one log", () => {
    const log =
      "Login attempt: email=user@example.com, token=abc123, password=secret";
    const redacted = redactLogEntry(log);

    expect(redacted).toContain("email=[REDACTED]");
    expect(redacted).toContain("token=[REDACTED]");
    expect(redacted).toContain("password=[REDACTED]");
    expect(redacted).not.toContain("user@example.com");
    expect(redacted).not.toContain("abc123");
    expect(redacted).not.toContain("secret");
  });

  it("should preserve non-sensitive information", () => {
    const log = "Recipe 'My IPA' created successfully with ABV=6.5%";
    const redacted = redactLogEntry(log);

    expect(redacted).toBe(log); // Should be unchanged
  });

  it("should handle different log formats", () => {
    const logWithColon = "jwt:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const logWithEquals = "apiKey=sk_live_1234567890";
    const logWithQuotes = 'token="abc123def456"';

    expect(redactLogEntry(logWithColon)).toContain("jwt:[REDACTED]");
    expect(redactLogEntry(logWithEquals)).toContain("apiKey=[REDACTED]");
    expect(redactLogEntry(logWithQuotes)).toContain("token=[REDACTED]");
  });
});

describe("redactLogs", () => {
  it("should redact multiple log entries", () => {
    const logs = [
      "User logged in with token=abc123",
      "Email sent to user@example.com",
      "Recipe created successfully",
    ];

    const redacted = redactLogs(logs);

    expect(redacted).toHaveLength(3);
    expect(redacted[0]).toContain("token=[REDACTED]");
    // Email addresses are redacted to [REDACTED]@example.com
    expect(redacted[1]).toContain("[REDACTED]@example.com");
    expect(redacted[2]).toBe("Recipe created successfully");
  });

  it("should handle empty log array", () => {
    const logs: string[] = [];
    const redacted = redactLogs(logs);

    expect(redacted).toEqual([]);
  });

  it("should handle logs with no sensitive data", () => {
    const logs = [
      "Application started",
      "Recipe loaded",
      "Calculation completed",
    ];

    const redacted = redactLogs(logs);

    expect(redacted).toEqual(logs);
  });
});

describe("getDebugDataWarning", () => {
  it("should return a warning banner with key information", () => {
    const warning = getDebugDataWarning();

    expect(warning).toContain("DEBUG DATA");
    expect(warning).toContain("SENSITIVE INFO REDACTED");
    expect(warning).toContain("Authentication tokens");
    expect(warning).toContain("Email addresses");
    expect(warning).toContain("DO NOT SHARE PUBLICLY");
  });

  it("should be a non-empty string", () => {
    const warning = getDebugDataWarning();

    expect(typeof warning).toBe("string");
    expect(warning.length).toBeGreaterThan(0);
  });

  it("should mention recipe author preservation", () => {
    const warning = getDebugDataWarning();

    expect(warning).toContain("Recipe author names preserved");
  });
});

describe("Integration tests", () => {
  it("should handle realistic offline data structure", () => {
    const offlineData = {
      offline_v2_recipes: [
        {
          id: "recipe-123",
          name: "West Coast IPA",
          username: "brewmaster",
          lastModified: 1234567890,
          syncStatus: "synced",
          data: {
            ingredients: ["Pale Malt", "Cascade"],
            abv: 6.5,
          },
        },
      ],
      offline_v2_pending_operations: [
        {
          id: "op-456",
          type: "update",
          entityType: "recipe",
          tempId: "temp-789",
          status: "pending",
          retryCount: 0,
        },
      ],
      userData: {
        user: {
          id: 123,
          email: "user@example.com",
          profile: { name: "John Doe" },
        },
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      },
    };

    const redacted = redactSensitiveData(offlineData);

    // Should preserve recipe data
    expect(redacted.offline_v2_recipes[0].name).toBe("West Coast IPA");
    expect(redacted.offline_v2_recipes[0].username).toBe("brewmaster");
    expect(redacted.offline_v2_recipes[0].data.abv).toBe(6.5);

    // Should preserve operation metadata
    expect(redacted.offline_v2_pending_operations[0].type).toBe("update");
    expect(redacted.offline_v2_pending_operations[0].status).toBe("pending");

    // Should redact user PII
    expect(redacted.userData.user).toBe("[REDACTED]");
    expect(redacted.userData.token).toContain("[REDACTED]");
  });

  it("should handle realistic log entries", () => {
    const logs = [
      "[INFO] Application started",
      "[DEBUG] User authenticated with token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "[INFO] Recipe 'My IPA' created by brewmaster",
      "[ERROR] Failed to send email to user@example.com: network error",
      "[DEBUG] Cache hit for ingredients (5.2ms)",
    ];

    const redacted = redactLogs(logs);

    // Should preserve general logs
    expect(redacted[0]).toBe("[INFO] Application started");
    expect(redacted[2]).toContain("Recipe 'My IPA' created");

    // Should redact sensitive data
    expect(redacted[1]).toContain("token=[REDACTED]");
    expect(redacted[1]).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(redacted[3]).toContain("[REDACTED]@example.com");
    expect(redacted[3]).not.toContain("user@example.com");

    // Should preserve performance logs
    expect(redacted[4]).toContain("5.2ms");
  });
});
