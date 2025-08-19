import axios, { AxiosInstance } from "axios";
import {
  setupIDInterceptors,
  removeIDInterceptors,
  getInterceptorStatus,
} from "@src/services/api/idInterceptor";
import * as idNormalization from "@utils/idNormalization";

// Mock the idNormalization module
jest.mock("@utils/idNormalization", () => ({
  detectEntityTypeFromUrl: jest.fn(),
  normalizeResponseData: jest.fn(),
  denormalizeEntityIdDeep: jest.fn(),
  debugEntityIds: jest.fn(),
}));

const mockIdNormalization = idNormalization as jest.Mocked<
  typeof idNormalization
>;

describe("idInterceptor", () => {
  let apiInstance: AxiosInstance;

  beforeEach(() => {
    apiInstance = axios.create({
      baseURL: "http://localhost:3000",
    });
    jest.clearAllMocks();
  });

  describe("setupIDInterceptors", () => {
    it("should not throw when setting up interceptors", () => {
      expect(() => setupIDInterceptors(apiInstance)).not.toThrow();
    });

    it("should not throw when setting up interceptors multiple times", () => {
      expect(() => {
        setupIDInterceptors(apiInstance);
        setupIDInterceptors(apiInstance);
      }).not.toThrow();
    });

    it("should register interceptors that can be detected", () => {
      setupIDInterceptors(apiInstance);

      // Should be able to add more interceptors after setup
      expect(() => {
        apiInstance.interceptors.request.use(config => config);
        apiInstance.interceptors.response.use(response => response);
      }).not.toThrow();
    });

    it("should call the use method on interceptors", () => {
      const requestUseSpy = jest.spyOn(apiInstance.interceptors.request, "use");
      const responseUseSpy = jest.spyOn(
        apiInstance.interceptors.response,
        "use"
      );

      setupIDInterceptors(apiInstance);

      expect(requestUseSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
      expect(responseUseSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );

      requestUseSpy.mockRestore();
      responseUseSpy.mockRestore();
    });
  });

  describe("removeIDInterceptors", () => {
    it("should not throw on clean instance", () => {
      expect(() => removeIDInterceptors(apiInstance)).not.toThrow();
    });

    it("should clear handlers arrays", () => {
      // Manually set up handlers array to test clearing
      (apiInstance.interceptors.request as any).handlers = [{}];
      (apiInstance.interceptors.response as any).handlers = [{}, {}];

      removeIDInterceptors(apiInstance);

      expect((apiInstance.interceptors.request as any).handlers).toEqual([]);
      expect((apiInstance.interceptors.response as any).handlers).toEqual([]);
    });

    it("should handle instances with no handlers array", () => {
      // Mock instance with no handlers
      const mockInstance = {
        interceptors: {
          request: {},
          response: {},
        },
      } as AxiosInstance;

      expect(() => removeIDInterceptors(mockInstance)).not.toThrow();
    });

    it("should use fallback clearing when clear() method is not available", () => {
      setupIDInterceptors(apiInstance);
      
      // Mock interceptors without clear() method
      const mockRequestInterceptor = {
        handlers: [{ fulfilled: jest.fn(), rejected: jest.fn() }],
        // No clear method
      };
      
      // Replace the interceptor with our mock
      (apiInstance.interceptors as any).request = mockRequestInterceptor;
      
      // Should not throw and should use fallback
      expect(() => removeIDInterceptors(apiInstance)).not.toThrow();
      
      // Should have cleared handlers array
      expect(mockRequestInterceptor.handlers).toEqual([]);
    });

    it("should use fallback clearing for response interceptors when clear() method is not available", () => {
      setupIDInterceptors(apiInstance);
      
      // Mock interceptors without clear() method
      const mockResponseInterceptor = {
        handlers: [{ fulfilled: jest.fn(), rejected: jest.fn() }],
        // No clear method
      };
      
      // Replace the interceptor with our mock
      (apiInstance.interceptors as any).response = mockResponseInterceptor;
      
      // Should not throw and should use fallback
      expect(() => removeIDInterceptors(apiInstance)).not.toThrow();
      
      // Should have cleared handlers array
      expect(mockResponseInterceptor.handlers).toEqual([]);
    });

    it("should handle mixed interceptor clearing scenarios", () => {
      setupIDInterceptors(apiInstance);
      
      // Mock request interceptor with clear() method
      const mockRequestInterceptor = {
        handlers: [{ fulfilled: jest.fn(), rejected: jest.fn() }],
        clear: jest.fn(),
      };
      
      // Mock response interceptor without clear() method
      const mockResponseInterceptor = {
        handlers: [{ fulfilled: jest.fn(), rejected: jest.fn() }],
        // No clear method - should use fallback
      };
      
      (apiInstance.interceptors as any).request = mockRequestInterceptor;
      (apiInstance.interceptors as any).response = mockResponseInterceptor;
      
      removeIDInterceptors(apiInstance);
      
      // Request should use clear() method
      expect(mockRequestInterceptor.clear).toHaveBeenCalled();
      
      // Response should use fallback (handlers array cleared)
      expect(mockResponseInterceptor.handlers).toEqual([]);
    });

    it("should handle interceptors with handlers but no clear method", () => {
      setupIDInterceptors(apiInstance);
      
      // Create mock interceptors with handlers but no clear method
      const mockInterceptors = {
        request: {
          handlers: [
            { fulfilled: jest.fn(), rejected: jest.fn() },
            { fulfilled: jest.fn(), rejected: jest.fn() }
          ]
          // No clear method - should use fallback
        },
        response: {
          handlers: [
            { fulfilled: jest.fn(), rejected: jest.fn() }
          ]
          // No clear method - should use fallback
        }
      };
      
      (apiInstance as any).interceptors = mockInterceptors;
      
      removeIDInterceptors(apiInstance);
      
      // Should have cleared both handlers arrays using fallback
      expect(mockInterceptors.request.handlers).toEqual([]);
      expect(mockInterceptors.response.handlers).toEqual([]);
    });
  });

  describe("getInterceptorStatus", () => {
    it("should return false for both when no interceptors are attached", () => {
      const status = getInterceptorStatus(apiInstance);
      expect(status.requestInterceptors).toBe(false);
      expect(status.responseInterceptors).toBe(false);
    });

    it("should handle instances with undefined handlers gracefully", () => {
      // Create a mock instance that might have undefined handlers
      const mockInstance = {
        interceptors: {
          request: {},
          response: {},
        },
      } as AxiosInstance;

      const status = getInterceptorStatus(mockInstance);
      expect(status.requestInterceptors).toBe(false);
      expect(status.responseInterceptors).toBe(false);
    });

    it("should handle instances with null interceptors", () => {
      const mockInstance = {
        interceptors: {
          request: { handlers: null },
          response: { handlers: null },
        },
      } as unknown as AxiosInstance;

      const status = getInterceptorStatus(mockInstance);
      expect(status.requestInterceptors).toBe(false);
      expect(status.responseInterceptors).toBe(false);
    });

    it("should handle instances with empty handlers array", () => {
      const mockInstance = {
        interceptors: {
          request: { handlers: [] },
          response: { handlers: [] },
        },
      } as unknown as AxiosInstance;

      const status = getInterceptorStatus(mockInstance);
      expect(status.requestInterceptors).toBe(false);
      expect(status.responseInterceptors).toBe(false);
    });

    it("should return true when handlers array has items", () => {
      const mockInstance = {
        interceptors: {
          request: { handlers: [{}] },
          response: { handlers: [{}, {}] },
        },
      } as unknown as AxiosInstance;

      const status = getInterceptorStatus(mockInstance);
      expect(status.requestInterceptors).toBe(true);
      expect(status.responseInterceptors).toBe(true);
    });

    it("should correctly detect mixed interceptor states", () => {
      const mockInstance = {
        interceptors: {
          request: { handlers: [{}] },
          response: { handlers: [] },
        },
      } as unknown as AxiosInstance;

      const status = getInterceptorStatus(mockInstance);
      expect(status.requestInterceptors).toBe(true);
      expect(status.responseInterceptors).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should throw when calling setupIDInterceptors with invalid axios instance", () => {
      const invalidInstance = {} as AxiosInstance;

      expect(() => setupIDInterceptors(invalidInstance)).toThrow();
    });

    it("should throw when calling getInterceptorStatus with malformed axios instances", () => {
      const malformedInstance = {
        interceptors: null,
      } as unknown as AxiosInstance;

      expect(() => getInterceptorStatus(malformedInstance)).toThrow();
    });

    it("should handle removeIDInterceptors with partially malformed instances", () => {
      const partialInstance = {
        interceptors: {
          request: null,
          response: { handlers: [] },
        },
      } as unknown as AxiosInstance;

      expect(() => removeIDInterceptors(partialInstance)).not.toThrow();
    });
  });

  describe("mock verification", () => {
    it("should verify that idNormalization module is properly mocked", () => {
      expect(
        jest.isMockFunction(mockIdNormalization.detectEntityTypeFromUrl)
      ).toBe(true);
      expect(
        jest.isMockFunction(mockIdNormalization.normalizeResponseData)
      ).toBe(true);
      expect(
        jest.isMockFunction(mockIdNormalization.denormalizeEntityIdDeep)
      ).toBe(true);
      expect(jest.isMockFunction(mockIdNormalization.debugEntityIds)).toBe(
        true
      );
    });

    it("should allow mock configuration", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      expect(mockIdNormalization.detectEntityTypeFromUrl("test")).toBe(
        "recipe"
      );

      mockIdNormalization.normalizeResponseData.mockReturnValue({ id: "123" });
      expect(mockIdNormalization.normalizeResponseData({}, "recipe")).toEqual({
        id: "123",
      });
    });
  });

  describe("function exports", () => {
    it("should export all required functions", () => {
      expect(typeof setupIDInterceptors).toBe("function");
      expect(typeof removeIDInterceptors).toBe("function");
      expect(typeof getInterceptorStatus).toBe("function");
    });

    it("should have correct function names", () => {
      expect(setupIDInterceptors.name).toBe("setupIDInterceptors");
      expect(removeIDInterceptors.name).toBe("removeIDInterceptors");
      expect(getInterceptorStatus.name).toBe("getInterceptorStatus");
    });
  });

  describe("integration with mocked dependencies", () => {
    it("should import from the correct module paths", () => {
      // Verify that our imports work
      expect(mockIdNormalization).toBeDefined();
      expect(setupIDInterceptors).toBeDefined();
      expect(removeIDInterceptors).toBeDefined();
      expect(getInterceptorStatus).toBeDefined();
    });

    it("should handle repeated mock configurations", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      expect(mockIdNormalization.detectEntityTypeFromUrl("test")).toBe(
        "recipe"
      );

      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("ingredient");
      expect(mockIdNormalization.detectEntityTypeFromUrl("test")).toBe(
        "ingredient"
      );
    });
  });

  describe("Response Interceptor Behavior", () => {
    let responseInterceptor: {
      fulfilled: (response: any) => any;
      rejected: (error: any) => Promise<any>;
    };

    beforeEach(() => {
      const requestUseSpy = jest.spyOn(apiInstance.interceptors.request, "use");
      const responseUseSpy = jest.spyOn(apiInstance.interceptors.response, "use");
      
      setupIDInterceptors(apiInstance);
      
      // Extract the actual interceptor functions
      const responseCall = responseUseSpy.mock.calls[0];
      responseInterceptor = {
        fulfilled: responseCall[0] as any,
        rejected: responseCall[1] as any,
      };
      
      requestUseSpy.mockRestore();
      responseUseSpy.mockRestore();
    });

    it("should normalize recipe response data", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        id: "normalized-123",
        name: "Test Recipe",
      });

      const response = {
        data: { recipe_id: "backend-123", name: "Test Recipe" },
        config: { url: "/recipes/123" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      const result = responseInterceptor.fulfilled(response);

      expect(mockIdNormalization.detectEntityTypeFromUrl).toHaveBeenCalledWith(
        "/recipes/123"
      );
      expect(mockIdNormalization.normalizeResponseData).toHaveBeenCalledWith(
        { recipe_id: "backend-123", name: "Test Recipe" },
        "recipe"
      );
      expect(result.data).toEqual({
        id: "normalized-123",
        name: "Test Recipe",
      });
    });

    it("should skip normalization for non-entity endpoints", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue(null);

      const response = {
        data: { status: "healthy" },
        config: { url: "/health" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      const result = responseInterceptor.fulfilled(response);

      expect(mockIdNormalization.normalizeResponseData).not.toHaveBeenCalled();
      expect(result.data).toEqual({ status: "healthy" });
    });

    it("should handle normalization errors gracefully", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockImplementation(() => {
        throw new Error("Normalization failed");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const response = {
        data: { recipe_id: "123", name: "Test Recipe" },
        config: { url: "/recipes/123" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      const result = responseInterceptor.fulfilled(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ ID Interceptor - Response normalization failed:",
        expect.objectContaining({
          error: "Normalization failed",
          url: "/recipes/123",
          entityType: "recipe",
        })
      );

      // Should return original data when normalization fails
      expect(result.data).toEqual({ recipe_id: "123", name: "Test Recipe" });

      consoleSpy.mockRestore();
    });

    it("should debug array responses correctly", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockReturnValue([
        { id: "1", name: "Recipe 1" },
        { id: "2", name: "Recipe 2" },
      ]);

      const response = {
        data: [
          { recipe_id: "1", name: "Recipe 1" },
          { recipe_id: "2", name: "Recipe 2" },
        ],
        config: { url: "/recipes" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { recipe_id: "1", name: "Recipe 1" },
        "Original recipe (first item)"
      );
    });

    it("should pass through errors unchanged", async () => {
      const error = new Error("Network error");
      
      await expect(responseInterceptor.rejected(error)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("Request Interceptor Behavior", () => {
    let requestInterceptor: {
      fulfilled: (config: any) => any;
      rejected: (error: any) => Promise<any>;
    };

    beforeEach(() => {
      const requestUseSpy = jest.spyOn(apiInstance.interceptors.request, "use");
      const responseUseSpy = jest.spyOn(apiInstance.interceptors.response, "use");
      
      setupIDInterceptors(apiInstance);
      
      // Extract the actual interceptor functions
      const requestCall = requestUseSpy.mock.calls[0];
      requestInterceptor = {
        fulfilled: requestCall[0] as any,
        rejected: requestCall[1] as any,
      };
      
      requestUseSpy.mockRestore();
      responseUseSpy.mockRestore();
    });

    it("should denormalize request data for recipe endpoints", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.denormalizeEntityIdDeep.mockReturnValue({
        recipe_id: "backend-123",
        name: "Test Recipe",
      });

      const config = {
        url: "/recipes",
        method: "post",
        data: { id: "frontend-123", name: "Test Recipe" },
      };

      const result = requestInterceptor.fulfilled(config);

      expect(mockIdNormalization.detectEntityTypeFromUrl).toHaveBeenCalledWith(
        "/recipes"
      );
      expect(mockIdNormalization.denormalizeEntityIdDeep).toHaveBeenCalledWith(
        { id: "frontend-123", name: "Test Recipe" },
        "recipe"
      );
      expect(result.data).toEqual({
        recipe_id: "backend-123",
        name: "Test Recipe",
      });
    });

    it("should skip denormalization for non-entity endpoints", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue(null);

      const config = {
        url: "/health",
        method: "get",
        data: { check: true },
      };

      const result = requestInterceptor.fulfilled(config);

      expect(mockIdNormalization.denormalizeEntityIdDeep).not.toHaveBeenCalled();
      expect(result.data).toEqual({ check: true });
    });

    it("should skip denormalization when no data is present", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");

      const config = {
        url: "/recipes/123",
        method: "get",
      };

      const result = requestInterceptor.fulfilled(config);

      expect(mockIdNormalization.denormalizeEntityIdDeep).not.toHaveBeenCalled();
      expect(result).toEqual(config);
    });

    it("should handle denormalization errors gracefully", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.denormalizeEntityIdDeep.mockImplementation(() => {
        throw new Error("Denormalization failed");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const config = {
        url: "/recipes",
        method: "post",
        data: { id: "frontend-123", name: "Test Recipe" },
      };

      const result = requestInterceptor.fulfilled(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ ID Interceptor - Request denormalization failed:",
        expect.objectContaining({
          error: "Denormalization failed",
          url: "/recipes",
          entityType: "recipe",
        })
      );

      // Should return original data when denormalization fails
      expect(result.data).toEqual({ id: "frontend-123", name: "Test Recipe" });

      consoleSpy.mockRestore();
    });

    it("should debug request transformations", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("ingredient");
      mockIdNormalization.denormalizeEntityIdDeep.mockReturnValue({
        ingredient_id: "backend-123",
        name: "Pale Malt",
      });

      const config = {
        url: "/ingredients",
        method: "post",
        data: { id: "frontend-123", name: "Pale Malt" },
      };

      requestInterceptor.fulfilled(config);

      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { id: "frontend-123", name: "Pale Malt" },
        "Original request data (ingredient)"
      );
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { ingredient_id: "backend-123", name: "Pale Malt" },
        "Denormalized request data (ingredient)"
      );
    });

    it("should pass through request errors unchanged", async () => {
      const error = new Error("Request setup error");
      
      await expect(requestInterceptor.rejected(error)).rejects.toThrow(
        "Request setup error"
      );
    });
  });

  // Additional Coverage Tests for Enhanced Coverage
  describe("Response Interceptor - Wrapped Data Format Coverage", () => {
    let responseInterceptor: {
      fulfilled: (response: any) => any;
      rejected: (error: any) => Promise<any>;
    };

    beforeEach(() => {
      const responseUseSpy = jest.spyOn(apiInstance.interceptors.response, "use");
      setupIDInterceptors(apiInstance);
      const responseCall = responseUseSpy.mock.calls[0];
      responseInterceptor = {
        fulfilled: responseCall[0] as any,
        rejected: responseCall[1] as any,
      };
      responseUseSpy.mockRestore();
    });

    it("should debug wrapped response data format (response.data.data array)", () => {
      // Line 49: response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        data: [
          { id: "1", name: "Recipe 1" },
          { id: "2", name: "Recipe 2" },
        ],
      });

      const response = {
        data: {
          data: [
            { recipe_id: "1", name: "Recipe 1" },
            { recipe_id: "2", name: "Recipe 2" },
          ],
          pagination: { total: 2, page: 1 }
        },
        config: { url: "/recipes" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should debug the first item in the wrapped data array
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { recipe_id: "1", name: "Recipe 1" },
        "Original recipe (first item)"
      );
    });

    it("should debug ingredients format in response data", () => {
      // Line 58: response.data.ingredients && Array.isArray(response.data.ingredients) && response.data.ingredients.length > 0
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("ingredient");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        ingredients: [
          { id: "ing1", name: "Pale Malt" },
          { id: "ing2", name: "Cascade Hops" },
        ],
      });

      const response = {
        data: {
          ingredients: [
            { ingredient_id: "ing1", name: "Pale Malt", type: "grain" },
            { ingredient_id: "ing2", name: "Cascade Hops", type: "hop" },
          ],
          unit_system: "imperial",
          unit_preferences: {},
        },
        config: { url: "/ingredients" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should debug the first ingredient
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { ingredient_id: "ing1", name: "Pale Malt", type: "grain" },
        "Original ingredient (first item)"
      );
    });

    it("should debug normalized wrapped data format (response.data.data array)", () => {
      // Line 86: response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      
      const originalData = {
        data: [
          { recipe_id: "1", name: "Recipe 1" },
          { recipe_id: "2", name: "Recipe 2" },
        ],
      };

      const normalizedData = {
        data: [
          { id: "1", name: "Recipe 1" },
          { id: "2", name: "Recipe 2" },
        ],
      };

      mockIdNormalization.normalizeResponseData.mockReturnValue(normalizedData);

      const response = {
        data: originalData,
        config: { url: "/recipes" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should debug normalized data (different from original)
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { id: "1", name: "Recipe 1" },
        "Normalized recipe (first item)"
      );
    });

    it("should debug normalized ingredients format", () => {
      // Line 95: response.data.ingredients && Array.isArray(response.data.ingredients) && response.data.ingredients.length > 0
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("ingredient");
      
      const originalData = {
        ingredients: [
          { ingredient_id: "ing1", name: "Pale Malt" },
        ],
      };

      const normalizedData = {
        ingredients: [
          { id: "ing1", name: "Pale Malt" },
        ],
      };

      mockIdNormalization.normalizeResponseData.mockReturnValue(normalizedData);

      const response = {
        data: originalData,
        config: { url: "/ingredients" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should debug normalized ingredient (different from original)
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { id: "ing1", name: "Pale Malt" },
        "Normalized ingredient (first item)"
      );
    });
  });

  describe("Edge Cases for Response Data Structures", () => {
    let responseInterceptor: {
      fulfilled: (response: any) => any;
      rejected: (error: any) => Promise<any>;
    };

    beforeEach(() => {
      const responseUseSpy = jest.spyOn(apiInstance.interceptors.response, "use");
      setupIDInterceptors(apiInstance);
      const responseCall = responseUseSpy.mock.calls[0];
      responseInterceptor = {
        fulfilled: responseCall[0] as any,
        rejected: responseCall[1] as any,
      };
      responseUseSpy.mockRestore();
    });

    it("should handle response with empty data.data array", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        data: [],
      });

      const response = {
        data: {
          data: [], // Empty array - should not trigger debugging
          pagination: { total: 0, page: 1 }
        },
        config: { url: "/recipes" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should not debug empty arrays
      expect(mockIdNormalization.debugEntityIds).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("first item")
      );
    });

    it("should handle response with empty ingredients array", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("ingredient");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        ingredients: [],
      });

      const response = {
        data: {
          ingredients: [], // Empty array - should not trigger debugging
          unit_system: "imperial",
        },
        config: { url: "/ingredients" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should debug the whole response object but not individual ingredients
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { ingredients: [], unit_system: "imperial" },
        "Original ingredient"
      );
      // Should also debug normalized version
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { ingredients: [] },
        "Normalized ingredient"
      );
    });

    it("should handle response with null data.data", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        data: null,
      });

      const response = {
        data: {
          data: null, // Null data - should not trigger debugging
        },
        config: { url: "/recipes" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should not debug null data
      expect(mockIdNormalization.debugEntityIds).not.toHaveBeenCalledWith(
        null,
        expect.stringContaining("first item")
      );
    });

    it("should handle response with non-array data.data", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        data: "not an array",
      });

      const response = {
        data: {
          data: "not an array", // Not an array - should not trigger debugging
        },
        config: { url: "/recipes" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should not debug non-array data
      expect(mockIdNormalization.debugEntityIds).not.toHaveBeenCalledWith(
        "not an array",
        expect.stringContaining("first item")
      );
    });
  });

  describe("removeIDInterceptors - clear() method coverage", () => {
    it("should use clear() method when available on response interceptors", () => {
      // Line 171: typeof apiInstance.interceptors.response.clear === "function"
      setupIDInterceptors(apiInstance);
      
      // Mock the response interceptor to have a clear method
      const mockClear = jest.fn();
      (apiInstance.interceptors.response as any).clear = mockClear;
      
      removeIDInterceptors(apiInstance);
      
      // Should have called the clear() method
      expect(mockClear).toHaveBeenCalled();
    });

    it("should use clear() method when available on request interceptors", () => {
      setupIDInterceptors(apiInstance);
      
      // Mock the request interceptor to have a clear method
      const mockClear = jest.fn();
      (apiInstance.interceptors.request as any).clear = mockClear;
      
      removeIDInterceptors(apiInstance);
      
      // Should have called the clear() method
      expect(mockClear).toHaveBeenCalled();
    });

    it("should handle interceptors that have both clear method and handlers", () => {
      setupIDInterceptors(apiInstance);
      
      // Mock both interceptors to have clear methods
      const mockRequestClear = jest.fn();
      const mockResponseClear = jest.fn();
      
      (apiInstance.interceptors.request as any).clear = mockRequestClear;
      (apiInstance.interceptors.response as any).clear = mockResponseClear;
      
      removeIDInterceptors(apiInstance);
      
      // Both clear methods should have been called
      expect(mockRequestClear).toHaveBeenCalled();
      expect(mockResponseClear).toHaveBeenCalled();
    });

    it("should handle missing interceptors property gracefully", () => {
      const mockInstance = {
        interceptors: undefined,
      } as unknown as AxiosInstance;

      // Should not throw even with undefined interceptors
      expect(() => removeIDInterceptors(mockInstance)).not.toThrow();
    });

    it("should handle missing request interceptor gracefully", () => {
      const mockInstance = {
        interceptors: {
          request: undefined,
          response: { handlers: [] },
        },
      } as unknown as AxiosInstance;

      expect(() => removeIDInterceptors(mockInstance)).not.toThrow();
    });

    it("should handle missing response interceptor gracefully", () => {
      const mockInstance = {
        interceptors: {
          request: { handlers: [] },
          response: undefined,
        },
      } as unknown as AxiosInstance;

      expect(() => removeIDInterceptors(mockInstance)).not.toThrow();
    });
  });

  describe("Complex Response Data Structure Coverage", () => {
    let responseInterceptor: {
      fulfilled: (response: any) => any;
      rejected: (error: any) => Promise<any>;
    };

    beforeEach(() => {
      const responseUseSpy = jest.spyOn(apiInstance.interceptors.response, "use");
      setupIDInterceptors(apiInstance);
      const responseCall = responseUseSpy.mock.calls[0];
      responseInterceptor = {
        fulfilled: responseCall[0] as any,
        rejected: responseCall[1] as any,
      };
      responseUseSpy.mockRestore();
    });

    it("should handle deeply nested response data structures", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        data: {
          recipes: [
            { id: "1", name: "Recipe 1" },
          ]
        }
      });

      const response = {
        data: {
          data: {
            recipes: [
              { recipe_id: "1", name: "Recipe 1" },
            ]
          }
        },
        config: { url: "/recipes" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      // Should handle nested structures without throwing
      expect(() => responseInterceptor.fulfilled(response)).not.toThrow();
    });

    it("should handle response data with mixed array and object structures", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("ingredient");
      mockIdNormalization.normalizeResponseData.mockReturnValue({
        ingredients: [
          { id: "ing1", name: "Malt" },
        ],
        categories: {
          grains: ["ing1"]
        }
      });

      const response = {
        data: {
          ingredients: [
            { ingredient_id: "ing1", name: "Malt" },
          ],
          categories: {
            grains: ["ing1"]
          }
        },
        config: { url: "/ingredients" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      expect(() => responseInterceptor.fulfilled(response)).not.toThrow();
      
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        { ingredient_id: "ing1", name: "Malt" },
        "Original ingredient (first item)"
      );
    });

    it("should handle normalization that returns identical data", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      
      const originalData = { id: "1", name: "Recipe 1" };
      // Return the SAME object reference to trigger the response.data === originalData condition
      mockIdNormalization.normalizeResponseData.mockReturnValue(originalData);

      const response = {
        data: originalData,
        config: { url: "/recipes/1" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      // Should debug original data
      expect(mockIdNormalization.debugEntityIds).toHaveBeenCalledWith(
        originalData,
        "Original recipe"
      );

      // Should NOT debug normalized data if it's the same object reference
      // (since response.data === originalData, the normalization debug branch is skipped)
      expect(mockIdNormalization.debugEntityIds).not.toHaveBeenCalledWith(
        originalData,
        "Normalized recipe"
      );
    });

    it("should handle response with undefined config.url", () => {
      const response = {
        data: { id: "1", name: "Test" },
        config: {}, // No url property
        status: 200,
        statusText: "OK",
        headers: {},
      };

      // Should handle undefined URL gracefully
      expect(() => responseInterceptor.fulfilled(response)).not.toThrow();
      
      // detectEntityTypeFromUrl should be called with empty string
      expect(mockIdNormalization.detectEntityTypeFromUrl).toHaveBeenCalledWith("");
    });
  });

  describe("Error Handling Edge Cases", () => {
    let responseInterceptor: {
      fulfilled: (response: any) => any;
      rejected: (error: any) => Promise<any>;
    };

    beforeEach(() => {
      const responseUseSpy = jest.spyOn(apiInstance.interceptors.response, "use");
      setupIDInterceptors(apiInstance);
      const responseCall = responseUseSpy.mock.calls[0];
      responseInterceptor = {
        fulfilled: responseCall[0] as any,
        rejected: responseCall[1] as any,
      };
      responseUseSpy.mockRestore();
    });

    it("should handle normalization errors with non-Error objects", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockImplementation(() => {
        throw "String error"; // Non-Error object
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const response = {
        data: { recipe_id: "123" },
        config: { url: "/recipes/123" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      const result = responseInterceptor.fulfilled(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ ID Interceptor - Response normalization failed:",
        expect.objectContaining({
          error: "String error", // Should convert to string
        })
      );

      // Should return original data
      expect(result.data).toEqual({ recipe_id: "123" });

      consoleSpy.mockRestore();
    });

    it("should handle normalization errors with null error", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockImplementation(() => {
        throw null; // Null error
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const response = {
        data: { recipe_id: "123" },
        config: { url: "/recipes/123" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ ID Interceptor - Response normalization failed:",
        expect.objectContaining({
          error: "null", // Should convert null to string
        })
      );

      consoleSpy.mockRestore();
    });

    it("should handle normalization errors with undefined error", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      mockIdNormalization.normalizeResponseData.mockImplementation(() => {
        throw undefined; // Undefined error
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const response = {
        data: { recipe_id: "123" },
        config: { url: "/recipes/123" },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      responseInterceptor.fulfilled(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ ID Interceptor - Response normalization failed:",
        expect.objectContaining({
          error: "undefined", // Should convert undefined to string
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
