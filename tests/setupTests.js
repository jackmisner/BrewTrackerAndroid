// Basic test setup file
/* eslint-disable no-undef */
import "react-native-gesture-handler/jestSetup";

// Mock React Native modules - don't create circular dependency
jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    ScrollView: "ScrollView",
    TouchableOpacity: "TouchableOpacity",
    Switch: "Switch",
    ActivityIndicator: "ActivityIndicator",
    RefreshControl: "RefreshControl",
    Alert: {
      alert: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn(styles => styles),
      flatten: jest.fn(styles => styles),
    },
    Platform: {
      OS: "ios",
      select: jest.fn(obj => obj.ios || obj.default),
    },
    StatusBar: {
      currentHeight: 24,
    },
    Appearance: {
      getColorScheme: jest.fn(() => "light"),
      addChangeListener: jest.fn(_listener => ({ remove: jest.fn() })),
      removeChangeListener: jest.fn(_listener => {}),
    },
  };
});

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

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () => ({
  default: {
    fetch: jest.fn(() =>
      Promise.resolve({
        type: "wifi",
        isConnected: true,
        isInternetReachable: true,
        details: {
          ipAddress: "192.168.1.1",
          subnet: "255.255.255.0",
          ssid: "MockWiFi",
          bssid: "00:00:00:00:00:00",
          strength: -50,
          frequency: 2450,
        },
      })
    ),
    addEventListener: jest.fn(listener => {
      // Immediately call listener with connected state
      listener({
        type: "wifi",
        isConnected: true,
        isInternetReachable: true,
        details: {
          ipAddress: "192.168.1.1",
          subnet: "255.255.255.0",
          ssid: "MockWiFi",
          bssid: "00:00:00:00:00:00",
          strength: -50,
          frequency: 2450,
        },
      });
      // Return unsubscribe function
      return jest.fn();
    }),
    useNetInfo: jest.fn(() => ({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      details: {
        ipAddress: "192.168.1.1",
        subnet: "255.255.255.0",
        ssid: "MockWiFi",
        bssid: "00:00:00:00:00:00",
        strength: -50,
        frequency: 2450,
      },
    })),
  },
  NetInfoStateType: {
    wifi: "wifi",
    cellular: "cellular",
    ethernet: "ethernet",
    bluetooth: "bluetooth",
    other: "other",
    unknown: "unknown",
    none: "none",
  },
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
  documentDirectory: "file://documents/",
  cacheDirectory: "file://cache/",
  bundleDirectory: "file://bundle/",
  readAsStringAsync: jest.fn().mockResolvedValue("mock file content"),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({
    exists: true,
    isDirectory: false,
    size: 1024,
    modificationTime: Date.now(),
  }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  StorageAccessFramework: {
    pickDirectoryAsync: jest.fn().mockResolvedValue({
      uri: "content://mock-directory",
      name: "MockDirectory",
    }),
  },
  // Legacy API classes for compatibility
  File: jest.fn().mockImplementation((path, filename) => ({
    uri:
      typeof path === "string"
        ? `${path}/${filename || "mockfile.txt"}`
        : `${path}/${filename || "mockfile.txt"}`,
    exists: true,
    create: jest.fn().mockResolvedValue(undefined),
    write: jest.fn().mockResolvedValue(undefined),
    text: jest.fn().mockResolvedValue("mock file content"),
    delete: jest.fn().mockResolvedValue(undefined),
  })),
  Directory: {
    pickDirectoryAsync: jest.fn().mockResolvedValue({
      uri: "content://mock-directory",
      name: "MockDirectory",
    }),
  },
  Paths: {
    cache: "file://cache/",
    document: "file://documents/",
    bundle: "file://bundle/",
  },
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
  Redirect: ({ href: _href }) => null,
  Link: ({ children, href: _href }) => children,
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
      version: "1.0.0",
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
    QueryClient: jest.fn().mockImplementation(() => {
      // Create mock storage for query data
      const queryData = new Map();
      const queryCache = {
        queries: [],
        getAll: jest.fn(() => queryCache.queries),
        find: jest.fn(({ queryKey }) => {
          const query = queryCache.queries.find(
            q => JSON.stringify(q.queryKey) === JSON.stringify(queryKey)
          );
          return query;
        }),
      };

      const mockClient = {
        invalidateQueries: jest.fn(),
        setQueryData: jest.fn((queryKey, data) => {
          const keyString = JSON.stringify(queryKey);
          queryData.set(keyString, data);

          // Update or create query in cache
          const existingQueryIndex = queryCache.queries.findIndex(
            q => JSON.stringify(q.queryKey) === keyString
          );

          if (existingQueryIndex >= 0) {
            queryCache.queries[existingQueryIndex].data = data;
          } else {
            queryCache.queries.push({
              queryKey,
              data,
              state: { dataUpdatedAt: Date.now() },
              isStale: jest.fn(() => false),
              getObserversCount: jest.fn(() => 1),
            });
          }

          return data;
        }),
        getQueryData: jest.fn(queryKey => {
          const keyString = JSON.stringify(queryKey);
          return queryData.get(keyString);
        }),
        clear: jest.fn(() => {
          queryData.clear();
          queryCache.queries = [];
        }),
        removeQueries: jest.fn(({ queryKey }) => {
          if (queryKey) {
            const keyString = JSON.stringify(queryKey);
            queryData.delete(keyString);
            queryCache.queries = queryCache.queries.filter(
              q => JSON.stringify(q.queryKey) !== keyString
            );
          }
        }),
        getQueryCache: jest.fn(() => queryCache),
        getDefaultOptions: jest.fn(() => ({
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: "always",
          },
          mutations: {
            retry: 1,
          },
        })),
      };

      return mockClient;
    }),
  };
});

// Mock React Query persist client
jest.mock("@tanstack/react-query-persist-client", () => ({
  PersistQueryClientProvider: ({ children }) => children,
}));

// Mock React Query AsyncStorage persister
jest.mock("@tanstack/query-async-storage-persister", () => ({
  createAsyncStoragePersister: jest.fn(() => ({
    persistClient: jest.fn(),
    removeClient: jest.fn(),
    restoreClient: jest.fn(),
  })),
}));

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

jest.mock("@expo/vector-icons", () => {
  // Create a functional React component that returns null
  const MaterialIcons = props => null;
  // Attach glyphMap as a static property for code that reads MaterialIcons.glyphMap
  MaterialIcons.glyphMap = {};

  return {
    MaterialIcons,
  };
});

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

// Mock NetworkContext
jest.mock("../src/contexts/NetworkContext", () => ({
  NetworkProvider: ({ children }) => children,
  useNetwork: jest.fn(() => ({
    isConnected: true,
    isOffline: false,
    connectionType: "wifi",
    isInternetReachable: true,
    networkDetails: {
      strength: -50,
      ssid: "MockWiFi",
      bssid: "00:00:00:00:00:00",
      frequency: 2450,
      ipAddress: "192.168.1.1",
      subnet: "255.255.255.0",
    },
    refreshNetworkState: jest.fn(),
  })),
}));

// Mock NetworkStatusBanner components
jest.mock("../src/components/NetworkStatusBanner", () => ({
  NetworkStatusBanner: ({ onRetry }) => null, // Don't render anything in tests
  NetworkStatusIndicator: ({ showText, onPress }) => null, // Don't render anything in tests
  default: ({ onRetry }) => null,
}));

// Mock offline recipe hooks
jest.mock("../src/hooks/useOfflineRecipes", () => ({
  useOfflineRecipes: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useOfflineRecipe: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useOfflineCreateRecipe: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  })),
  useOfflineUpdateRecipe: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  })),
  useOfflineDeleteRecipe: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  })),
  useOfflineSyncStatus: jest.fn(() => ({
    data: {
      totalRecipes: 0,
      pendingSync: 0,
      conflicts: 0,
      failedSync: 0,
      lastSync: 0,
    },
    isLoading: false,
    error: null,
  })),
  useOfflineSync: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  })),
  useAutoOfflineSync: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  })),
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
  // Additional ApiService patterns to catch all variations
  /Error \w+ token:/,
  /TokenManager\.error/,
  /at TokenManager\./,
  /at Object\.<anonymous>.*apiService\.test\.ts/,
  // NetworkContext test-related errors
  /Failed to initialize network monitoring:/,
  /Failed to refresh network state:/,
  /Failed to cache network state:/,
  /Failed to load cached network state:/,
  /useNetwork must be used within a NetworkProvider/,
  /at Generator\./,
  /asyncGeneratorStep/,
  /Promise\.then\.completed/,
  /_callCircusTest/,
  /_runTest/,
  /_runTestsForDescribeBlock/,
  /at runTest/,
  /at Object\.log.*tests\/setupTests\.js/,
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
  /Failed to add fermentation entry:/,
  /Failed to update fermentation entry:/,
  /Failed to delete fermentation entry:/,
  /Save failed/,
  /Update failed/,
  /Delete failed/,
  // UnitContext test-related errors
  /Failed to load unit preferences, using default:/,
  /Cannot read properties of undefined \(reading 'data'\)/,
  /Background settings fetch failed:/,
  // Profile screen test errors
  /Failed to open in-app browser:/,
  // Password reset test errors
  /Password reset failed:/,
  // Storage permissions test errors
  /Error requesting media permissions:/,
  /Permission check failed/,
  // BeerXML import/export test errors
  /🍺 BeerXML Import - File selection error:/,
  /🍺 BeerXML Import - Parsing error:/,
  /🍺 BeerXML Import - Error:/,
  /🍺 BeerXML Export - Error:/,
  /🍺 BeerXML Export - Directory choice error:/,
  /🍺 BeerXML Parse - Error:/,
  /🍺 Ingredient Matching - Error:/,
  /Failed to select file/,
  /Invalid file data received/,
  /No recipes found in the BeerXML file/,
  /Invalid XML format/,
  /Test error/,
  /File selection failed/,
  /Service error for testing/,
  /API Error/,
  /No XML content received from server/,
  /Storage write failed/,
  /File not found/,
  /Invalid BeerXML format - missing RECIPES element/,
  /🍺 BeerXML Match - Error:/,
  /Unexpected matchIngredients response shape/,
  /Error refreshing version history:/,
  /Refresh failed/,
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
  /Background settings fetch failed:/,
  // AuthContext test warnings
  /Corrupted cached user data, removing:/,
  /Cache read failed/,
  // BeerXML export test warnings
  /🍺 BeerXML Export - SAF failed, falling back to sharing:/,
  /🍺 BeerXML Parse - No recipes found in response/,
  /🔍 Unknown response structure, returning empty list/,
  /Cannot read properties of undefined \(reading 'granted'\)/,
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
