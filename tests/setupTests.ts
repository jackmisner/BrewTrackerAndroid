// Basic test setup without heavy mocking initially
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
// @ts-ignore - TextDecoder polyfill for Node.js environment
global.TextDecoder = TextDecoder;

// Basic mock storage
const createStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
    getItemAsync: jest.fn((key: string) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value?.toString() || '';
      return Promise.resolve();
    }),
    setItemAsync: jest.fn((key: string, value: string) => {
      store[key] = value?.toString() || '';
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    // Helper for tests to access the store
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
};

// Create the mock and make it global so tests can access it
(global as any).mockStorage = createStorageMock();

// Setup for testing library cleanup
afterEach(() => {
  // Clear all mock calls but preserve mock implementations
  jest.clearAllMocks();
  // Reset storage
  (global as any).mockStorage.clear();
  (global as any).mockStorage._setStore({});
});

// Custom matchers for testing
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Mock crypto for any UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array(10)),
    randomUUID: jest.fn().mockReturnValue('mock-uuid'),
  },
});

// Global test utilities
(global as any).testUtils = {
  // Helper to create mock events
  createMockEvent: (overrides = {}) => ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    nativeEvent: { text: '' },
    ...overrides,
  }),

  // Helper to create mock props
  createMockProps: (overrides = {}) => ({
    ...overrides,
  }),

  // Helper for async testing
  waitForNextTick: () => new Promise((resolve) => setTimeout(resolve, 0)),

  // Helper to mock API responses
  mockApiSuccess: (data: any) => Promise.resolve({ data }),
  mockApiError: (error: string) => Promise.reject(new Error(error)),

  // Helper for React Native testing
  mockNavigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
  },

  mockRoute: {
    params: {},
    key: 'test-route',
    name: 'TestScreen',
  },
};