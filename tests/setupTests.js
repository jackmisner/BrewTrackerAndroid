// Basic test setup file
/* eslint-disable no-undef */
import "react-native-gesture-handler/jestSetup";

// Set up environment variables for tests
process.env.EXPO_PUBLIC_API_URL = "http://localhost:5000/api";

// Mock React Native modules - don't create circular dependency

// Mock Expo modules
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock new storage modules
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
  DocumentPickerOptions: {},
}));

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  createAssetAsync: jest.fn(),
  getAlbumAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
  createAlbumAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  cacheDirectory: "file://cache/",
}));

jest.mock("expo-router", () => ({
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

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: "http://localhost:5000/api",
      },
    },
  },
}));

// Mock Axios
jest.mock("axios", () => ({
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
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
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
    getItem: jest.fn(key => Promise.resolve(store[key] || null)),
    getItemAsync: jest.fn(key => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key, value) => {
      store[key] = value?.toString() || "";
      return Promise.resolve();
    }),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value?.toString() || "";
      return Promise.resolve();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn(key => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    multiRemove: jest.fn(keys => {
      keys.forEach(key => delete store[key]);
      return Promise.resolve();
    }),
    _getStore: () => store,
    _setStore: newStore => {
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
    nativeEvent: { text: "" },
    ...overrides,
  }),
  createMockProps: (overrides = {}) => ({
    ...overrides,
  }),
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  mockApiSuccess: data => Promise.resolve(data),
  mockApiError: error => Promise.reject(new Error(error)),
  mockNavigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
  },
  mockRoute: {
    params: {},
    key: "test-route",
    name: "TestScreen",
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
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array(10)),
    randomUUID: jest.fn().mockReturnValue("mock-uuid"),
  },
});

// Mock UUID module
jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid-v4"),
}));

// Mock Expo modules that might not be available in test environment
jest.mock("expo-image", () => ({
  Image: "Image",
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock React Native SVG
jest.mock("react-native-svg", () => {
  const React = require("react");
  return {
    Svg: ({ children, ...props }) =>
      React.createElement("Svg", props, children),
    Circle: props => React.createElement("Circle", props),
    Path: props => React.createElement("Path", props),
    G: ({ children, ...props }) => React.createElement("G", props, children),
    Text: ({ children, ...props }) =>
      React.createElement("Text", props, children),
    Defs: ({ children, ...props }) =>
      React.createElement("Defs", props, children),
    LinearGradient: ({ children, ...props }) =>
      React.createElement("LinearGradient", props, children),
    Stop: props => React.createElement("Stop", props),
  };
});

// Mock React Native Gifted Charts
jest.mock("react-native-gifted-charts", () => ({
  LineChart: "LineChart",
  BarChart: "BarChart",
}));

// Handle unhandled promise rejections from test mocks
const originalUnhandledRejection = process.listeners("unhandledRejection");
let testRejectionHandler;

// Known test error patterns that should not cause test failures
const TEST_ERROR_PATTERNS = [
  // AuthContext test errors
  error =>
    error &&
    typeof error === "object" &&
    error.response &&
    error.response.data &&
    typeof error.response.data.message === "string",
];

const isTestRelatedError = error => {
  return TEST_ERROR_PATTERNS.some(pattern => {
    try {
      return pattern(error);
    } catch {
      return false;
    }
  });
};

testRejectionHandler = (reason, promise) => {
  // If this looks like a test-related error, suppress it
  if (isTestRelatedError(reason)) {
    // Optionally log for debugging
    // console.log('Suppressed test-related unhandled rejection:', reason);
    return;
  }

  // For other errors, let them through to the original handlers
  if (originalUnhandledRejection.length > 0) {
    originalUnhandledRejection.forEach(handler => {
      if (typeof handler === "function") {
        handler(reason, promise);
      }
    });
  } else {
    // If no original handlers, log the error
    console.error("Unhandled Promise Rejection:", reason);
  }
};

// Also add handler for uncaught exceptions that might be related
const originalUncaughtException = process.listeners("uncaughtException");
let testExceptionHandler;

testExceptionHandler = error => {
  // If this looks like a test-related error, suppress it
  if (isTestRelatedError(error)) {
    // console.log('Suppressed test-related uncaught exception:', error);
    return;
  }

  // For other errors, let them through to the original handlers
  if (originalUncaughtException.length > 0) {
    originalUncaughtException.forEach(handler => {
      if (typeof handler === "function") {
        handler(error);
      }
    });
  } else {
    // If no original handlers, log the error
    console.error("Uncaught Exception:", error);
  }
};

process.on("unhandledRejection", testRejectionHandler);
process.on("uncaughtException", testExceptionHandler);

// Cleanup
afterEach(() => {
  jest.clearAllMocks();
  global.mockStorage.clear();
  global.mockStorage._setStore({});
});

// Suppress specific known non-critical console warnings
const originalError = console.error;
const originalWarn = console.warn;

// Known non-critical warning patterns to suppress
const SUPPRESSED_ERROR_PATTERNS = [
  /Warning: React does not recognize the `\w+` prop on a DOM element/,
  /Warning: validateDOMNesting.*?<\w+> cannot appear as a child of <\w+>/,
  /Warning: Failed prop type/,
  /Warning: componentWillReceiveProps has been renamed/,
  /Warning: componentWillMount has been renamed/,
  /Warning: Using UNSAFE_componentWillMount/,
  /Warning: Using UNSAFE_componentWillReceiveProps/,
  /Error (getting|setting|removing) token: Error: SecureStore error/,
  /Error: Network Error/, // Suppress expected network errors in tests
  /Error: Authentication required/, // Suppress expected auth errors in tests
  /Console error suppressed for test/, // Suppress our own test error markers
  /An update to .* inside a test was not wrapped in act/, // React Query + fake timers act() warnings
  // ApiService test-related errors that are intentionally triggered
  /Error getting token: Error: SecureStore error/,
  /Error setting token: Error: Storage failed/,
  /Error removing token: Error: Delete failed/,
  /SecureStore error/,
  /Storage failed/,
  /Delete failed/,
  // AuthContext test-related errors that are intentionally triggered
  /Failed to initialize auth:/,
  /Login failed:/,
  /Registration failed:/,
  /Google sign-in failed:/,
  /Logout failed:/,
  /Failed to refresh user:/,
  /Email verification failed:/,
  /Failed to resend verification:/,
  /Failed to check verification status:/,
  /Failed to send password reset:/,
  /Failed to reset password:/,
  /Invalid credentials/,
  /Username already exists/,
  /Invalid Google token/,
  /Invalid verification token/,
  /Too many requests/,
  /Email not found/,
  /Invalid or expired token/,
  // UnitContext test-related errors
  /Failed to load unit preferences, using default:/,
  /Cannot read properties of undefined \(reading 'data'\)/,
];

const SUPPRESSED_WARN_PATTERNS = [
  /componentWillMount is deprecated/,
  /componentWillReceiveProps is deprecated/,
  /componentWillUpdate is deprecated/,
  /UNSAFE_componentWillMount is deprecated/,
  /UNSAFE_componentWillReceiveProps is deprecated/,
  /UNSAFE_componentWillUpdate is deprecated/,
  /Animated: `useNativeDriver` was not specified/,
  /VirtualizedLists should never be nested/,
  // UnitContext test warnings
  /Failed to load unit preferences, using default:/,
];

console.error = (...args) => {
  const message = args[0];
  let messageString = "";

  if (typeof message === "string") {
    messageString = message;
  } else if (message instanceof Error) {
    messageString = message.message || message.toString();
  } else if (message && typeof message.toString === "function") {
    messageString = message.toString();
  }

  if (messageString) {
    // Check if this error matches any suppressed patterns
    const shouldSuppress = SUPPRESSED_ERROR_PATTERNS.some(pattern =>
      pattern.test(messageString)
    );
    if (shouldSuppress) {
      return;
    }
  }

  // Log all other errors normally
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  let messageString = "";

  if (typeof message === "string") {
    messageString = message;
  } else if (message instanceof Error) {
    messageString = message.message || message.toString();
  } else if (message && typeof message.toString === "function") {
    messageString = message.toString();
  }

  if (messageString) {
    // Check if this warning matches any suppressed patterns
    const shouldSuppress = SUPPRESSED_WARN_PATTERNS.some(pattern =>
      pattern.test(messageString)
    );
    if (shouldSuppress) {
      return;
    }
  }

  // Log all other warnings normally
  originalWarn.apply(console, args);
};
