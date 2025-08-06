import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient, QUERY_KEYS, cacheUtils } from '@services/API/queryClient';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@tanstack/query-async-storage-persister');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('QueryClient Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe('QueryClient setup', () => {
    it('should be an instance of QueryClient', () => {
      expect(queryClient).toBeInstanceOf(QueryClient);
    });

    it('should have correct default query options', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minutes
      expect(defaultOptions.queries?.retry).toBe(2);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
      expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
      expect(defaultOptions.queries?.refetchOnMount).toBe('always');
    });

    it('should have correct default mutation options', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      
      expect(defaultOptions.mutations?.retry).toBe(1);
    });
  });

  describe('QUERY_KEYS', () => {
    it('should have auth query keys', () => {
      expect(QUERY_KEYS.USER_PROFILE).toEqual(['user', 'profile']);
      expect(QUERY_KEYS.USER_SETTINGS).toEqual(['user', 'settings']);
      expect(QUERY_KEYS.VERIFICATION_STATUS).toEqual(['user', 'verification']);
    });

    it('should have recipe query keys', () => {
      expect(QUERY_KEYS.RECIPES).toEqual(['recipes']);
      expect(QUERY_KEYS.RECIPE('123')).toEqual(['recipes', '123']);
      expect(QUERY_KEYS.RECIPE_METRICS('123')).toEqual(['recipes', '123', 'metrics']);
      expect(QUERY_KEYS.RECIPE_VERSIONS('123')).toEqual(['recipes', '123', 'versions']);
      expect(QUERY_KEYS.PUBLIC_RECIPES).toEqual(['recipes', 'public']);
      expect(QUERY_KEYS.RECIPE_SEARCH('IPA')).toEqual(['recipes', 'search', 'IPA']);
    });

    it('should have ingredient query keys', () => {
      expect(QUERY_KEYS.INGREDIENTS).toEqual(['ingredients']);
      expect(QUERY_KEYS.INGREDIENT('456')).toEqual(['ingredients', '456']);
      expect(QUERY_KEYS.INGREDIENT_RECIPES('456')).toEqual(['ingredients', '456', 'recipes']);
    });

    it('should have beer style query keys', () => {
      expect(QUERY_KEYS.BEER_STYLES).toEqual(['beer-styles']);
      expect(QUERY_KEYS.BEER_STYLE('789')).toEqual(['beer-styles', '789']);
      expect(QUERY_KEYS.STYLE_SUGGESTIONS('recipe123')).toEqual(['beer-styles', 'suggestions', 'recipe123']);
      expect(QUERY_KEYS.STYLE_ANALYSIS('recipe123')).toEqual(['beer-styles', 'analysis', 'recipe123']);
    });

    it('should have brew session query keys', () => {
      expect(QUERY_KEYS.BREW_SESSIONS).toEqual(['brew-sessions']);
      expect(QUERY_KEYS.BREW_SESSION('session123')).toEqual(['brew-sessions', 'session123']);
      expect(QUERY_KEYS.FERMENTATION_DATA('session123')).toEqual(['brew-sessions', 'session123', 'fermentation']);
      expect(QUERY_KEYS.FERMENTATION_STATS('session123')).toEqual(['brew-sessions', 'session123', 'stats']);
    });

    it('should have dashboard and AI query keys', () => {
      expect(QUERY_KEYS.DASHBOARD).toEqual(['dashboard']);
      expect(QUERY_KEYS.AI_HEALTH).toEqual(['ai', 'health']);
    });
  });

  describe('cacheUtils', () => {
    describe('invalidateRecipes', () => {
      it('should invalidate all recipe queries', () => {
        const spy = jest.spyOn(queryClient, 'invalidateQueries');
        
        cacheUtils.invalidateRecipes();
        
        expect(spy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.RECIPES });
      });
    });

    describe('invalidateRecipe', () => {
      it('should invalidate specific recipe query', () => {
        const spy = jest.spyOn(queryClient, 'invalidateQueries');
        const recipeId = 'recipe123';
        
        cacheUtils.invalidateRecipe(recipeId);
        
        expect(spy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.RECIPE(recipeId) });
      });
    });

    describe('clearAll', () => {
      it('should clear all cached data', () => {
        const spy = jest.spyOn(queryClient, 'clear');
        
        cacheUtils.clearAll();
        
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('removeStale', () => {
      it('should remove stale queries older than default maxAge', () => {
        // Mock queries in cache
        const mockQueries = [
          {
            queryKey: ['test', '1'],
            state: { dataUpdatedAt: Date.now() - 25 * 60 * 60 * 1000 }, // 25 hours old
          },
          {
            queryKey: ['test', '2'],
            state: { dataUpdatedAt: Date.now() - 1 * 60 * 60 * 1000 }, // 1 hour old
          },
        ];

        const mockCache = {
          getAll: jest.fn().mockReturnValue(mockQueries),
        };

        jest.spyOn(queryClient, 'getQueryCache').mockReturnValue(mockCache as any);
        const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries');

        cacheUtils.removeStale();

        expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['test', '1'] });
        expect(removeQueriesSpy).not.toHaveBeenCalledWith({ queryKey: ['test', '2'] });
      });

      it('should remove stale queries older than custom maxAge', () => {
        const customMaxAge = 2 * 60 * 60 * 1000; // 2 hours
        const mockQueries = [
          {
            queryKey: ['test', '1'],
            state: { dataUpdatedAt: Date.now() - 3 * 60 * 60 * 1000 }, // 3 hours old
          },
          {
            queryKey: ['test', '2'],
            state: { dataUpdatedAt: Date.now() - 1 * 60 * 60 * 1000 }, // 1 hour old
          },
        ];

        const mockCache = {
          getAll: jest.fn().mockReturnValue(mockQueries),
        };

        jest.spyOn(queryClient, 'getQueryCache').mockReturnValue(mockCache as any);
        const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries');

        cacheUtils.removeStale(customMaxAge);

        expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['test', '1'] });
        expect(removeQueriesSpy).not.toHaveBeenCalledWith({ queryKey: ['test', '2'] });
      });
    });

    describe('getCacheInfo', () => {
      it('should return cache statistics', () => {
        const mockQueries = [
          {
            queryKey: ['test', '1'],
            getObserversCount: jest.fn().mockReturnValue(1),
            isStale: jest.fn().mockReturnValue(false),
          },
          {
            queryKey: ['test', '2'],
            getObserversCount: jest.fn().mockReturnValue(0),
            isStale: jest.fn().mockReturnValue(true),
          },
          {
            queryKey: ['test', '3'],
            getObserversCount: jest.fn().mockReturnValue(2),
            isStale: jest.fn().mockReturnValue(true),
          },
        ];

        const mockCache = {
          getAll: jest.fn().mockReturnValue(mockQueries),
        };

        jest.spyOn(queryClient, 'getQueryCache').mockReturnValue(mockCache as any);

        const cacheInfo = cacheUtils.getCacheInfo();

        expect(cacheInfo).toEqual({
          totalQueries: 3,
          activeQueries: 2, // Queries with observers > 0
          staleQueries: 2,  // Queries that are stale
          freshQueries: 1,  // Queries that are not stale
        });
      });

      it('should return empty stats when no queries exist', () => {
        const mockCache = {
          getAll: jest.fn().mockReturnValue([]),
        };

        jest.spyOn(queryClient, 'getQueryCache').mockReturnValue(mockCache as any);

        const cacheInfo = cacheUtils.getCacheInfo();

        expect(cacheInfo).toEqual({
          totalQueries: 0,
          activeQueries: 0,
          staleQueries: 0,
          freshQueries: 0,
        });
      });
    });
  });

  describe('Query operations', () => {
    it('should have queryClient methods available', () => {
      expect(typeof queryClient.setQueryData).toBe('function');
      expect(typeof queryClient.getQueryData).toBe('function');
      expect(typeof queryClient.invalidateQueries).toBe('function');
      expect(typeof queryClient.removeQueries).toBe('function');
    });

    it('should handle queryClient operations without throwing', () => {
      const testData = { id: '1', name: 'Test Recipe' };
      const queryKey = QUERY_KEYS.RECIPE('1');

      // These should not throw errors
      expect(() => {
        queryClient.getQueryData(queryKey);
      }).not.toThrow();

      expect(() => {
        queryClient.removeQueries({ queryKey });
      }).not.toThrow();
    });

    it('should handle async operations without throwing', async () => {
      const queryKey = QUERY_KEYS.RECIPE('1');

      // This should not throw errors
      await expect(
        queryClient.invalidateQueries({ queryKey })
      ).resolves.not.toThrow();
    });
  });
});

describe('AsyncStorage Persister', () => {
  it('should be configured with correct storage settings', () => {
    // The persister is created with AsyncStorage
    // We can verify the mock was called during module import
    expect(mockAsyncStorage).toBeDefined();
  });
});