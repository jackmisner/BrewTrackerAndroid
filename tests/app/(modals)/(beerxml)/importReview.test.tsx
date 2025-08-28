/**
 * Tests for ImportReviewScreen
 */

import React from "react";
import { render } from "@testing-library/react-native";
import ImportReviewScreen from "../../../../app/(modals)/(beerxml)/importReview";
import { TEST_IDS } from "@constants/testIDs";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: { primary: "#007AFF", text: "#000", background: "#FFF" },
    fonts: { regular: "System" },
  }),
}));

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

jest.mock("@tanstack/react-query", () => ({
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
}));

jest.mock("@services/api/apiService", () => ({
  default: {
    recipes: {
      calculateMetricsPreview: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("ImportReviewScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    expect(() => render(<ImportReviewScreen />)).not.toThrow();
  });

  it("should display import review title", () => {
    const { getByText } = render(<ImportReviewScreen />);
    expect(getByText("Import Review")).toBeTruthy();
  });

  it("should display recipe name", () => {
    const { getAllByText } = render(<ImportReviewScreen />);
    expect(getAllByText("Test Recipe").length).toBeGreaterThan(0);
  });
});

describe("ImportReviewScreen - Additional UI Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display batch size information", () => {
    const { getByText } = render(<ImportReviewScreen />);
    expect(getByText("Batch Size:")).toBeTruthy();
    // The 5.0 and gal are in the same text node together
    expect(getByText("5.0 gal")).toBeTruthy();
  });

  it("should show metrics section", () => {
    const { getByText } = render(<ImportReviewScreen />);
    expect(getByText("Calculated Metrics")).toBeTruthy();
    expect(getByText("No metrics calculated")).toBeTruthy();
  });

  it("should display filename from params", () => {
    const { getByText } = render(<ImportReviewScreen />);
    expect(getByText("test.xml")).toBeTruthy();
  });

  it("should have proper screen structure", () => {
    const { getByTestId } = render(<ImportReviewScreen />);
    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("import-review"))
    ).toBeTruthy();
  });
});

describe("ImportReviewScreen - UI Elements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display recipe details section", () => {
    const { getByText } = render(<ImportReviewScreen />);

    expect(getByText("Recipe Details")).toBeTruthy();
    expect(getByText("Name:")).toBeTruthy();
    expect(getByText("Style:")).toBeTruthy();
    expect(getByText("Batch Size:")).toBeTruthy();
  });

  it("should display import summary section", () => {
    const { getByText, getAllByText } = render(<ImportReviewScreen />);

    expect(getByText("Import Summary")).toBeTruthy();
    expect(getByText("Source File")).toBeTruthy();
    expect(getByText("Recipe")).toBeTruthy();
    // Use getAllByText for Ingredients since it appears twice
    expect(getAllByText("Ingredients").length).toBeGreaterThan(0);
  });

  it("should display action buttons", () => {
    const { getByText } = render(<ImportReviewScreen />);

    expect(getByText("Review Ingredients")).toBeTruthy();
    expect(getByText("Create Recipe")).toBeTruthy();
  });

  it("should show efficiency and boil time", () => {
    const { getByText } = render(<ImportReviewScreen />);

    expect(getByText("Efficiency:")).toBeTruthy();
    expect(getByText("75%")).toBeTruthy(); // efficiency with %
    expect(getByText("Boil Time:")).toBeTruthy();
    expect(getByText("60 minutes")).toBeTruthy(); // boil time with units
  });

  it("should show ingredients section", () => {
    const { getAllByText, getByText } = render(<ImportReviewScreen />);

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

    const { getAllByText } = render(<ImportReviewScreen />);
    expect(getAllByText("Time Test Recipe").length).toBeGreaterThan(0);
  });
});

describe("ImportReviewScreen - Advanced UI Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display recipe with no specified style", () => {
    const { getByText } = render(<ImportReviewScreen />);
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

    const { getByText } = render(<ImportReviewScreen />);
    expect(getByText("6 ingredients")).toBeTruthy();
  });

  it("should display multiple UI sections", () => {
    const { getByText, getAllByText } = render(<ImportReviewScreen />);

    expect(getByText("Import Summary")).toBeTruthy();
    expect(getByText("Recipe Details")).toBeTruthy();
    expect(getByText("Calculated Metrics")).toBeTruthy();
    expect(getAllByText("Ingredients").length).toBeGreaterThan(0);
  });

  it("should show default recipe values", () => {
    const { getByText } = render(<ImportReviewScreen />);

    expect(getByText("60 minutes")).toBeTruthy(); // Default boil time
    expect(getByText("75%")).toBeTruthy(); // Default efficiency
  });

  it("should display import action buttons", () => {
    const { getByText } = render(<ImportReviewScreen />);

    expect(getByText("Review Ingredients")).toBeTruthy();
    expect(getByText("Create Recipe")).toBeTruthy();
  });

  it("should render all component parts", () => {
    const { getByTestId, getAllByRole } = render(<ImportReviewScreen />);

    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("import-review"))
    ).toBeTruthy();
    // expect(getAllByRole("button").length).toBeGreaterThanOrEqual(2);
    // Verify key sections are present
    expect(getByTestId("recipe-details-section")).toBeTruthy();
    expect(getByTestId("import-summary-section")).toBeTruthy();
  });
});

describe("ImportReviewScreen - Recipe Variations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const { getAllByText, getByText } = render(<ImportReviewScreen />);

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

    const { getByText } = render(<ImportReviewScreen />);
    expect(getByText("Calculated Metrics")).toBeTruthy();

    // Restore original mock
    mockUseQuery.mockImplementation(originalMock);
  });
});
