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
        fulfilled: responseCall[0],
        rejected: responseCall[1],
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
        fulfilled: requestCall[0],
        rejected: requestCall[1],
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
});
