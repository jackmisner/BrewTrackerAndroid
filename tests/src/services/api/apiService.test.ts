/**
 * Comprehensive ApiService Tests - Real Implementation + Essential Logic Tests
 */

// CRITICAL: Set environment variable BEFORE any imports
process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

import { AxiosError, AxiosInstance } from "axios";

// Mock external dependencies BEFORE any imports that might use them
jest.mock("expo-secure-store");
jest.mock("@services/api/idInterceptor", () => ({
  setupIDInterceptors: jest.fn(),
}));

// Mock config with real values
jest.mock("@services/config", () => ({
  STORAGE_KEYS: {
    ACCESS_TOKEN: "access_token",
  },
  ENDPOINTS: {
    AUTH: {
      REGISTER: "/auth/register",
      LOGIN: "/auth/login",
      GOOGLE_AUTH: "/auth/google",
      PROFILE: "/auth/profile",
      VALIDATE_USERNAME: "/auth/validate-username",
      VERIFY_EMAIL: "/auth/verify-email",
      RESEND_VERIFICATION: "/auth/resend-verification",
    },
    USER: {
      SETTINGS: "/user/settings",
      PROFILE: "/user/profile",
      CHANGE_PASSWORD: "/user/change-password",
      DELETE_ACCOUNT: "/user/delete-account",
    },
    RECIPES: {
      LIST: "/recipes",
      CREATE: "/recipes",
      DETAIL: (id: string) => `/recipes/${id}`,
      UPDATE: (id: string) => `/recipes/${id}`,
      DELETE: (id: string) => `/recipes/${id}`,
      METRICS: (id: string) => `/recipes/${id}/metrics`,
      CALCULATE_PREVIEW: "/recipes/calculate-preview",
      CLONE: (id: string) => `/recipes/${id}/clone`,
      CLONE_PUBLIC: (id: string) => `/recipes/${id}/clone-public`,
      VERSIONS: (id: string) => `/recipes/${id}/versions`,
      PUBLIC: "/recipes/public",
    },
    BREW_SESSIONS: {
      LIST: "/brew-sessions",
      CREATE: "/brew-sessions",
      DETAIL: (id: string) => `/brew-sessions/${id}`,
      UPDATE: (id: string) => `/brew-sessions/${id}`,
      DELETE: (id: string) => `/brew-sessions/${id}`,
      FERMENTATION: (id: string) => `/brew-sessions/${id}/fermentation`,
      FERMENTATION_ENTRY: (id: string, index: number) =>
        `/brew-sessions/${id}/fermentation/${index}`,
      FERMENTATION_STATS: (id: string) =>
        `/brew-sessions/${id}/fermentation/stats`,
      ANALYZE_COMPLETION: (id: string) =>
        `/brew-sessions/${id}/analyze-completion`,
    },
    BEER_STYLES: {
      LIST: "/beer-styles",
      DETAIL: (id: string) => `/beer-styles/${id}`,
      SEARCH: "/beer-styles/search",
    },
    INGREDIENTS: {
      LIST: "/ingredients",
      CREATE: "/ingredients",
      DETAIL: (id: string) => `/ingredients/${id}`,
      UPDATE: (id: string) => `/ingredients/${id}`,
      DELETE: (id: string) => `/ingredients/${id}`,
      RECIPES: (id: string) => `/ingredients/${id}/recipes`,
    },
    DASHBOARD: {
      DATA: "/dashboard",
    },
  },
}));

// Create mock axios instance
const mockAxiosInstance: Partial<AxiosInstance> = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn((onFulfilled, onRejected) => 0),
      eject: jest.fn(),
      clear: jest.fn(),
    },
    response: {
      use: jest.fn((onFulfilled, onRejected) => 0),
      eject: jest.fn(),
      clear: jest.fn(),
    },
  },
} as any;

jest.mock("axios", () => ({
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn(error => error?.isAxiosError === true),
}));

describe("ApiService", () => {
  let ApiService: any;
  let mockSecureStore: any;

  // Test-scoped variables for interceptors to avoid cross-test interference
  let testRequestInterceptor: any;
  let testResponseInterceptor: any;

  beforeAll(async () => {
    // Force set environment variable for testing
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:5000/api";
    process.env.EXPO_PUBLIC_DEBUG_MODE = "false";

    // Import expo-secure-store mock
    const SecureStore = await import("expo-secure-store");
    mockSecureStore = SecureStore as any;

    // Now dynamically import ApiService after environment is set up
    const apiServiceModule = await import("@services/api/apiService");
    ApiService = apiServiceModule.default;

    // Capture the interceptor functions that were registered during module import
    const requestUse = mockAxiosInstance.interceptors?.request
      ?.use as jest.Mock;
    const responseUse = mockAxiosInstance.interceptors?.response
      ?.use as jest.Mock;

    // Store interceptor functions in test-scoped variables
    testRequestInterceptor = requestUse.mock.calls[0]?.[0]; // onFulfilled
    testResponseInterceptor = {
      onFulfilled: responseUse.mock.calls[0]?.[0],
      onRejected: responseUse.mock.calls[0]?.[1],
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset SecureStore mocks
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    // Reset axios instance mocks
    (mockAxiosInstance.get as jest.Mock).mockReset();
    (mockAxiosInstance.post as jest.Mock).mockReset();
    (mockAxiosInstance.put as jest.Mock).mockReset();
    (mockAxiosInstance.delete as jest.Mock).mockReset();
  });

  describe("Token Management", () => {
    it("should get token from secure storage", async () => {
      const testToken = "test-jwt-token";
      mockSecureStore.getItemAsync.mockResolvedValue(testToken);

      const token = await ApiService.token.getToken();

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith("access_token");
      expect(token).toBe(testToken);
    });

    it("should handle error when getting token", async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(
        new Error("SecureStore error")
      );

      const token = await ApiService.token.getToken();

      expect(token).toBeNull();
    });

    it("should set token in secure storage", async () => {
      const testToken = "new-jwt-token";

      await ApiService.token.setToken(testToken);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "access_token",
        testToken
      );
    });

    it("should handle error when setting token", async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(
        new Error("Storage failed")
      );

      await expect(ApiService.token.setToken("token")).rejects.toThrow(
        "Storage failed"
      );
    });

    it("should remove token from secure storage", async () => {
      await ApiService.token.removeToken();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "access_token"
      );
    });

    it("should handle error when removing token", async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(
        new Error("Delete failed")
      );

      // Should not throw, just log error
      await expect(ApiService.token.removeToken()).resolves.toBeUndefined();
    });
  });

  describe("Authentication Endpoints", () => {
    it("should call login endpoint with credentials", async () => {
      const credentials = {
        email: "test@example.com",
        password: "password123",
      };
      const mockResponse = {
        data: {
          user: { id: "1", email: "test@example.com" },
          token: "jwt-token",
        },
      };
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.auth.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/auth/login",
        credentials
      );
      expect(result.data.token).toBe("jwt-token");
    });

    it("should call register endpoint with user data", async () => {
      const userData = {
        email: "new@example.com",
        username: "newuser",
        password: "password123",
      };
      const mockResponse = {
        data: {
          user: { id: "1", ...userData },
          token: "jwt-token",
        },
      };
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.auth.register(userData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/auth/register",
        userData
      );
      expect(result.data.user.email).toBe(userData.email);
    });

    it("should get user profile", async () => {
      const mockResponse = {
        data: {
          user: { id: "1", email: "test@example.com" },
        },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.auth.getProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/auth/profile");
      expect(result.data.user.email).toBe("test@example.com");
    });

    it("should validate username", async () => {
      const data = { username: "testuser" };
      const mockResponse = {
        data: { available: true },
      };
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.auth.validateUsername(data);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/auth/validate-username",
        data
      );
      expect(result.data.available).toBe(true);
    });
  });

  describe("Recipe Endpoints", () => {
    it("should fetch all recipes with pagination", async () => {
      const mockResponse = {
        data: {
          recipes: [{ id: "1", name: "Test Recipe" }],
          pagination: { page: 1, total: 1 },
        },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.recipes.getAll(1, 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/recipes?page=1&per_page=10"
      );
      expect(result.data.recipes).toHaveLength(1);
    });

    it("should fetch recipe by ID", async () => {
      const mockResponse = {
        data: { id: "1", name: "Test Recipe" },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.recipes.getById("1");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/recipes/1");
      expect(result.data.name).toBe("Test Recipe");
    });

    it("should create new recipe", async () => {
      const recipeData = { name: "New Recipe", style: "IPA" };
      const mockResponse = {
        data: { id: "1", ...recipeData },
      };
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.recipes.create(recipeData as any);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/recipes",
        recipeData
      );
      expect(result.data.name).toBe("New Recipe");
    });

    it("should update recipe", async () => {
      const recipeData = { name: "Updated Recipe" };
      const mockResponse = {
        data: { id: "1", ...recipeData },
      };
      (mockAxiosInstance.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.recipes.update("1", recipeData as any);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        "/recipes/1",
        recipeData
      );
      expect(result.data.name).toBe("Updated Recipe");
    });

    it("should delete recipe", async () => {
      const mockResponse = {
        data: { message: "Recipe deleted" },
      };
      (mockAxiosInstance.delete as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.recipes.delete("1");

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/recipes/1");
      expect(result.data.message).toBe("Recipe deleted");
    });

    it("should search recipes", async () => {
      const mockResponse = {
        data: {
          recipes: [{ id: "1", name: "IPA Recipe" }],
        },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.recipes.search("IPA", 1, 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/search/recipes?q=IPA&page=1&per_page=10"
      );
      expect(result.data.recipes[0].name).toBe("IPA Recipe");
    });

    it("should fetch public recipes with filters", async () => {
      const mockResponse = {
        data: {
          recipes: [{ id: "1", name: "Public IPA", isPublic: true }],
        },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const filters = { style: "IPA", search: "cascade" };
      const result = await ApiService.recipes.getPublic(1, 10, filters);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/recipes/public?page=1&per_page=10&style=IPA&search=cascade"
      );
      expect(result.data.recipes[0].name).toBe("Public IPA");
    });
  });

  describe("Brew Session Endpoints", () => {
    it("should fetch all brew sessions", async () => {
      const mockResponse = {
        data: {
          sessions: [{ id: "1", name: "Test Session" }],
        },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.brewSessions.getAll();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/brew-sessions?page=1&per_page=10"
      );
      expect(result.data.sessions).toHaveLength(1);
    });

    it("should create brew session", async () => {
      const sessionData = { recipe_id: "1", name: "New Session" };
      const mockResponse = {
        data: { id: "1", ...sessionData },
      };
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.brewSessions.create(sessionData as any);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/brew-sessions",
        sessionData
      );
      expect(result.data.name).toBe("New Session");
    });

    it("should add fermentation entry", async () => {
      const entryData = { temperature: 68, gravity: 1.05 };
      const mockResponse = {
        data: { ...entryData, timestamp: "2024-01-01T00:00:00Z" },
      };
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.brewSessions.addFermentationEntry(
        "session1",
        entryData as any
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/brew-sessions/session1/fermentation",
        entryData
      );
      expect(result.data.temperature).toBe(68);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", () => {
      const networkError = {
        isAxiosError: true,
        code: "NETWORK_ERROR",
        message: "Network Error",
      };

      const normalizedError = ApiService.handleApiError(networkError);

      expect(normalizedError.isNetworkError).toBe(true);
      expect(normalizedError.isRetryable).toBe(true);
      expect(normalizedError.message).toContain("Network error");
    });

    it("should handle timeout errors", () => {
      const timeoutError = {
        isAxiosError: true,
        code: "ECONNABORTED",
        message: "timeout of 15000ms exceeded",
      };

      const normalizedError = ApiService.handleApiError(timeoutError);

      expect(normalizedError.isTimeout).toBe(true);
      expect(normalizedError.isRetryable).toBe(true);
      expect(normalizedError.message).toContain("timed out");
    });

    it("should handle 401 authentication errors", () => {
      const authError: Partial<AxiosError> = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: "Invalid token" },
        } as any,
      };

      const normalizedError = ApiService.handleApiError(authError);

      expect(normalizedError.status).toBe(401);
      expect(normalizedError.message).toContain("Invalid token");
      expect(normalizedError.isRetryable).toBe(false);
    });

    it("should handle 500 server errors as retryable", () => {
      const serverError: Partial<AxiosError> = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { error: "Internal server error" },
        } as any,
      };

      const normalizedError = ApiService.handleApiError(serverError);

      expect(normalizedError.status).toBe(500);
      expect(normalizedError.isRetryable).toBe(true);
      expect(normalizedError.message).toContain("Internal server error");
    });

    it("should handle generic errors", () => {
      const genericError = new Error("Something went wrong");

      const normalizedError = ApiService.handleApiError(genericError);

      expect(normalizedError.message).toBe("Something went wrong");
      expect(normalizedError.isNetworkError).toBe(false);
      expect(normalizedError.isRetryable).toBe(false);
    });
  });

  describe("Ingredients Endpoints", () => {
    it("should fetch ingredients with filters", async () => {
      const mockResponse = {
        data: {
          ingredients: [{ id: "1", name: "Pale Malt", type: "grain" }],
          unit_system: "metric",
        },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.ingredients.getAll("grain", "pale");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/ingredients?type=grain&search=pale"
      );

      // The service should process the wrapped response
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Pale Malt");
      expect(result.data[0].amount).toBe(0); // Default amount added by service
    });

    it("should handle direct array ingredient response", async () => {
      const mockResponse = {
        data: [{ id: "1", name: "Cascade", type: "hop", suggested_unit: "oz" }],
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.ingredients.getAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe("hop");
      expect(result.data[0].unit).toBe("oz"); // Should use suggested_unit
      expect(result.data[0].amount).toBe(0); // Default amount
    });
  });

  describe("Connection Check", () => {
    it("should return true when health check succeeds", async () => {
      const mockResponse = { status: 200, data: { status: "ok" } };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const isConnected = await ApiService.checkConnection();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/health", {
        timeout: 5000,
      });
      expect(isConnected).toBe(true);
    });

    it("should return false when health check fails", async () => {
      (mockAxiosInstance.get as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const isConnected = await ApiService.checkConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe("Interceptors", () => {
    let requestInterceptor: any;
    let responseInterceptor: any;

    beforeEach(() => {
      // Get the interceptor functions from test-scoped variables (set in beforeAll)
      requestInterceptor = testRequestInterceptor;
      responseInterceptor = testResponseInterceptor;
    });

    it("should add authorization header when token exists", async () => {
      mockSecureStore.getItemAsync.mockResolvedValue("test-token");

      const config = {
        headers: {},
      };

      const modifiedConfig = await requestInterceptor(config);

      expect(modifiedConfig.headers.Authorization).toBe("Bearer test-token");
    });

    it("should not add authorization header when no token", async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const config = {
        headers: {},
      };

      const modifiedConfig = await requestInterceptor(config);

      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });

    it("should handle 401 responses by removing token", async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 401,
        } as any,
      };

      await expect(responseInterceptor.onRejected(error)).rejects.toBeDefined();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "access_token"
      );
    });
  });

  describe("Dashboard Endpoint", () => {
    it("should fetch dashboard data", async () => {
      const mockResponse = {
        data: {
          recipeCount: 5,
          brewSessionCount: 10,
          recentActivity: [],
        },
      };
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApiService.dashboard.getData();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/dashboard");
      expect(result.data.recipeCount).toBe(5);
    });
  });

  // ===== ADDITIONAL LOGIC TESTS FROM MOCKED FILE =====

  describe("Retry Logic", () => {
    const withRetry = async (
      operation: () => Promise<any>,
      isRetryable: (error: any) => boolean = () => true,
      maxAttempts: number = 3,
      delay: number = 10 // Reduced for testing
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

      const isRetryable = jest.fn().mockReturnValue(true);
      const result = await withRetry(failingOperation, isRetryable);

      expect(result).toBe("success");
      expect(failingOperation).toHaveBeenCalledTimes(2);
      expect(isRetryable).toHaveBeenCalledWith(new Error("Temporary failure"));
    });

    it("should not retry on non-retryable errors", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Permanent failure"));

      const isRetryable = jest.fn().mockReturnValue(false);

      await expect(withRetry(failingOperation, isRetryable)).rejects.toThrow(
        "Permanent failure"
      );
      expect(failingOperation).toHaveBeenCalledTimes(1);
      expect(isRetryable).toHaveBeenCalledWith(new Error("Permanent failure"));
    });

    it("should exhaust retry attempts", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Always fails"));

      const isRetryable = jest.fn().mockReturnValue(true);

      await expect(withRetry(failingOperation, isRetryable, 3)).rejects.toThrow(
        "Always fails"
      );
      expect(failingOperation).toHaveBeenCalledTimes(3);
      expect(isRetryable).toHaveBeenCalledTimes(2); // Called for first 2 failures, not the final one
    });
  });

  describe("URL Validation Logic", () => {
    // Mock the validation function from ApiService
    const validateApiUrl = (url: string | undefined) => {
      if (!url) {
        throw new Error(
          "API_URL environment variable is required. Please set EXPO_PUBLIC_API_URL in your .env file."
        );
      }

      // Validate URL format
      try {
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
        }
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error(
            `Invalid API_URL format: ${url}. Please provide a valid URL.`
          );
        }
        throw error;
      }

      // Clean trailing slashes
      return url.replace(/\/+$/, "");
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
      expect(() => validateApiUrl("not-a-url")).toThrow("Invalid URL");
      expect(() => validateApiUrl("just-text")).toThrow("Invalid URL");
    });

    it("should reject invalid protocols", () => {
      expect(() => validateApiUrl("ftp://example.com")).toThrow(
        "Invalid protocol: ftp:"
      );
      expect(() => validateApiUrl("file:///path/to/file")).toThrow(
        "Invalid protocol: file:"
      );
    });

    it("should clean trailing slashes", () => {
      expect(validateApiUrl("https://api.example.com/")).toBe(
        "https://api.example.com"
      );
      expect(validateApiUrl("https://api.example.com///")).toBe(
        "https://api.example.com"
      );
    });

    it("should accept valid URLs", () => {
      expect(validateApiUrl("http://localhost:3000")).toBe(
        "http://localhost:3000"
      );
      expect(validateApiUrl("https://api.example.com")).toBe(
        "https://api.example.com"
      );
      expect(validateApiUrl("https://api.example.com:8080/v1")).toBe(
        "https://api.example.com:8080/v1"
      );
    });
  });
});
