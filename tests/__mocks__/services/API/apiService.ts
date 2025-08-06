// Manual mock for ApiService
const mockTokenService = {
  getToken: jest.fn(),
  setToken: jest.fn(),
  removeToken: jest.fn(),
};

const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  getProfile: jest.fn(),
  googleAuth: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  getVerificationStatus: jest.fn(),
  validateUsername: jest.fn(),
};

const mockApiService = {
  token: mockTokenService,
  auth: mockAuthService,
  checkConnection: jest.fn(),
  cancelAllRequests: jest.fn(),
};

// Export the mock instance as default
export default mockApiService;

// Export the same instances that are used in the default export
export { mockTokenService, mockAuthService };