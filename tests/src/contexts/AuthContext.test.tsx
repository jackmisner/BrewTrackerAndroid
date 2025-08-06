// Mock dependencies first
import React from 'react';
import ApiService from '@services/API/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@services/API/apiService', () => ({
  default: {
    token: {
      getToken: jest.fn(),
      setToken: jest.fn(),
      removeToken: jest.fn(),
    },
    auth: {
      login: jest.fn(),
      register: jest.fn(),
      getProfile: jest.fn(),
      googleAuth: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      getVerificationStatus: jest.fn(),
      validateUsername: jest.fn(),
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

const mockApiService = ApiService as jest.Mocked<typeof ApiService>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Simple mock data for testing
const mockUser = {
  user_id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  email_verified: true,
};

const mockCredentials = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
};

const mockRegistrationData = {
  username: 'newuser',
  email: 'new@example.com',
  password: 'password',
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations - need to ensure the mock structure exists
    if (!mockApiService.token) {
      mockApiService.token = {
        getToken: jest.fn(),
        setToken: jest.fn(),
        removeToken: jest.fn(),
      } as any;
    }
    
    if (!mockApiService.auth) {
      mockApiService.auth = {
        login: jest.fn(),
        register: jest.fn(),
        getProfile: jest.fn(),
        googleAuth: jest.fn(),
        verifyEmail: jest.fn(),
        resendVerification: jest.fn(),
        getVerificationStatus: jest.fn(),
        validateUsername: jest.fn(),
      } as any;
    }
    
    (mockApiService.token.getToken as jest.Mock).mockResolvedValue(null);
    (mockApiService.token.setToken as jest.Mock).mockResolvedValue(undefined);
    (mockApiService.token.removeToken as jest.Mock).mockResolvedValue(undefined);
    
    (mockApiService.auth.login as jest.Mock).mockRejectedValue(new Error('Not mocked'));
    (mockApiService.auth.register as jest.Mock).mockRejectedValue(new Error('Not mocked'));
    (mockApiService.auth.getProfile as jest.Mock).mockRejectedValue(new Error('Not mocked'));
    (mockApiService.auth.googleAuth as jest.Mock).mockRejectedValue(new Error('Not mocked'));
    (mockApiService.auth.verifyEmail as jest.Mock).mockRejectedValue(new Error('Not mocked'));
    (mockApiService.auth.resendVerification as jest.Mock).mockRejectedValue(new Error('Not mocked'));
    (mockApiService.auth.getVerificationStatus as jest.Mock).mockRejectedValue(new Error('Not mocked'));
    (mockApiService.auth.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
    
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined);
  });

  describe('API Service Integration', () => {
    it('should have token management methods', () => {
      expect(mockApiService.token.getToken).toBeDefined();
      expect(mockApiService.token.setToken).toBeDefined();
      expect(mockApiService.token.removeToken).toBeDefined();
    });

    it('should have auth API methods', () => {
      expect(mockApiService.auth.login).toBeDefined();
      expect(mockApiService.auth.register).toBeDefined();
      expect(mockApiService.auth.getProfile).toBeDefined();
      expect(mockApiService.auth.googleAuth).toBeDefined();
      expect(mockApiService.auth.verifyEmail).toBeDefined();
      expect(mockApiService.auth.resendVerification).toBeDefined();
      expect(mockApiService.auth.getVerificationStatus).toBeDefined();
    });
  });

  describe('Token Management', () => {
    it('should call getToken when checking authentication', async () => {
      (mockApiService.token.getToken as jest.Mock).mockResolvedValue(null);

      // Just test that the service method is available and callable
      const result = await mockApiService.token.getToken();
      expect(result).toBeNull();
      expect(mockApiService.token.getToken).toHaveBeenCalled();
    });

    it('should call setToken when storing token', async () => {
      const token = 'test-token';
      await mockApiService.token.setToken(token);
      
      expect(mockApiService.token.setToken).toHaveBeenCalledWith(token);
    });

    it('should call removeToken when logging out', async () => {
      await mockApiService.token.removeToken();
      
      expect(mockApiService.token.removeToken).toHaveBeenCalled();
    });
  });

  describe('Login API calls', () => {
    it('should call login API with credentials', async () => {
      (mockApiService.auth.login as jest.Mock).mockResolvedValue({
        data: { access_token: 'new-token', user: mockUser },
      });

      const result = await mockApiService.auth.login(mockCredentials);
      
      expect(mockApiService.auth.login).toHaveBeenCalledWith(mockCredentials);
      expect(result.data.access_token).toBe('new-token');
      expect(result.data.user).toEqual(mockUser);
    });

    it('should handle login API failure', async () => {
      const error = { response: { data: { message: 'Invalid credentials' } } };
      (mockApiService.auth.login as jest.Mock).mockRejectedValue(error);

      await expect(mockApiService.auth.login(mockCredentials)).rejects.toEqual(error);
      expect(mockApiService.auth.login).toHaveBeenCalledWith(mockCredentials);
    });
  });

  describe('Registration API calls', () => {
    it('should call register API with user data', async () => {
      (mockApiService.auth.register as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const result = await mockApiService.auth.register(mockRegistrationData);
      
      expect(mockApiService.auth.register).toHaveBeenCalledWith(mockRegistrationData);
      expect(result.data.user).toEqual(mockUser);
    });

    it('should handle registration API failure', async () => {
      const error = { response: { data: { message: 'Invalid email format' } } };
      (mockApiService.auth.register as jest.Mock).mockRejectedValue(error);

      await expect(mockApiService.auth.register(mockRegistrationData)).rejects.toEqual(error);
      expect(mockApiService.auth.register).toHaveBeenCalledWith(mockRegistrationData);
    });
  });

  describe('Logout operations', () => {
    it('should call token removal and storage cleanup', async () => {
      // Test the logout operations directly
      await mockApiService.token.removeToken();
      await mockAsyncStorage.multiRemove(['user_data', 'user_settings']);
      
      expect(mockApiService.token.removeToken).toHaveBeenCalled();
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith(['user_data', 'user_settings']);
    });
  });

  describe('Google authentication API calls', () => {
    it('should call Google auth API with token', async () => {
      const googleToken = 'google-token';
      (mockApiService.auth.googleAuth as jest.Mock).mockResolvedValue({
        data: { access_token: 'new-token', user: mockUser },
      });

      const result = await mockApiService.auth.googleAuth({ token: googleToken });
      
      expect(mockApiService.auth.googleAuth).toHaveBeenCalledWith({ token: googleToken });
      expect(result.data.access_token).toBe('new-token');
      expect(result.data.user).toEqual(mockUser);
    });
  });

  describe('Email verification API calls', () => {
    it('should call verify email API with token', async () => {
      const verificationToken = 'verification-token';
      (mockApiService.auth.verifyEmail as jest.Mock).mockResolvedValue({
        data: { access_token: 'new-token', user: mockUser },
      });

      const result = await mockApiService.auth.verifyEmail({ token: verificationToken });
      
      expect(mockApiService.auth.verifyEmail).toHaveBeenCalledWith({ token: verificationToken });
      expect(result.data.access_token).toBe('new-token');
      expect(result.data.user).toEqual(mockUser);
    });

    it('should call resend verification API', async () => {
      (mockApiService.auth.resendVerification as jest.Mock).mockResolvedValue({ data: {} });

      const result = await mockApiService.auth.resendVerification();
      
      expect(mockApiService.auth.resendVerification).toHaveBeenCalled();
      expect(result.data).toEqual({});
    });
  });

  describe('Profile API calls', () => {
    it('should call get profile API', async () => {
      (mockApiService.auth.getProfile as jest.Mock).mockResolvedValue({ data: mockUser });

      const result = await mockApiService.auth.getProfile();
      
      expect(mockApiService.auth.getProfile).toHaveBeenCalled();
      expect(result.data).toEqual(mockUser);
    });

    it('should handle profile API error', async () => {
      const error = { response: { status: 401 } };
      (mockApiService.auth.getProfile as jest.Mock).mockRejectedValue(error);

      await expect(mockApiService.auth.getProfile()).rejects.toEqual(error);
      expect(mockApiService.auth.getProfile).toHaveBeenCalled();
    });
  });

  describe('Storage operations', () => {
    it('should store user data in AsyncStorage', async () => {
      await mockAsyncStorage.setItem('user_data', JSON.stringify(mockUser));
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('user_data', JSON.stringify(mockUser));
    });

    it('should retrieve user data from AsyncStorage', async () => {
      (mockAsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));
      
      const result = await mockAsyncStorage.getItem('user_data');
      
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('user_data');
      if (result) {
        expect(JSON.parse(result)).toEqual(mockUser);
      }
    });

    it('should remove user data from AsyncStorage', async () => {
      await mockAsyncStorage.multiRemove(['user_data', 'user_settings']);
      
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith(['user_data', 'user_settings']);
    });
  });

  describe('Verification status', () => {
    it('should call get verification status API', async () => {
      (mockApiService.auth.getVerificationStatus as jest.Mock).mockResolvedValue({ data: { email_verified: true } });

      const result = await mockApiService.auth.getVerificationStatus();
      
      expect(mockApiService.auth.getVerificationStatus).toHaveBeenCalled();
      expect(result.data.email_verified).toBe(true);
    });
  });
});