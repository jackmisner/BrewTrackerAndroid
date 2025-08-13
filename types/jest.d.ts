/// <reference types="jest" />
/// <reference types="@testing-library/jest-native" />
/// <reference types="node" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }

  // Extend jest mocks for better typing
  namespace NodeJS {
    interface Global {
      mockStorage: typeof mockStorage;
      testUtils: typeof testUtils;
    }
  }

  var mockStorage: {
    getItem: jest.MockedFunction<any>;
    getItemAsync: jest.MockedFunction<any>;
    setItem: jest.MockedFunction<any>;
    setItemAsync: jest.MockedFunction<any>;
    removeItem: jest.MockedFunction<any>;
    deleteItemAsync: jest.MockedFunction<any>;
    clear: jest.MockedFunction<any>;
    multiRemove: jest.MockedFunction<any>;
    _getStore: () => any;
    _setStore: (store: any) => void;
  };

  var testUtils: {
    createMockEvent: (overrides?: any) => any;
    createMockProps: (overrides?: any) => any;
    waitForNextTick: () => Promise<void>;
    mockApiSuccess: <T>(data: T) => Promise<{ data: T }>;
    mockApiError: (error: string) => Promise<never>;
    createMockNavigation: (overrides?: any) => any;
    createMockRoute: (overrides?: any) => any;
    createAuthenticatedState: (userOverrides?: any) => {
      isAuthenticated: true;
      user: any;
      token: string;
    };
    createUnauthenticatedState: () => {
      isAuthenticated: false;
      user: null;
      token: null;
    };
    resetCounters: () => void;
    flushPromises: () => Promise<void>;
    createNetworkError: (message?: string) => {
      isAxiosError: true;
      message: string;
      code: "NETWORK_ERROR";
      response?: undefined;
    };
    createAPIError: (
      status?: number,
      message?: string,
      errors?: any[]
    ) => {
      isAxiosError: true;
      message: string;
      response: { status: number; data: { error: string; errors: any[] } };
    };
    createValidationError: (
      field: string,
      message: string
    ) => { field: string; message: string };
  };
}

export {};
