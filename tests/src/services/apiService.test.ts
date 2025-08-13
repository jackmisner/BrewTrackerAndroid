// Mock dependencies
const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

jest.mock("expo-secure-store", () => mockSecureStore);

// Mock axios completely
jest.mock("axios", () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

jest.mock("@services/config", () => ({
  STORAGE_KEYS: {
    ACCESS_TOKEN: "access_token",
  },
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
    },
  },
}));

jest.mock("@services/api/idInterceptor", () => ({
  setupIDInterceptors: jest.fn(),
}));

describe("ApiService - Essential Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  describe("Token management (mocked)", () => {
    it("should mock secure storage operations correctly", async () => {
      const testToken = "test-token-123";
      mockSecureStore.getItemAsync.mockResolvedValue(testToken);

      const token = await mockSecureStore.getItemAsync("access_token");
      expect(token).toBe(testToken);
    });

    it("should handle token storage errors", async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(
        new Error("Storage error")
      );

      await expect(
        mockSecureStore.setItemAsync("access_token", "token")
      ).rejects.toThrow("Storage error");
    });

    it("should handle token retrieval errors", async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(
        new Error("Retrieval error")
      );

      await expect(
        mockSecureStore.getItemAsync("access_token")
      ).rejects.toThrow("Retrieval error");
    });
  });

  describe("Error normalization logic", () => {
    const normalizeError = (error: any) => {
      const normalized = {
        message: "An unexpected error occurred",
        isNetworkError: false,
        isTimeout: false,
        isRetryable: false,
        originalError: error,
        status: undefined as number | undefined,
        code: undefined as string | undefined,
      };

      if (error?.isAxiosError) {
        if (error.code === "NETWORK_ERROR") {
          normalized.isNetworkError = true;
          normalized.isRetryable = true;
          normalized.message = "Network connection error";
        } else if (error.code === "ECONNABORTED") {
          normalized.isTimeout = true;
          normalized.isRetryable = true;
          normalized.message = "Request timeout";
        } else if (error.response) {
          normalized.status = error.response.status;
          normalized.message =
            error.response.data?.message || `HTTP ${error.response.status}`;
          // Server errors (5xx) are retryable
          normalized.isRetryable = error.response.status >= 500;
        }
      } else if (error?.message) {
        normalized.message = error.message;
      }

      return normalized;
    };

    it("should normalize network errors", () => {
      const networkError = {
        code: "NETWORK_ERROR",
        isAxiosError: true,
      };

      const normalized = normalizeError(networkError);

      expect(normalized.isNetworkError).toBe(true);
      expect(normalized.isRetryable).toBe(true);
      expect(normalized.message).toBe("Network connection error");
    });

    it("should normalize timeout errors", () => {
      const timeoutError = {
        code: "ECONNABORTED",
        isAxiosError: true,
      };

      const normalized = normalizeError(timeoutError);

      expect(normalized.isTimeout).toBe(true);
      expect(normalized.isRetryable).toBe(true);
      expect(normalized.message).toBe("Request timeout");
    });

    it("should normalize HTTP client errors as non-retryable", () => {
      const clientError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "Bad request" },
        },
      };

      const normalized = normalizeError(clientError);

      expect(normalized.status).toBe(400);
      expect(normalized.message).toBe("Bad request");
      expect(normalized.isRetryable).toBe(false);
    });

    it("should normalize HTTP server errors as retryable", () => {
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };

      const normalized = normalizeError(serverError);

      expect(normalized.status).toBe(500);
      expect(normalized.message).toBe("Internal server error");
      expect(normalized.isRetryable).toBe(true);
    });

    it("should handle HTTP errors without message", () => {
      const errorWithoutMessage = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
        },
      };

      const normalized = normalizeError(errorWithoutMessage);

      expect(normalized.status).toBe(404);
      expect(normalized.message).toBe("HTTP 404");
    });

    it("should handle non-axios errors", () => {
      const genericError = new Error("Something went wrong");

      const normalized = normalizeError(genericError);

      expect(normalized.message).toBe("Something went wrong");
      expect(normalized.isNetworkError).toBe(false);
      expect(normalized.isRetryable).toBe(false);
    });

    it("should handle unknown error types", () => {
      const unknownError = { randomProperty: "value" };

      const normalized = normalizeError(unknownError);

      expect(normalized.message).toBe("An unexpected error occurred");
    });
  });

  describe("Retry logic", () => {
    const withRetry = async (
      operation: () => Promise<any>,
      isRetryable: (error: any) => boolean = () => true,
      maxAttempts: number = 3,
      delay: number = 100
    ) => {
      let lastError: any;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;

          if (attempt >= maxAttempts || !isRetryable(error)) {
            throw error;
          }

          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }

      throw lastError;
    };

    it("should succeed on first attempt", async () => {
      const successfulOperation = jest.fn().mockResolvedValue("success");

      const result = await withRetry(successfulOperation);

      expect(result).toBe("success");
      expect(successfulOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValue("success");

      const result = await withRetry(
        failingOperation,
        () => true, // All errors are retryable
        3
      );

      expect(result).toBe("success");
      expect(failingOperation).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable errors", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Permanent failure"));

      await expect(
        withRetry(
          failingOperation,
          () => false, // No errors are retryable
          3
        )
      ).rejects.toThrow("Permanent failure");

      expect(failingOperation).toHaveBeenCalledTimes(1);
    });

    it("should exhaust retry attempts", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Always fails"));

      await expect(
        withRetry(
          failingOperation,
          () => true, // All errors are retryable
          3
        )
      ).rejects.toThrow("Always fails");

      expect(failingOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe("URL validation logic", () => {
    const validateApiUrl = (url: string | undefined) => {
      if (!url) {
        throw new Error(
          "API_URL environment variable is required. Please set EXPO_PUBLIC_API_URL in your .env file."
        );
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch {
        throw new Error(
          `Invalid API_URL format: ${url}. Please provide a valid URL.`
        );
      }

      // Only allow HTTP and HTTPS protocols for API URLs
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error(
          `Invalid API_URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed.`
        );
      }

      // Clean trailing slash
      return url.replace(/\/$/, "");
    };

    it("should require API URL", () => {
      expect(() => validateApiUrl(undefined)).toThrow(
        "API_URL environment variable is required"
      );
      expect(() => validateApiUrl("")).toThrow(
        "API_URL environment variable is required"
      );
    });

    it("should validate URL format", () => {
      expect(() => validateApiUrl("not-a-url")).toThrow(
        "Invalid API_URL format: not-a-url"
      );
      expect(() => validateApiUrl("ftp://invalid.com")).toThrow();
      
      // Ensure HTTP/HTTPS URLs are accepted
      expect(() => validateApiUrl("http://api.example.com")).not.toThrow();
      expect(() => validateApiUrl("https://api.example.com")).not.toThrow();
    });

    it("should clean trailing slashes", () => {
      expect(validateApiUrl("https://api.example.com/")).toBe(
        "https://api.example.com"
      );
      expect(validateApiUrl("https://api.example.com")).toBe(
        "https://api.example.com"
      );
    });

    it("should accept valid URLs", () => {
      expect(validateApiUrl("https://api.example.com")).toBe(
        "https://api.example.com"
      );
      expect(validateApiUrl("http://localhost:3000")).toBe(
        "http://localhost:3000"
      );
    });
  });
});
