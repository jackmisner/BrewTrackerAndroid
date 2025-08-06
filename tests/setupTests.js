// Basic test setup file
import 'react-native-gesture-handler/jestSetup';

// Mock React Native modules - don't create circular dependency

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  Redirect: ({ href }) => null,
  Link: ({ children, href }) => children,
  Stack: {
    Screen: ({ children }) => children,
  },
  Tabs: {
    Screen: ({ children }) => children,
  },
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:5000/api',
      },
    },
  },
}));

// Mock Axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })),
    useMutation: jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      error: null,
    })),
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
    })),
    QueryClientProvider: ({ children }) => children,
  };
});

// Create mock storage
const createStorageMock = () => {
  let store = {};

  return {
    getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
    getItemAsync: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key, value) => {
      store[key] = value?.toString() || '';
      return Promise.resolve();
    }),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value?.toString() || '';
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    _getStore: () => store,
    _setStore: (newStore) => {
      store = newStore;
    },
  };
};

global.mockStorage = createStorageMock();

// Global test utilities
global.testUtils = {
  createMockEvent: (overrides = {}) => ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    nativeEvent: { text: '' },
    ...overrides,
  }),
  createMockProps: (overrides = {}) => ({
    ...overrides,
  }),
  waitForNextTick: () => new Promise((resolve) => setTimeout(resolve, 0)),
  mockApiSuccess: (data) => Promise.resolve(data),
  mockApiError: (error) => Promise.reject(new Error(error)),
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

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
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

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array(10)),
    randomUUID: jest.fn().mockReturnValue('mock-uuid'),
  },
});

// Cleanup
afterEach(() => {
  jest.clearAllMocks();
  global.mockStorage.clear();
  global.mockStorage._setStore({});
});

// Suppress console warnings
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('Warning:') ||
    message.includes('validateDOMNesting') ||
    message.includes('React does not recognize')
  )) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('componentWillMount') ||
    message.includes('componentWillReceiveProps')
  )) {
    return;
  }
  originalWarn.apply(console, args);
};