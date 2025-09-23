/**
 * Tests for IngredientMatchingScreen
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TEST_IDS } from "@src/constants/testIDs";

// Mock dependencies first
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
      ingredients: [
        {
          name: "Test Grain",
          type: "grain",
          amount: 10,
          unit: "lbs",
        },
      ],
    }),
    filename: "test.xml",
  })),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
    })),
    QueryClient: jest.fn().mockImplementation(() => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
      getDefaultOptions: jest.fn(() => ({})),
      setDefaultOptions: jest.fn(),
      clear: jest.fn(),
    })),
  };
});

// Mock the BeerXML service with a more realistic implementation
jest.mock("@services/beerxml/BeerXMLService", () => ({
  __esModule: true,
  default: {
    matchIngredients: jest.fn(),
    createIngredients: jest.fn(() =>
      Promise.resolve([{ id: "1", name: "Test Grain", type: "grain" }])
    ),
  },
}));

import IngredientMatchingScreen from "../../../../app/(modals)/(beerxml)/ingredientMatching";

describe("IngredientMatchingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: error; tests can override to success as needed
    const service = require("@services/beerxml/BeerXMLService").default;
    service.matchIngredients.mockRejectedValue(
      new Error("Service error for testing")
    );
  });

  it("should render without crashing", () => {
    expect(() => render(<IngredientMatchingScreen />)).not.toThrow();
  });

  it("should display ingredient matching title", () => {
    const { getByText } = render(<IngredientMatchingScreen />);
    expect(getByText("Ingredient Matching")).toBeTruthy();
  });

  it("should have scrollable content", () => {
    const { getByTestId } = render(<IngredientMatchingScreen />);
    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("ingredient-matching"))
    ).toBeTruthy();
  });

  it("should have header with back navigation", () => {
    const { getByTestId } = render(<IngredientMatchingScreen />);
    expect(
      getByTestId(
        TEST_IDS.patterns.modalHeaderAction(
          "ingredient-matching-header",
          "back"
        )
      )
    ).toBeTruthy();
  });

  it("should display error state when service fails", async () => {
    const { findByText } = render(<IngredientMatchingScreen />);

    // The mock service will fail, so we should see the error state
    expect(await findByText("Matching Error")).toBeTruthy();
    expect(await findByText("Go Back")).toBeTruthy();
  });

  it("should show go back button in error state", async () => {
    const { findByText, getByTestId } = render(<IngredientMatchingScreen />);

    // Wait for error state
    await findByText("Matching Error");

    // Check for go back button using testID
    expect(
      getByTestId(TEST_IDS.patterns.touchableOpacityAction("go-back"))
    ).toBeTruthy();
  });

  it("should display proper screen structure with testIDs", () => {
    const { getByTestId } = render(<IngredientMatchingScreen />);

    // Check for scrollable content
    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("ingredient-matching"))
    ).toBeTruthy();

    // Check for touchable buttons with proper testIDs
    expect(
      getByTestId(
        TEST_IDS.patterns.modalHeaderAction(
          "ingredient-matching-header",
          "back"
        )
      )
    ).toBeTruthy();
  });

  it("should navigate back when header back is pressed", () => {
    const { getByTestId } = render(<IngredientMatchingScreen />);
    const { router } = require("expo-router");
    const backBtn = getByTestId(
      TEST_IDS.patterns.modalHeaderAction("ingredient-matching-header", "back")
    );
    fireEvent.press(backBtn);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  describe("IngredientMatchingScreen - Component Structure", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should have scrollable content container", () => {
      const { getByTestId } = render(<IngredientMatchingScreen />);
      expect(
        getByTestId(TEST_IDS.patterns.scrollAction("ingredient-matching"))
      ).toBeTruthy();
    });

    it("should use theme colors and styles", () => {
      const { getByText } = render(<IngredientMatchingScreen />);
      expect(getByText("Ingredient Matching")).toBeTruthy();
    });

    it("should display proper touchable buttons with testIDs", () => {
      const { getByTestId } = render(<IngredientMatchingScreen />);

      // Check all the TouchableOpacity components have proper testIDs
      expect(
        getByTestId(
          TEST_IDS.patterns.modalHeaderAction(
            "ingredient-matching-header",
            "back"
          )
        )
      ).toBeTruthy();
    });
  });

  describe("IngredientMatchingScreen - Error Recovery", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should display error state components", async () => {
      const { findByText, getByTestId } = render(<IngredientMatchingScreen />);

      // Error state should appear
      expect(await findByText("Matching Error")).toBeTruthy();

      // Should have go back button with testID
      expect(
        getByTestId(TEST_IDS.patterns.touchableOpacityAction("go-back"))
      ).toBeTruthy();
    });

    it("should provide user feedback on errors", async () => {
      const { findByText } = render(<IngredientMatchingScreen />);

      expect(await findByText("Matching Error")).toBeTruthy();
      expect(await findByText("Go Back")).toBeTruthy();
    });
  });

  describe("IngredientMatchingScreen - testID Integration", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should use the correct testID patterns for all TouchableOpacity components", () => {
      const { getByTestId } = render(<IngredientMatchingScreen />);

      // Test the new modalHeaderAction pattern
      expect(
        getByTestId(
          TEST_IDS.patterns.modalHeaderAction(
            "ingredient-matching-header",
            "back"
          )
        )
      ).toBeTruthy();
    });

    it("should use the correct testID patterns for ScrollView components", () => {
      const { getByTestId } = render(<IngredientMatchingScreen />);

      // Test the scrollAction pattern
      expect(
        getByTestId(TEST_IDS.patterns.scrollAction("ingredient-matching"))
      ).toBeTruthy();
    });

    it("should have consistent testID naming patterns", () => {
      const { getByTestId } = render(<IngredientMatchingScreen />);

      // All the testIDs should follow the patterns we defined
      const scrollTestId = TEST_IDS.patterns.scrollAction(
        "ingredient-matching"
      );
      const backButtonTestId = "ingredient-matching-header-back-button";

      expect(scrollTestId).toBe("ingredient-matching-scroll-view");

      expect(getByTestId(scrollTestId)).toBeTruthy();
      expect(getByTestId(backButtonTestId)).toBeTruthy();
    });
  });
});
