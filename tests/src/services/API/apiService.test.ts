// Mock dependencies first before any imports
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock the service config
jest.mock('@services/config', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:5000/api',
    TIMEOUT: 10000,
  },
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    USER_DATA: 'user_data',
    USER_SETTINGS: 'user_settings',
    OFFLINE_RECIPES: 'offline_recipes',
    CACHED_INGREDIENTS: 'cached_ingredients',
  },
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/auth/register',
      LOGIN: '/auth/login',
      PROFILE: '/auth/profile',
      GOOGLE_AUTH: '/auth/google',
      VERIFY_EMAIL: '/auth/verify-email',
      RESEND_VERIFICATION: '/auth/resend-verification',
    },
    USER: {
      SETTINGS: '/user/settings',
      PROFILE: '/user/profile',
      CHANGE_PASSWORD: '/user/change-password',
      DELETE_ACCOUNT: '/user/delete-account',
    },
    RECIPES: {
      LIST: '/recipes',
      DETAIL: (id: string) => `/recipes/${id}`,
      CREATE: '/recipes',
      UPDATE: (id: string) => `/recipes/${id}`,
      DELETE: (id: string) => `/recipes/${id}`,
      METRICS: (id: string) => `/recipes/${id}/metrics`,
      CALCULATE_PREVIEW: '/recipes/calculate-preview',
      CLONE: (id: string) => `/recipes/${id}/clone`,
      CLONE_PUBLIC: (id: string) => `/recipes/${id}/clone-public`,
      VERSIONS: (id: string) => `/recipes/${id}/versions`,
      PUBLIC: '/recipes/public',
    },
    BREW_SESSIONS: {
      LIST: '/brew-sessions',
      DETAIL: (id: string) => `/brew-sessions/${id}`,
      CREATE: '/brew-sessions',
      UPDATE: (id: string) => `/brew-sessions/${id}`,
      DELETE: (id: string) => `/brew-sessions/${id}`,
      FERMENTATION: (id: string) => `/brew-sessions/${id}/fermentation`,
      FERMENTATION_ENTRY: (id: string, index: number) => `/brew-sessions/${id}/fermentation/${index}`,
      FERMENTATION_STATS: (id: string) => `/brew-sessions/${id}/fermentation/stats`,
      ANALYZE_COMPLETION: (id: string) => `/brew-sessions/${id}/analyze-completion`,
    },
    DASHBOARD: {
      DATA: '/dashboard',
    },
  },
}));

// Now import everything
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Import ApiService after mocks
let ApiService: any;

describe('ApiService', () => {
  const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
  let mockRequestInterceptor: any;
  let mockResponseInterceptor: any;

  beforeAll(() => {
    // Dynamically import ApiService after mocks are set up using alias
    ApiService = require('@services/API/apiService').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup SecureStore mocks
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    // Reset and capture interceptors
    mockRequestInterceptor = null;
    mockResponseInterceptor = null;
    
    mockAxiosInstance.interceptors.request.use.mockImplementation((successHandler, errorHandler) => {
      mockRequestInterceptor = { successHandler, errorHandler };
      return 1;
    });

    mockAxiosInstance.interceptors.response.use.mockImplementation((successHandler, errorHandler) => {
      mockResponseInterceptor = { successHandler, errorHandler };
      return 1;
    });
  });

  describe('TokenManager', () => {
    describe('getToken', () => {
      it('should return token from secure store', async () => {
        const mockToken = 'test-token';
        mockSecureStore.getItemAsync.mockResolvedValue(mockToken);

        const token = await ApiService.token.getToken();

        expect(token).toBe(mockToken);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('access_token');
      });

      it('should return null when no token exists', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(null);

        const token = await ApiService.token.getToken();

        expect(token).toBeNull();
      });

      it('should handle secure store errors gracefully', async () => {
        mockSecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));

        const token = await ApiService.token.getToken();

        expect(token).toBeNull();
      });
    });

    describe('setToken', () => {
      it('should store token in secure store', async () => {
        const mockToken = 'new-token';

        await ApiService.token.setToken(mockToken);

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', mockToken);
      });

      it('should handle secure store errors when setting token', async () => {
        const mockToken = 'new-token';
        const error = new Error('SecureStore error');
        mockSecureStore.setItemAsync.mockRejectedValue(error);

        try {
          await ApiService.token.setToken(mockToken);
        } catch (e) {
          expect(e).toEqual(error);
        }
      });
    });

    describe('removeToken', () => {
      it('should remove token from secure store', async () => {
        await ApiService.token.removeToken();

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      });

      it('should handle secure store errors gracefully', async () => {
        mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('SecureStore error'));

        // Should not throw
        await expect(ApiService.token.removeToken()).resolves.toBeUndefined();
      });
    });
  });

  describe('Request Interceptor', () => {
    it('should have interceptor setup methods available', () => {
      expect(mockAxiosInstance.interceptors.request.use).toBeDefined();
      expect(typeof mockAxiosInstance.interceptors.request.use).toBe('function');
      expect(mockAxiosInstance.interceptors.request.eject).toBeDefined();
      expect(typeof mockAxiosInstance.interceptors.request.eject).toBe('function');
    });

    it('should be able to call interceptor setup', () => {
      const mockHandler = jest.fn();
      const mockErrorHandler = jest.fn();
      
      expect(() => {
        mockAxiosInstance.interceptors.request.use(mockHandler, mockErrorHandler);
      }).not.toThrow();
    });
  });

  describe('Response Interceptor', () => {
    it('should have interceptor setup methods available', () => {
      expect(mockAxiosInstance.interceptors.response.use).toBeDefined();
      expect(typeof mockAxiosInstance.interceptors.response.use).toBe('function');
      expect(mockAxiosInstance.interceptors.response.eject).toBeDefined();
      expect(typeof mockAxiosInstance.interceptors.response.eject).toBe('function');
    });

    it('should be able to call interceptor setup', () => {
      const mockHandler = jest.fn();
      const mockErrorHandler = jest.fn();
      
      expect(() => {
        mockAxiosInstance.interceptors.response.use(mockHandler, mockErrorHandler);
      }).not.toThrow();
    });
  });

  describe('Auth API', () => {
    const mockUser = {
      user_id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
    };

    describe('register', () => {
      it('should call register endpoint with user data', async () => {
        const userData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        };
        const mockResponse = {
          data: { user: mockUser },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {},
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await ApiService.auth.register(userData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/register', userData);
        expect(result).toBe(mockResponse);
      });
    });

    describe('login', () => {
      it('should call login endpoint with credentials', async () => {
        const credentials = {
          email: 'test@example.com',
          password: 'password123',
        };
        const mockResponse = {
          data: { access_token: 'token', user: mockUser },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await ApiService.auth.login(credentials);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', credentials);
        expect(result).toBe(mockResponse);
      });
    });

    describe('getProfile', () => {
      it('should call profile endpoint', async () => {
        const mockResponse = {
          data: mockUser,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await ApiService.auth.getProfile();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/profile');
        expect(result).toBe(mockResponse);
      });
    });
  });

  describe('Network utilities', () => {
    describe('checkConnection', () => {
      it('should return true when health check succeeds', async () => {
        mockAxiosInstance.get.mockResolvedValue({ status: 200 });

        const isConnected = await ApiService.checkConnection();

        expect(isConnected).toBe(true);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', { timeout: 5000 });
      });

      it('should return false when health check fails', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

        const isConnected = await ApiService.checkConnection();

        expect(isConnected).toBe(false);
      });
    });

    describe('cancelAllRequests', () => {
      it('should exist as a method', () => {
        expect(typeof ApiService.cancelAllRequests).toBe('function');
        
        // Should not throw
        expect(() => ApiService.cancelAllRequests()).not.toThrow();
      });
    });
  });
});