import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialAuthState?: {
    isAuthenticated: boolean;
    user: any | null;
    token: string | null;
  };
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  {
    // React Query options
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),

    // Initial auth state
    initialAuthState = {
      isAuthenticated: false,
      user: null,
      token: null,
    },

    // Other options
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock data factories for Android app
export const mockData = {
  // Counter for deterministic ingredient IDs
  _ingredientCounter: 0,
  recipe: (overrides: Record<string, any> = {}) => ({
    id: 'test-id',
    recipe_id: 'test-recipe-id',
    name: 'Test Recipe',
    style: 'IPA',
    batch_size: 5,
    batch_size_unit: 'gal' as const,
    boil_time: 60,
    efficiency: 75,
    is_public: false,
    version: 1,
    estimated_og: 1.065,
    estimated_fg: 1.012,
    estimated_abv: 6.9,
    estimated_ibu: 65,
    estimated_srm: 6.5,
    ingredients: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    description: 'A test recipe for unit testing',
    notes: 'Test notes',
    author: 'testuser',
    ...overrides,
  }),

  brewSession: (overrides: Record<string, any> = {}) => ({
    session_id: 'test-session-id',
    name: 'Test Brew Session',
    recipe_id: 'test-recipe-id',
    status: 'fermenting',
    brew_date: '2024-01-15T00:00:00Z',
    actual_og: 1.064,
    actual_fg: null,
    actual_abv: null,
    notes: 'Test brew session notes',
    fermentation_data: [],
    ...overrides,
  }),

  ingredient: (type: string = 'grain', overrides: Record<string, any> = {}) => {
    // Use deterministic counter for consistent test IDs
    mockData._ingredientCounter++;
    
    return {
      id: `test-ingredient-${mockData._ingredientCounter}`,
      ingredient_id: 1,
      name: 'Test Ingredient',
      type,
      amount: 1,
      unit: type === 'grain' ? 'lb' : type === 'hop' ? 'oz' : 'pkg',
      ...(type === 'grain' && {
        grain_type: 'base_malt',
        potential: 1.037,
        color: 2,
      }),
      ...(type === 'hop' && {
        alpha_acid: 5.5,
        use: 'boil',
        time: 60,
      }),
      ...(type === 'yeast' && {
        attenuation: 81,
      }),
      ...overrides,
    };
  },

  user: (overrides: Record<string, any> = {}) => ({
    user_id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    display_name: 'Test User',
    avatar_url: null,
    ...overrides,
  }),

  authUser: (overrides: Record<string, any> = {}) => ({
    isAuthenticated: true,
    user: mockData.user(overrides.user || {}),
    token: 'mock-jwt-token',
    ...overrides,
  }),
};

// Common test scenarios
export const scenarios = {
  // Simulate loading state
  loading: () => new Promise(() => {}),

  // Simulate successful API response
  success: (data: any) => Promise.resolve({ data }),

  // Simulate API error
  error: (message: string = 'API Error') => Promise.reject(new Error(message)),

  // Simulate network error
  networkError: () => Promise.reject(new Error('Network Error')),

  // Simulate validation error
  validationError: (errors: string[] = ['Validation failed']) =>
    Promise.reject({
      response: {
        status: 400,
        data: { error: 'Validation failed', errors },
      },
    }),

  // Simulate authentication error
  authError: () =>
    Promise.reject({
      response: {
        status: 401,
        data: { error: 'Authentication required' },
      },
    }),
};

// Mock navigation helpers
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  canGoBack: jest.fn(() => false),
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

export const mockRoute = {
  params: {},
  key: 'test-route',
  name: 'TestScreen',
};

// Common test utilities for React Native
export const testUtils = {
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
  createMockNavigation: (overrides = {}) => ({
    ...mockNavigation,
    ...overrides,
  }),

  createMockRoute: (overrides = {}) => ({
    ...mockRoute,
    ...overrides,
  }),

  // Helper to create authenticated test state
  createAuthenticatedState: (userOverrides = {}) => ({
    isAuthenticated: true,
    user: mockData.user(userOverrides),
    token: 'mock-jwt-token',
  }),

  // Helper to create unauthenticated test state
  createUnauthenticatedState: () => ({
    isAuthenticated: false,
    user: null,
    token: null,
  }),

  // Helper to reset mock data counters for deterministic tests
  resetCounters: () => {
    mockData._ingredientCounter = 0;
  },
};

// Re-export testing library utilities
export * from '@testing-library/react-native';
export { fireEvent } from '@testing-library/react-native';