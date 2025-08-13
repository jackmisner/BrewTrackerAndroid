/// <reference types="jest" />
/// <reference types="@types/jest" />
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
      mockStorage: any;
      testUtils: any;
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
    mockApiSuccess: <T>(data: T) => Promise<T>;
    mockApiError: (error: string) => Promise<never>;
    mockNavigation: {
      navigate: jest.MockedFunction<any>;
      goBack: jest.MockedFunction<any>;
      reset: jest.MockedFunction<any>;
      setOptions: jest.MockedFunction<any>;
    };
    mockRoute: {
      params: any;
      key: string;
      name: string;
    };
  };
}

export {};