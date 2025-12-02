/**
 * Tests for ImportReviewScreen
 */

import React from "react";
import { renderWithProviders, testUtils } from "@/tests/testUtils";
import ImportReviewScreen from "../../../../app/(modals)/(beerxml)/importReview";
import { TEST_IDS } from "@src/constants/testIDs";

// Mock Appearance
jest.mock("react-native/Libraries/Utilities/Appearance", () => ({
  getColorScheme: jest.fn(() => "light"),
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
}));

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: () => ({
      colors: { primary: "#007AFF", text: "#000", background: "#FFF" },
      fonts: { regular: "System" },
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({
    recipeData: JSON.stringify({
      name: "Test Recipe",
      batch_size: 5,
      batch_size_unit: "gal",
      ingredients: [],
    }),
    filename: "test.xml",
    createdIngredientsCount: "0",
  })),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    QueryClient: jest.fn().mockImplementation(() => ({
      invalidateQueries: jest.fn(),
      clear: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
      isFetching: jest.fn(() => 0),
      isMutating: jest.fn(() => 0),
      defaultOptions: jest.fn(() => ({ queries: { retry: false } })),
      getQueryCache: jest.fn(() => ({
        getAll: jest.fn(() => []),
        find: jest.fn(),
        findAll: jest.fn(() => []),
      })),
      getMutationCache: jest.fn(() => ({
        getAll: jest.fn(() => []),
        find: jest.fn(),
        findAll: jest.fn(() => []),
      })),
      removeQueries: jest.fn(),
      cancelQueries: jest.fn(),
      fetchQuery: jest.fn(),
      prefetchQuery: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
      setQueriesData: jest.fn(),
      getQueriesData: jest.fn(),
    })),
    useQuery: jest.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
    })),
    useMutation: jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      error: null,
    })),
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
    })),
  };
});

jest.mock("@services/api/apiService", () => ({
  default: {
    recipes: {
      calculateMetricsPreview: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock auth context
let mockAuthState = {
  user: { id: "test-user", username: "testuser", email: "test@example.com" },
  isLoading: false,
  isAuthenticated: true,
  error: null,
};

const setMockAuthState = (overrides: Partial<typeof mockAuthState>) => {
  mockAuthState = { ...mockAuthState, ...overrides };
};

jest.mock("@contexts/AuthContext", () => {
  const React = require("react");
  return {
    useAuth: () => mockAuthState,
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock other context providers
jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    useNetwork: () => ({ isConnected: true, isInternetReachable: true }),
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/DeveloperContext", () => {
  const React = require("react");
  return {
    useDeveloper: () => ({ isDeveloperMode: false }),
    DeveloperProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock("@contexts/UnitContext", () => {
  const React = require("react");
  return {
    useUnits: () => ({ unitSystem: "imperial", setUnitSystem: jest.fn() }),
    UnitProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@contexts/CalculatorsContext", () => {
  const React = require("react");
  return {
    useCalculators: () => ({ state: {}, dispatch: jest.fn() }),
    CalculatorsProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

describe("ImportReviewScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
    testUtils.resetCounters();
    setMockAuthState({
      user: {
        id: "test-user",
        username: "testuser",
        email: "test@example.com",
      },
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });
  });

  it("should render without crashing", () => {
    expect(() => renderWithProviders(<ImportReviewScreen />)).not.toThrow();
  });

  it("should display import review title", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getByText("Import Review")).toBeTruthy();
  });

  it("should display recipe name", () => {
    const { getAllByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getAllByText("Test Recipe").length).toBeGreaterThan(0);
  });
});

describe("ImportReviewScreen - Additional UI Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
  });

  it("should display batch size information", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getByText("Batch Size:")).toBeTruthy();
    // The 5.0 and gal are in the same text node together
    expect(getByText("5.0 gal")).toBeTruthy();
  });

  it("should show metrics section", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getByText("Calculated Metrics")).toBeTruthy();
    expect(getByText("No metrics calculated")).toBeTruthy();
  });

  it("should display filename from params", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getByText("test.xml")).toBeTruthy();
  });

  it("should have proper screen structure", () => {
    const { getByTestId } = renderWithProviders(<ImportReviewScreen />);
    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("import-review"))
    ).toBeTruthy();
  });
});

describe("ImportReviewScreen - UI Elements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
  });

  it("should display recipe details section", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);

    expect(getByText("Recipe Details")).toBeTruthy();
    expect(getByText("Name:")).toBeTruthy();
    expect(getByText("Style:")).toBeTruthy();
    expect(getByText("Batch Size:")).toBeTruthy();
  });

  it("should display import summary section", () => {
    const { getByText, getAllByText } = renderWithProviders(
      <ImportReviewScreen />
    );

    expect(getByText("Import Summary")).toBeTruthy();
    expect(getByText("Source File")).toBeTruthy();
    expect(getByText("Recipe")).toBeTruthy();
    // Use getAllByText for Ingredients since it appears twice
    expect(getAllByText("Ingredients").length).toBeGreaterThan(0);
  });

  it("should display action buttons", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);

    expect(getByText("Review Ingredients")).toBeTruthy();
    expect(getByText("Create Recipe")).toBeTruthy();
  });

  it("should show efficiency and boil time", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);

    expect(getByText("Efficiency:")).toBeTruthy();
    expect(getByText("75%")).toBeTruthy(); // efficiency with %
    expect(getByText("Boil Time:")).toBeTruthy();
    expect(getByText("60 minutes")).toBeTruthy(); // boil time with units
  });

  it("should show ingredients section", () => {
    const { getAllByText, getByText } = renderWithProviders(
      <ImportReviewScreen />
    );

    expect(getAllByText("Ingredients").length).toBeGreaterThan(0);
    expect(getByText("0 ingredients")).toBeTruthy(); // count with text
  });
});

describe("ImportReviewScreen - coerceIngredientTime Function", () => {
  // Since coerceIngredientTime is internal, we'll test it indirectly through the component
  it("should handle various ingredient time inputs", () => {
    const mockParams = jest.requireMock("expo-router").useLocalSearchParams;
    mockParams.mockReturnValue({
      recipeData: JSON.stringify({
        name: "Time Test Recipe",
        batch_size: 5,
        batch_size_unit: "gal",
        ingredients: [
          { name: "Hop 1", time: 0 }, // Zero time
          { name: "Hop 2", time: "0" }, // String zero
          { name: "Hop 3", time: "" }, // Empty string
          { name: "Hop 4", time: null }, // Null
          { name: "Hop 5", time: undefined }, // Undefined
          { name: "Hop 6", time: 60 }, // Valid number
        ],
      }),
      filename: "time-test.xml",
      createdIngredientsCount: "6",
    });

    const { getAllByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getAllByText("Time Test Recipe").length).toBeGreaterThan(0);
  });
});

describe("ImportReviewScreen - Advanced UI Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
  });

  it("should display recipe with no specified style", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getByText("Not specified")).toBeTruthy(); // Style not specified
  });

  it("should handle ingredients count display", () => {
    const mockParams = jest.requireMock("expo-router").useLocalSearchParams;
    mockParams.mockReturnValue({
      recipeData: JSON.stringify({
        name: "Test Recipe",
        batch_size: 5,
        batch_size_unit: "gal",
        ingredients: [
          { name: "Hop 1" },
          { name: "Hop 2" },
          { name: "Hop 3" },
          { name: "Hop 4" },
          { name: "Hop 5" },
          { name: "Hop 6" },
        ],
      }),
      filename: "test.xml",
      createdIngredientsCount: "6",
    });

    const { getByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getByText("6 ingredients")).toBeTruthy();
  });

  it("should display multiple UI sections", () => {
    const { getByText, getAllByText } = renderWithProviders(
      <ImportReviewScreen />
    );

    expect(getByText("Import Summary")).toBeTruthy();
    expect(getByText("Recipe Details")).toBeTruthy();
    expect(getByText("Calculated Metrics")).toBeTruthy();
    expect(getAllByText("Ingredients").length).toBeGreaterThan(0);
  });

  it("should show default recipe values", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);

    expect(getByText("60 minutes")).toBeTruthy(); // Default boil time
    expect(getByText("75%")).toBeTruthy(); // Default efficiency
  });

  it("should display import action buttons", () => {
    const { getByText } = renderWithProviders(<ImportReviewScreen />);

    expect(getByText("Review Ingredients")).toBeTruthy();
    expect(getByText("Create Recipe")).toBeTruthy();
  });

  it("should render all component parts", () => {
    const { getByTestId, getAllByRole } = renderWithProviders(
      <ImportReviewScreen />
    );

    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("import-review"))
    ).toBeTruthy();
    // Verify key sections are present
    expect(
      getByTestId(TEST_IDS.patterns.sectionContainer("recipe-details"))
    ).toBeTruthy();
    expect(
      getByTestId(TEST_IDS.patterns.sectionContainer("import-summary"))
    ).toBeTruthy();
  });
});

describe("ImportReviewScreen - Recipe Variations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
  });

  it("should handle recipe with custom values", () => {
    const mockParams = jest.requireMock("expo-router").useLocalSearchParams;
    mockParams.mockReturnValue({
      recipeData: JSON.stringify({
        name: "Custom Recipe",
        batch_size: 10,
        batch_size_unit: "l",
        boil_time: 90,
        efficiency: 80,
        style: "IPA",
        ingredients: [
          { name: "Pilsner Malt", type: "grain" },
          { name: "Cascade", type: "hop" },
        ],
      }),
      filename: "custom.xml",
      createdIngredientsCount: "2",
    });

    const { getAllByText, getByText } = renderWithProviders(
      <ImportReviewScreen />
    );

    expect(getAllByText("Custom Recipe").length).toBeGreaterThan(0);
    expect(getByText("10.0 L")).toBeTruthy(); // Metric batch size (uppercase L)
    expect(getByText("90 minutes")).toBeTruthy(); // Custom boil time
    expect(getByText("80%")).toBeTruthy(); // Custom efficiency
    expect(getByText("IPA")).toBeTruthy(); // Custom style
  });

  it("should show metrics when available", () => {
    const mockUseQuery = jest.requireMock("@tanstack/react-query").useQuery;
    const originalMock = mockUseQuery.getMockImplementation();
    mockUseQuery.mockReturnValue({
      data: {
        og: 1.05,
        fg: 1.01,
        abv: 5.2,
        ibu: 35,
        srm: 8,
      },
      isLoading: false,
      error: null,
    });

    const { getByText } = renderWithProviders(<ImportReviewScreen />);
    expect(getByText("Calculated Metrics")).toBeTruthy();

    // Restore original mock
    mockUseQuery.mockImplementation(originalMock);
  });
});
