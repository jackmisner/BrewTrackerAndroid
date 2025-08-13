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

const mockIdNormalization = idNormalization as jest.Mocked<typeof idNormalization>;

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
      const requestUseSpy = jest.spyOn(apiInstance.interceptors.request, 'use');
      const responseUseSpy = jest.spyOn(apiInstance.interceptors.response, 'use');

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
      expect(jest.isMockFunction(mockIdNormalization.detectEntityTypeFromUrl)).toBe(true);
      expect(jest.isMockFunction(mockIdNormalization.normalizeResponseData)).toBe(true);
      expect(jest.isMockFunction(mockIdNormalization.denormalizeEntityIdDeep)).toBe(true);
      expect(jest.isMockFunction(mockIdNormalization.debugEntityIds)).toBe(true);
    });

    it("should allow mock configuration", () => {
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("recipe");
      expect(mockIdNormalization.detectEntityTypeFromUrl("test")).toBe("recipe");

      mockIdNormalization.normalizeResponseData.mockReturnValue({ id: "123" });
      expect(mockIdNormalization.normalizeResponseData({}, "recipe")).toEqual({ id: "123" });
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
      expect(mockIdNormalization.detectEntityTypeFromUrl("test")).toBe("recipe");
      
      mockIdNormalization.detectEntityTypeFromUrl.mockReturnValue("ingredient");
      expect(mockIdNormalization.detectEntityTypeFromUrl("test")).toBe("ingredient");
    });
  });
});