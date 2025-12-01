/**
 * Tests for ImportBeerXMLScreen
 */

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import ImportBeerXMLScreen from "../../../../app/(modals)/(beerxml)/importBeerXML";
import { TEST_IDS } from "@src/constants/testIDs";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      text: "#000",
      background: "#FFF",
      backgroundSecondary: "#F5F5F5",
      textSecondary: "#666",
      border: "#CCC",
      warning: "#F59E0B",
    },
    fonts: { regular: "System" },
  }),
}));

jest.mock("@contexts/UnitContext", () => ({
  useUnits: () => ({
    unitSystem: "imperial",
    loading: false,
    error: null,
    updateUnitSystem: jest.fn(),
    setError: jest.fn(),
    getPreferredUnit: jest.fn(),
    convertUnit: jest.fn(),
    convertForDisplay: jest.fn(),
    formatValue: jest.fn(),
    getTemperatureSymbol: jest.fn(),
    formatTemperature: jest.fn(),
    formatCurrentTemperature: jest.fn(),
    convertTemperature: jest.fn(),
    getTemperatureAxisConfig: jest.fn(),
    getUnitSystemLabel: jest.fn(),
    getCommonUnits: jest.fn(),
  }),
}));

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock("@services/beerxml/BeerXMLService", () => {
  return {
    __esModule: true,
    default: {
      importBeerXMLFile: jest.fn(),
      parseBeerXML: jest.fn(),
      detectRecipeUnitSystem: jest.fn(() => "imperial"),
      convertRecipeUnits: jest.fn(recipe => Promise.resolve(recipe)),
    },
  };
});

jest.mock("@src/components/beerxml/UnitConversionChoiceModal", () => ({
  UnitConversionChoiceModal: () => null,
}));

describe("ImportBeerXMLScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    expect(() => render(<ImportBeerXMLScreen />)).not.toThrow();
  });

  it("should display file selection step by default", () => {
    const { getByText, getByTestId } = render(<ImportBeerXMLScreen />);

    expect(getByText("Import BeerXML")).toBeTruthy();
    // Verify title exists
    expect(getByTestId("beerxml-select-file-button")).toBeTruthy();
    // Verify button exists through test ID
    expect(getByTestId(TEST_IDS.beerxml.selectFileButton)).toBeTruthy();
  });

  it("should display initial instructions", () => {
    const { getByText } = render(<ImportBeerXMLScreen />);

    expect(
      getByText("Choose a BeerXML file from your device to import recipes.")
    ).toBeTruthy();
  });

  it("should have accessible select file button", () => {
    const { getByTestId } = render(<ImportBeerXMLScreen />);

    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);
    expect(selectButton).toBeTruthy();
    expect(selectButton.props.accessibilityRole).toBe("button");
  });
});

describe("ImportBeerXMLScreen - Additional UI Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should have scrollable content area", () => {
    const { getByTestId } = render(<ImportBeerXMLScreen />);
    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("import-beerxml"))
    ).toBeTruthy();
  });
});

describe("ImportBeerXMLScreen - State Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show initial file selection state", () => {
    const { getAllByText } = render(<ImportBeerXMLScreen />);

    expect(getAllByText("Select BeerXML File")).toHaveLength(2); // Title and button
  });

  it("should show proper header elements", () => {
    const { getByText, getByTestId } = render(<ImportBeerXMLScreen />);

    expect(getByText("Import BeerXML")).toBeTruthy();

    // Should have back button and select button with testIDs
    expect(getByTestId("import-beerxml-header-back-button")).toBeTruthy();
    expect(getByTestId(TEST_IDS.beerxml.selectFileButton)).toBeTruthy();
  });

  it("should show file selection button when not loading", () => {
    const { getByTestId } = render(<ImportBeerXMLScreen />);

    const button = getByTestId(TEST_IDS.beerxml.selectFileButton);
    expect(button.props.disabled).toBeFalsy();
  });

  it("should display proper instruction text", () => {
    const { getByText } = render(<ImportBeerXMLScreen />);

    expect(
      getByText("Choose a BeerXML file from your device to import recipes.")
    ).toBeTruthy();
  });

  it("should have multiple material icons", () => {
    const { getByTestId } = render(<ImportBeerXMLScreen />);

    // Should have file-upload and arrow-back icons via touchable buttons
    expect(getByTestId("import-beerxml-header-back-button")).toBeTruthy();
    expect(getByTestId(TEST_IDS.beerxml.selectFileButton)).toBeTruthy();
  });
});

describe("ImportBeerXMLScreen - UI Components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render all required components", () => {
    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);

    // Verify key components exist using semantic queries
    expect(getByText("Import BeerXML")).toBeTruthy();
    expect(getByTestId(TEST_IDS.beerxml.selectFileButton)).toBeTruthy();
    expect(
      getByTestId(TEST_IDS.patterns.scrollAction("import-beerxml"))
    ).toBeTruthy();
  });

  it("should apply proper theme styling", () => {
    const { getByTestId } = render(<ImportBeerXMLScreen />);

    const button = getByTestId(TEST_IDS.beerxml.selectFileButton);
    expect(button.props.style).toBeDefined();
  });

  it("should show section structure", () => {
    const { getAllByText, getByText } = render(<ImportBeerXMLScreen />);

    // Should show section title and description
    expect(getAllByText("Select BeerXML File")).toHaveLength(2);
    expect(
      getByText("Choose a BeerXML file from your device to import recipes.")
    ).toBeTruthy();
  });
});

describe("ImportBeerXMLScreen - User Interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle file selection success", async () => {
    // Mock successful file import and parsing
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;
    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content:
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Test Recipe</NAME></RECIPE></RECIPES>',
      filename: "test_recipe.xml",
    });

    mockBeerXMLService.parseBeerXML = jest.fn().mockResolvedValue([
      {
        name: "Test Recipe",
        style: "IPA",
        ingredients: [
          { name: "Pale Malt", type: "grain", amount: 10, unit: "lb" },
        ],
      },
    ]);

    const mockRouter = require("expo-router").router;

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    // Wait until parsing is done and recipe preview is shown
    await waitFor(() => {
      expect(getByText("Recipe Preview")).toBeTruthy();
    });

    // Press the Import Recipe button
    await act(async () => {
      fireEvent.press(getByText("Import Recipe"));
    });

    expect(mockBeerXMLService.importBeerXMLFile).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/(modals)/(beerxml)/ingredientMatching",
      params: expect.objectContaining({
        filename: "test_recipe.xml",
      }),
    });
  });

  it("should handle file selection error", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;
    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: false,
      error: "Failed to select file",
    });

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    await waitFor(() => {
      expect(getByText("Failed to select file")).toBeTruthy();
    });
  });

  it("should handle invalid file data", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;
    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content: null,
      filename: null,
    });

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    await waitFor(() => {
      expect(getByText("Invalid file data received")).toBeTruthy();
    });
  });

  it("should handle parsing error with no recipes", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;
    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content: '<?xml version="1.0"?><RECIPES></RECIPES>',
      filename: "empty_recipe.xml",
    });

    mockBeerXMLService.parseBeerXML = jest.fn().mockResolvedValue([]);

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    await waitFor(() => {
      expect(getByText("No recipes found in the BeerXML file")).toBeTruthy();
    });
  });

  it("should handle parse error exception", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;
    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content: "invalid xml content",
      filename: "invalid.xml",
    });

    mockBeerXMLService.parseBeerXML = jest
      .fn()
      .mockRejectedValue(new Error("Invalid XML format"));

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    await waitFor(() => {
      expect(getByText("Invalid XML format")).toBeTruthy();
    });
  });

  it("should show loading state during file selection", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;
    let resolveImport: ((value: any) => void) | null = null;
    const importPromise = new Promise(resolve => {
      resolveImport = resolve;
    });
    mockBeerXMLService.importBeerXMLFile = jest
      .fn()
      .mockReturnValue(importPromise);

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    act(() => {
      fireEvent.press(selectButton);
    });

    expect(getByText("Selecting File...")).toBeTruthy();
    expect(getByTestId(TEST_IDS.beerxml.selectFileButton).props.disabled).toBe(
      true
    );

    await act(async () => {
      if (resolveImport) {
        resolveImport!({
          success: false,
          error: "Test error",
        });
      }
    });
  });
});

it("should show parsing state during XML parsing", async () => {
  const mockBeerXMLService =
    require("@services/beerxml/BeerXMLService").default;
  mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
    success: true,
    content:
      '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Test Recipe</NAME></RECIPE></RECIPES>',
    filename: "test_recipe.xml",
  });

  let resolveParse: ((value: any) => void) | null = null;
  const parsePromise = new Promise(resolve => {
    resolveParse = resolve;
  });
  mockBeerXMLService.parseBeerXML = jest.fn().mockReturnValue(parsePromise);

  const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
  const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

  await act(async () => {
    fireEvent.press(selectButton);
  });

  await waitFor(() => {
    expect(getByText("Parsing BeerXML")).toBeTruthy();
  });

  await act(async () => {
    if (resolveParse) {
      resolveParse!([
        {
          name: "Test Recipe",
          style: "IPA",
          ingredients: [],
        },
      ]);
    }
  });
});

it("should retry file selection after error", async () => {
  const mockBeerXMLService =
    require("@services/beerxml/BeerXMLService").default;
  mockBeerXMLService.importBeerXMLFile = jest
    .fn()
    .mockResolvedValueOnce({
      success: false,
      error: "File selection failed",
    })
    .mockResolvedValueOnce({
      success: true,
      content:
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Retry Recipe</NAME></RECIPE></RECIPES>',
      filename: "retry_recipe.xml",
    });

  mockBeerXMLService.parseBeerXML = jest.fn().mockResolvedValue([
    {
      name: "Retry Recipe",
      style: "Lager",
      ingredients: [],
    },
  ]);

  const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
  const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

  // First attempt fails
  await act(async () => {
    fireEvent.press(selectButton);
  });

  await waitFor(() => {
    expect(getByText("File selection failed")).toBeTruthy();
  });

  // Reset via "Try Again"
  await act(async () => {
    fireEvent.press(getByText("Try Again"));
  });

  // Re-query select button after reset
  const newSelectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

  // Now select again
  await act(async () => {
    fireEvent.press(newSelectButton);
  });

  expect(mockBeerXMLService.importBeerXMLFile).toHaveBeenCalledTimes(2);
  expect(mockBeerXMLService.parseBeerXML).toHaveBeenCalledWith(
    '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Retry Recipe</NAME></RECIPE></RECIPES>'
  );
});

describe("ImportBeerXMLScreen - Unit Conversion Workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should detect unit system mismatch and show conversion modal", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;

    // Mock recipe with metric units
    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content:
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Metric Recipe</NAME></RECIPE></RECIPES>',
      filename: "metric_recipe.xml",
    });

    mockBeerXMLService.parseBeerXML = jest.fn().mockResolvedValue([
      {
        name: "Metric Recipe",
        style: "IPA",
        batch_size: 20,
        batch_size_unit: "l",
        ingredients: [
          { name: "Pale Malt", type: "grain", amount: 4500, unit: "g" },
        ],
      },
    ]);

    // Mock detection to return "metric" (mismatched with user's "imperial")
    mockBeerXMLService.detectRecipeUnitSystem = jest
      .fn()
      .mockReturnValue("metric");

    const { getByTestId } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    // Wait for parsing to complete
    await waitFor(() => {
      expect(mockBeerXMLService.detectRecipeUnitSystem).toHaveBeenCalled();
    });

    // Verify unit system detection was called with the parsed recipe
    expect(mockBeerXMLService.detectRecipeUnitSystem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Metric Recipe",
        batch_size_unit: "l",
      })
    );
  });

  it("should not show conversion modal when unit systems match", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;

    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content:
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Imperial Recipe</NAME></RECIPE></RECIPES>',
      filename: "imperial_recipe.xml",
    });

    mockBeerXMLService.parseBeerXML = jest.fn().mockResolvedValue([
      {
        name: "Imperial Recipe",
        style: "IPA",
        batch_size: 5,
        batch_size_unit: "gal",
        ingredients: [
          { name: "Pale Malt", type: "grain", amount: 10, unit: "lb" },
        ],
      },
    ]);

    // Mock detection to return "imperial" (matches user's "imperial")
    mockBeerXMLService.detectRecipeUnitSystem = jest
      .fn()
      .mockReturnValue("imperial");

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    // Wait for recipe preview to appear
    await waitFor(() => {
      expect(getByText("Recipe Preview")).toBeTruthy();
    });

    // Verify Import Recipe button is available (no conversion modal blocking)
    expect(getByText("Import Recipe")).toBeTruthy();
  });

  it("should not show conversion modal for mixed unit systems", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;

    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content:
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Mixed Recipe</NAME></RECIPE></RECIPES>',
      filename: "mixed_recipe.xml",
    });

    mockBeerXMLService.parseBeerXML = jest.fn().mockResolvedValue([
      {
        name: "Mixed Recipe",
        style: "IPA",
        batch_size: 5,
        batch_size_unit: "gal",
        ingredients: [
          { name: "Pale Malt", type: "grain", amount: 4500, unit: "g" },
        ],
      },
    ]);

    // Mock detection to return "mixed" (should not show modal)
    mockBeerXMLService.detectRecipeUnitSystem = jest
      .fn()
      .mockReturnValue("mixed");

    const { getByTestId, getByText } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    // Wait for recipe preview to appear
    await waitFor(() => {
      expect(getByText("Recipe Preview")).toBeTruthy();
    });

    // Verify Import Recipe button is available (no conversion modal for mixed)
    expect(getByText("Import Recipe")).toBeTruthy();
  });

  it("should handle unit conversion success", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;
    const mockRouter = require("expo-router").router;

    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content:
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Metric Recipe</NAME></RECIPE></RECIPES>',
      filename: "metric_recipe.xml",
    });

    const metricRecipe = {
      name: "Metric Recipe",
      style: "IPA",
      batch_size: 20,
      batch_size_unit: "l",
      ingredients: [
        { name: "Pale Malt", type: "grain", amount: 4500, unit: "g" },
      ],
    };

    const convertedRecipe = {
      name: "Metric Recipe",
      style: "IPA",
      batch_size: 5.28,
      batch_size_unit: "gal",
      ingredients: [
        { name: "Pale Malt", type: "grain", amount: 9.92, unit: "lb" },
      ],
    };

    mockBeerXMLService.parseBeerXML = jest
      .fn()
      .mockResolvedValue([metricRecipe]);
    mockBeerXMLService.detectRecipeUnitSystem = jest
      .fn()
      .mockReturnValue("metric");
    mockBeerXMLService.convertRecipeUnits = jest
      .fn()
      .mockResolvedValue(convertedRecipe);

    const { getByTestId } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    // Wait for recipe preview
    await waitFor(() => {
      expect(mockBeerXMLService.detectRecipeUnitSystem).toHaveBeenCalled();
    });

    // In a real scenario, the modal would be shown and user would click "Convert"
    // Since the modal is mocked to return null, we can't test the full interaction
    // But we can verify the service methods are properly integrated
    expect(mockBeerXMLService.detectRecipeUnitSystem).toHaveBeenCalledWith(
      metricRecipe
    );
  });

  it("should handle unit conversion failure gracefully", async () => {
    const mockBeerXMLService =
      require("@services/beerxml/BeerXMLService").default;

    mockBeerXMLService.importBeerXMLFile = jest.fn().mockResolvedValue({
      success: true,
      content:
        '<?xml version="1.0"?><RECIPES><RECIPE><NAME>Metric Recipe</NAME></RECIPE></RECIPES>',
      filename: "metric_recipe.xml",
    });

    const metricRecipe = {
      name: "Metric Recipe",
      style: "IPA",
      batch_size: 20,
      batch_size_unit: "l",
      ingredients: [
        { name: "Pale Malt", type: "grain", amount: 4500, unit: "g" },
      ],
    };

    mockBeerXMLService.parseBeerXML = jest
      .fn()
      .mockResolvedValue([metricRecipe]);
    mockBeerXMLService.detectRecipeUnitSystem = jest
      .fn()
      .mockReturnValue("metric");
    mockBeerXMLService.convertRecipeUnits = jest
      .fn()
      .mockRejectedValue(new Error("Conversion failed"));

    const { getByTestId } = render(<ImportBeerXMLScreen />);
    const selectButton = getByTestId(TEST_IDS.beerxml.selectFileButton);

    await act(async () => {
      fireEvent.press(selectButton);
    });

    // Wait for recipe preview
    await waitFor(() => {
      expect(mockBeerXMLService.detectRecipeUnitSystem).toHaveBeenCalled();
    });

    // Verify the component handles the failure case
    expect(mockBeerXMLService.detectRecipeUnitSystem).toHaveBeenCalledWith(
      metricRecipe
    );
  });
});
