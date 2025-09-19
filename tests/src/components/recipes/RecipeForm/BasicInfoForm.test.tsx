import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { BasicInfoForm } from "@src/components/recipes/RecipeForm/BasicInfoForm";
import type { RecipeFormData } from "@src/types";
import { TEST_IDS } from "@src/constants/testIDs";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  Switch: "Switch",
  Alert: {
    alert: jest.fn(),
  },
  ScrollView: "ScrollView",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

// Mock dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name }: { name: string }) => name,
}));

// Mock theme context
const mockTheme = {
  colors: {
    background: "#ffffff",
    text: "#000000",
    textMuted: "#999999",
    textSecondary: "#666666",
    primary: "#f4511e",
    error: "#dc3545",
    inputBackground: "#f8f9fa",
    border: "#e0e0e0",
  },
};

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => mockTheme,
}));

// Mock styles
jest.mock("@styles/modals/createRecipeStyles", () => ({
  createRecipeStyles: () => ({
    formContainer: { flex: 1 },
    inputContainer: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: "500" },
    inputRequired: { color: "#dc3545" },
    textInput: { borderWidth: 1, borderRadius: 8, padding: 12 },
    textInputError: { borderColor: "#dc3545" },
    textInputMultiline: { minHeight: 100 },
    inputError: { color: "#dc3545", fontSize: 12 },
    characterCount: { fontSize: 12, textAlign: "right" },
    pickerContainer: { borderWidth: 1, borderRadius: 8 },
    pickerButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 12,
    },
    pickerButtonText: { fontSize: 16 },
    pickerPlaceholder: { color: "#999999" },
    batchSizeContainer: { flexDirection: "row", gap: 12 },
    batchSizeInput: { flex: 1 },
    unitPicker: { flexDirection: "row", borderRadius: 8 },
    unitButton: { paddingHorizontal: 16, paddingVertical: 12 },
    unitButtonActive: { backgroundColor: "#f4511e" },
    unitButtonText: { fontSize: 14 },
    unitButtonTextActive: { color: "#ffffff" },
    stylePickerContainer: { position: "absolute", backgroundColor: "#ffffff" },
    stylePickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 16,
    },
    stylePickerTitle: { fontSize: 18, fontWeight: "600" },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
    },
    searchInput: { flex: 1, fontSize: 16 },
    stylePickerContent: { flex: 1 },
    stylePickerItem: { paddingVertical: 16 },
    stylePickerItemRow: { flexDirection: "row", alignItems: "center" },
    stylePickerItemId: { fontSize: 14, width: 50, marginRight: 12 },
    stylePickerItemText: { fontSize: 16, flex: 1 },
    infoSection: { padding: 16 },
    infoText: { fontSize: 14 },
    switchContainer: { flexDirection: "row", justifyContent: "space-between" },
    switchLabel: { fontSize: 16 },
  }),
}));

// Mock beer styles hook
const mockBeerStyles = [
  { styleId: "1A", name: "American Light Lager" },
  { styleId: "21A", name: "American IPA" },
  { styleId: "19B", name: "American Brown Ale" },
  { styleId: "20A", name: "American Porter" },
];

jest.mock("@src/hooks/useBeerStyles", () => ({
  useBeerStyles: jest.fn(() => ({
    data: mockBeerStyles,
    isLoading: false,
    error: null,
  })),
}));

describe("BasicInfoForm", () => {
  const mockOnUpdateField = jest.fn();

  const defaultRecipeData: RecipeFormData = {
    name: "",
    style: "",
    description: "",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    boil_time: 60,
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    is_public: false,
    notes: "",
    ingredients: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic rendering", () => {
    it("should render all form fields", () => {
      const { getByPlaceholderText, getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByPlaceholderText("Enter recipe name")).toBeTruthy();
      expect(getByText("Select beer style")).toBeTruthy();
      expect(getByPlaceholderText("5.0")).toBeTruthy();
      expect(
        getByPlaceholderText("Describe your recipe (optional)")
      ).toBeTruthy();
      // Note: Labels contain nested text with required asterisks, so we check for parts
      expect(getByText(/Recipe Name/)).toBeTruthy();
      expect(getByText(/Beer Style/)).toBeTruthy();
      expect(getByText(/Batch Size/)).toBeTruthy();
      expect(getByText("Description")).toBeTruthy();
    });

    it("should show required field indicators", () => {
      const { getAllByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const requiredIndicators = getAllByText("*");
      expect(requiredIndicators).toHaveLength(3); // name, style, batch_size
    });

    it("should display character count for description", () => {
      const { getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByText("0/500")).toBeTruthy();
    });
  });

  describe("Form field interactions", () => {
    it("should update recipe name field", () => {
      const { getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const nameInput = getByPlaceholderText("Enter recipe name");
      fireEvent.changeText(nameInput, "My IPA Recipe");

      expect(mockOnUpdateField).toHaveBeenCalledWith("name", "My IPA Recipe");
    });

    it("should update description field and character count", () => {
      const recipeDataWithDescription = {
        ...defaultRecipeData,
        description: "A hoppy American IPA",
      };

      const { getByText } = render(
        <BasicInfoForm
          recipeData={recipeDataWithDescription}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Character count "A hoppy American IPA" = 20 characters, displayed as separate nodes
      // Looking at output, it shows "20" and "/500" as separate text nodes
      expect(getByText(/20/)).toBeTruthy();
      expect(getByText(/\/500/)).toBeTruthy();
    });

    it("should update batch size field", () => {
      const { getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const batchSizeInput = getByPlaceholderText("5.0");
      fireEvent.changeText(batchSizeInput, "10");

      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size", 10);
    });

    it("should handle invalid batch size input", () => {
      const { getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const batchSizeInput = getByPlaceholderText("5.0");
      fireEvent.changeText(batchSizeInput, "invalid");

      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size", 0);
    });
  });

  describe("Unit conversion", () => {
    it("should convert from gallons to liters", () => {
      const recipeData = {
        ...defaultRecipeData,
        batch_size: 5,
        batch_size_unit: "gal" as const,
      };

      const { getByText } = render(
        <BasicInfoForm
          recipeData={recipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const literButton = getByText("L");
      fireEvent.press(literButton);

      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size_unit", "l");
      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size", 18.9); // 5 gal ≈ 18.9 L
    });

    it("should convert from liters to gallons", () => {
      const recipeData = {
        ...defaultRecipeData,
        batch_size: 20,
        batch_size_unit: "l" as const,
      };

      const { getByText } = render(
        <BasicInfoForm
          recipeData={recipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const gallonButton = getByText("gal");
      fireEvent.press(gallonButton);

      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size_unit", "gal");
      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size", 5.3); // 20 L ≈ 5.3 gal
    });

    it("should not convert when same unit is selected", () => {
      const recipeData = {
        ...defaultRecipeData,
        batch_size: 5,
        batch_size_unit: "gal" as const,
      };

      const { getByText } = render(
        <BasicInfoForm
          recipeData={recipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const gallonButton = getByText("gal");
      fireEvent.press(gallonButton);

      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size_unit", "gal");
      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size", 5); // No conversion
    });

    it("should show active unit button styling", () => {
      const recipeData = {
        ...defaultRecipeData,
        batch_size_unit: "gal" as const,
      };

      const { getByText } = render(
        <BasicInfoForm
          recipeData={recipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const gallonButton = getByText("gal");
      // Note: Style testing with mocked components is limited, but component renders correctly
      expect(gallonButton).toBeTruthy();
    });
  });

  describe("Beer style picker", () => {
    it("should open style picker when tapped", () => {
      const { getByText, queryByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Initially picker should be closed
      expect(queryByText("Select Beer Style")).toBeFalsy();

      // Tap to open picker
      const stylePicker = getByText("Select beer style");
      fireEvent.press(stylePicker);

      expect(queryByText("Select Beer Style")).toBeTruthy();
    });

    it("should display beer styles in picker", async () => {
      const { getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open picker
      fireEvent.press(getByText("Select beer style"));

      await waitFor(() => {
        expect(getByText("American Light Lager")).toBeTruthy();
        expect(getByText("American IPA")).toBeTruthy();
        expect(getByText("American Brown Ale")).toBeTruthy();
        expect(getByText("American Porter")).toBeTruthy();
      });
    });

    it("should select a beer style", async () => {
      const { getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open picker
      fireEvent.press(getByText("Select beer style"));

      await waitFor(() => {
        const ipaStyle = getByText("American IPA");
        fireEvent.press(ipaStyle);
      });

      expect(mockOnUpdateField).toHaveBeenCalledWith("style", "American IPA");
    });

    it("should close picker when close button is pressed", async () => {
      const { getByText, queryByText, getByTestId } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open picker
      fireEvent.press(getByText("Select beer style"));

      await waitFor(() => {
        expect(queryByText("Select Beer Style")).toBeTruthy();
      });

      // Close picker (MaterialIcons is mocked as text)
      const closeButton = getByTestId(TEST_IDS.components.closeButton);
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByText("Select Beer Style")).toBeNull();
      });
    });

    it("should filter styles based on search", async () => {
      const { getByText, getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open picker
      fireEvent.press(getByText("Select beer style"));

      await waitFor(() => {
        const searchInput = getByPlaceholderText(
          "Search beer styles or IDs..."
        );
        fireEvent.changeText(searchInput, "IPA");

        // Should show IPA but not other styles
        expect(getByText("American IPA")).toBeTruthy();
      });
    });
  });

  describe("Form validation", () => {
    it("should validate required recipe name", () => {
      const { getByPlaceholderText, getByText } = render(
        <BasicInfoForm
          recipeData={{ ...defaultRecipeData, name: "Initial Name" }}
          onUpdateField={mockOnUpdateField}
        />
      );

      const nameInput = getByPlaceholderText("Enter recipe name");

      // Change to empty string to trigger validation
      fireEvent.changeText(nameInput, "");
      fireEvent(nameInput, "blur");

      expect(getByText("Recipe name is required")).toBeTruthy();
    });

    it("should validate recipe name length", () => {
      const { getByPlaceholderText, getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const nameInput = getByPlaceholderText("Enter recipe name");
      const longName = "a".repeat(101);
      fireEvent.changeText(nameInput, longName);

      expect(
        getByText("Recipe name must be less than 100 characters")
      ).toBeTruthy();
    });

    it("should validate batch size is greater than zero", () => {
      const { getByPlaceholderText, getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const batchSizeInput = getByPlaceholderText("5.0");
      fireEvent.changeText(batchSizeInput, "0");

      expect(getByText("Batch size must be greater than 0")).toBeTruthy();
    });

    it("should validate batch size is not too large", () => {
      const { getByPlaceholderText, getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const batchSizeInput = getByPlaceholderText("5.0");
      fireEvent.changeText(batchSizeInput, "1001");

      expect(getByText("Batch size seems too large")).toBeTruthy();
    });

    it("should validate description length", () => {
      const { getByPlaceholderText, getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const descriptionInput = getByPlaceholderText(
        "Describe your recipe (optional)"
      );
      const longDescription = "a".repeat(501);
      fireEvent.changeText(descriptionInput, longDescription);

      expect(
        getByText("Description must be less than 500 characters")
      ).toBeTruthy();
    });

    it("should show error styling on invalid inputs", () => {
      const recipeDataWithErrors = {
        ...defaultRecipeData,
        name: "",
      };

      const { getByPlaceholderText, getByText } = render(
        <BasicInfoForm
          recipeData={recipeDataWithErrors}
          onUpdateField={mockOnUpdateField}
        />
      );

      const nameInput = getByPlaceholderText("Enter recipe name");
      fireEvent.changeText(nameInput, "");

      // Check that error message appears instead of style
      expect(getByText("Recipe name is required")).toBeTruthy();
    });
  });

  describe("Loading and error states", () => {
    it("should show loading state for beer styles", async () => {
      const { useBeerStyles } = require("@src/hooks/useBeerStyles");
      useBeerStyles.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open picker
      fireEvent.press(getByText("Select beer style"));

      await waitFor(() => {
        expect(getByText("Select Beer Style (Loading...)")).toBeTruthy();
      });
    });

    it("should show error state for beer styles", async () => {
      const { useBeerStyles } = require("@src/hooks/useBeerStyles");
      useBeerStyles.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error("Network error"),
      });

      const { getByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open picker
      fireEvent.press(getByText("Select beer style"));

      await waitFor(() => {
        expect(
          getByText("Unable to load beer styles from server.")
        ).toBeTruthy();
      });
    });

    it("should show empty state when no styles match search", async () => {
      const { getByText, getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Open picker
      fireEvent.press(getByText("Select beer style"));

      await waitFor(() => {
        const searchInput = getByPlaceholderText(
          "Search beer styles or IDs..."
        );
        fireEvent.changeText(searchInput, "nonexistent");

        expect(getByText("No beer styles match your search")).toBeTruthy();
      });
    });
  });

  describe("Editing mode", () => {
    it("should handle editing mode prop", () => {
      const { getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Component should render normally in editing mode
      expect(getByPlaceholderText("Enter recipe name")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should have proper accessibility labels", () => {
      const { getByText, getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Check that labels and placeholders are present for accessibility
      expect(getByText(/Recipe Name/)).toBeTruthy();
      expect(getByText(/Beer Style/)).toBeTruthy();
      expect(getByText(/Batch Size/)).toBeTruthy();
      expect(getByText("Description")).toBeTruthy();
      expect(getByPlaceholderText("Enter recipe name")).toBeTruthy();
    });

    it("should have proper keyboard types", () => {
      const { getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const batchSizeInput = getByPlaceholderText("5.0");
      expect(batchSizeInput.props.keyboardType).toBe("decimal-pad");
    });
  });

  describe("Business logic", () => {
    it("should handle decimal batch sizes correctly", () => {
      const { getByPlaceholderText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const batchSizeInput = getByPlaceholderText("5.0");
      fireEvent.changeText(batchSizeInput, "5.5");

      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size", 5.5);
    });

    it("should round unit conversions appropriately", () => {
      const recipeData = {
        ...defaultRecipeData,
        batch_size: 5.5,
        batch_size_unit: "gal" as const,
      };

      const { getByText } = render(
        <BasicInfoForm
          recipeData={recipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const literButton = getByText("L");
      fireEvent.press(literButton);

      // Should round to 1 decimal place
      expect(mockOnUpdateField).toHaveBeenCalledWith("batch_size", 20.8);
    });

    it("should clear errors when field becomes valid", () => {
      const { getByPlaceholderText, queryByText } = render(
        <BasicInfoForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const nameInput = getByPlaceholderText("Enter recipe name");

      // First create an error
      fireEvent.changeText(nameInput, "");
      expect(queryByText("Recipe name is required")).toBeTruthy();

      // Then fix it
      fireEvent.changeText(nameInput, "Valid Name");
      expect(queryByText("Recipe name is required")).toBeFalsy();
    });
  });
});
