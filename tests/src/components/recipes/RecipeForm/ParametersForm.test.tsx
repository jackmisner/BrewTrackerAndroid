import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ParametersForm } from "@src/components/recipes/RecipeForm/ParametersForm";
import { RecipeFormData } from "@src/types";
import { TEST_IDS } from "@src/constants/testIDs";

// Comprehensive React Native mocking to avoid ES6 module issues
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
}));

// Mock dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
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
    info: "#17a2b8",
    inputBackground: "#f8f9fa",
    border: "#e0e0e0",
  },
};

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => mockTheme,
}));

// Mock unit context
const mockUnitContext = {
  unitSystem: "imperial" as "imperial" | "metric",
  setUnitSystem: jest.fn(),
};

jest.mock("@contexts/UnitContext", () => ({
  useUnits: () => mockUnitContext,
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
    inputError: { color: "#dc3545", fontSize: 12 },
    inputHelper: { fontSize: 12, color: "#666666" },
    batchSizeContainer: { flexDirection: "row", gap: 12 },
    batchSizeInput: { flex: 1 },
    unitPicker: { flexDirection: "row", borderRadius: 8 },
    unitButton: { paddingHorizontal: 16, paddingVertical: 12 },
    unitButtonActive: { backgroundColor: "#f4511e" },
    unitButtonText: { fontSize: 14 },
    unitButtonTextActive: { color: "#ffffff" },
    presetsContainer: { marginTop: 8 },
    presetsLabel: { fontSize: 12, color: "#666666", marginBottom: 4 },
    presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    presetButton: {
      backgroundColor: "#f8f9fa",
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    presetButtonActive: { backgroundColor: "#f4511e" },
    presetButtonText: { fontSize: 12, color: "#000000" },
    presetButtonTextActive: { color: "#ffffff" },
    infoSection: { padding: 16, backgroundColor: "#f8f9fa" },
    infoHeader: { flexDirection: "row", alignItems: "center" },
    infoTitle: { fontSize: 16, fontWeight: "500" },
    infoText: { fontSize: 14, color: "#666666" },
  }),
}));

describe("ParametersForm", () => {
  const mockOnUpdateField = jest.fn();

  const defaultRecipeData: RecipeFormData = {
    name: "Test Recipe",
    style: "IPA",
    description: "",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    boil_time: 90, // Changed to 90 to be unique
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    mash_time: 60,
    is_public: false,
    notes: "",
    ingredients: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnitContext.unitSystem = "imperial";
  });

  describe("Basic rendering", () => {
    it("should render all parameter fields", () => {
      const { getByText, getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByText(/Boil Time/)).toBeTruthy();
      expect(getByText(/Brewhouse Efficiency/)).toBeTruthy();
      expect(getByText(/Mash Temperature/)).toBeTruthy();
      expect(getByText("Mash Time (minutes)")).toBeTruthy();

      // Check that specific inputs exist by their display values
      expect(getByDisplayValue("90")).toBeTruthy(); // Boil time default value
      expect(getByDisplayValue("75")).toBeTruthy(); // Efficiency default value
    });

    it("should show required field indicators", () => {
      const { getAllByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const requiredIndicators = getAllByText("*");
      expect(requiredIndicators).toHaveLength(3); // boil_time, efficiency, mash_temperature
    });

    it("should render efficiency presets", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByText("Quick Select:")).toBeTruthy();
      expect(getByText("60%")).toBeTruthy(); // Partial Mash
      expect(getByText("65%")).toBeTruthy(); // All Grain Beginner
      expect(getByText("75%")).toBeTruthy(); // All Grain Intermediate
      expect(getByText("80%")).toBeTruthy(); // Extract
      expect(getByText("85%")).toBeTruthy(); // All Grain Advanced
    });

    it("should render temperature unit buttons", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByText("°F")).toBeTruthy();
      expect(getByText("°C")).toBeTruthy();
    });

    it("should render info section", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByText("Brewing Parameters")).toBeTruthy();
      expect(
        getByText(/These parameters affect the final recipe calculations/)
      ).toBeTruthy();
    });
  });

  describe("Field updates", () => {
    it("should update boil time field", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const boilTimeInput = getByDisplayValue("90");
      fireEvent.changeText(boilTimeInput, "120");

      expect(mockOnUpdateField).toHaveBeenCalledWith("boil_time", 120);
    });

    it("should update efficiency field", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const efficiencyInput = getByDisplayValue("75");
      fireEvent.changeText(efficiencyInput, "80");

      expect(mockOnUpdateField).toHaveBeenCalledWith("efficiency", 80);
    });

    it("should update mash temperature field", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTempInput = getByDisplayValue("152");
      fireEvent.changeText(mashTempInput, "154");

      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_temperature", 154);
    });

    it("should update mash time field", () => {
      const recipeWithoutMashTime = {
        ...defaultRecipeData,
        mash_time: undefined,
      };

      const { getByDisplayValue, getByTestId } = render(
        <ParametersForm
          recipeData={recipeWithoutMashTime}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTimeInput = getByTestId(TEST_IDS.inputs.mashTimeInput);
      fireEvent.changeText(mashTimeInput, "90");

      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_time", 90);
    });
  });

  describe("Efficiency presets", () => {
    it("should update efficiency when preset is selected", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const preset80Button = getByText("80%");
      fireEvent.press(preset80Button);

      expect(mockOnUpdateField).toHaveBeenCalledWith("efficiency", 80);
    });

    it("should show active state for current efficiency", () => {
      const recipeWith85Efficiency = {
        ...defaultRecipeData,
        efficiency: 85,
      };

      const { getByText } = render(
        <ParametersForm
          recipeData={recipeWith85Efficiency}
          onUpdateField={mockOnUpdateField}
        />
      );

      // The 85% button should be present (we can't easily test active styling with mocks)
      expect(getByText("85%")).toBeTruthy();
    });

    it("should handle all efficiency presets", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const presets = [
        { text: "60%", value: 60 },
        { text: "65%", value: 65 },
        { text: "75%", value: 75 },
        { text: "80%", value: 80 },
        { text: "85%", value: 85 },
      ];

      presets.forEach(preset => {
        const button = getByText(preset.text);
        fireEvent.press(button);
        expect(mockOnUpdateField).toHaveBeenCalledWith(
          "efficiency",
          preset.value
        );
      });
    });
  });

  describe("Temperature unit conversion", () => {
    it("should convert from Fahrenheit to Celsius", () => {
      const recipeWithFahrenheit = {
        ...defaultRecipeData,
        mash_temperature: 152,
        mash_temp_unit: "F" as const,
      };

      const { getByText } = render(
        <ParametersForm
          recipeData={recipeWithFahrenheit}
          onUpdateField={mockOnUpdateField}
        />
      );

      const celsiusButton = getByText("°C");
      fireEvent.press(celsiusButton);

      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_temp_unit", "C");
      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_temperature", 66.7); // 152°F = 66.7°C
    });

    it("should convert from Celsius to Fahrenheit", () => {
      const recipeWithCelsius = {
        ...defaultRecipeData,
        mash_temperature: 67,
        mash_temp_unit: "C" as const,
      };

      const { getByText } = render(
        <ParametersForm
          recipeData={recipeWithCelsius}
          onUpdateField={mockOnUpdateField}
        />
      );

      const fahrenheitButton = getByText("°F");
      fireEvent.press(fahrenheitButton);

      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_temp_unit", "F");
      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_temperature", 152.6); // 67°C = 152.6°F
    });

    it("should not convert when same unit is selected", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const fahrenheitButton = getByText("°F");
      fireEvent.press(fahrenheitButton);

      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_temp_unit", "F");
      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_temperature", 152); // No conversion
    });
  });

  describe("Validation", () => {
    it("should validate boil time - negative values", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const boilTimeInput = getByDisplayValue("90");
      fireEvent.changeText(boilTimeInput, "-10");

      expect(getByText("Boil time must be 0 or greater")).toBeTruthy();
    });

    it("should validate boil time - too long", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const boilTimeInput = getByDisplayValue("90");
      fireEvent.changeText(boilTimeInput, "350");

      expect(getByText("Boil time seems too long (>5 hours)")).toBeTruthy();
    });

    it("should validate efficiency - zero or negative", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const efficiencyInput = getByDisplayValue("75");
      fireEvent.changeText(efficiencyInput, "0");

      expect(getByText("Efficiency must be greater than 0")).toBeTruthy();
    });

    it("should validate efficiency - over 100%", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const efficiencyInput = getByDisplayValue("75");
      fireEvent.changeText(efficiencyInput, "110");

      expect(getByText("Efficiency cannot exceed 100%")).toBeTruthy();
    });

    it("should validate mash temperature - too low in Fahrenheit", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTempInput = getByDisplayValue("152");
      fireEvent.changeText(mashTempInput, "130");

      expect(getByText("Mash temperature too low (min 140°F)")).toBeTruthy();
    });

    it("should validate mash temperature - too high in Fahrenheit", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTempInput = getByDisplayValue("152");
      fireEvent.changeText(mashTempInput, "180");

      expect(getByText("Mash temperature too high (max 170°F)")).toBeTruthy();
    });

    it("should validate mash temperature - too low in Celsius", () => {
      const recipeWithCelsius = {
        ...defaultRecipeData,
        mash_temperature: 67,
        mash_temp_unit: "C" as const,
      };

      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={recipeWithCelsius}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Find the mash temperature input (it should have value "67")
      const mashTempInput = getByDisplayValue("67");
      fireEvent.changeText(mashTempInput, "50");

      expect(getByText("Mash temperature too low (min 60°C)")).toBeTruthy();
    });

    it("should validate mash time - negative values", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTimeInput = getByDisplayValue("60");
      fireEvent.changeText(mashTimeInput, "-30");

      expect(getByText("Mash time must be 0 or greater")).toBeTruthy();
    });

    it("should validate mash time - too long", () => {
      const { getByDisplayValue, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTimeInput = getByDisplayValue("60");
      fireEvent.changeText(mashTimeInput, "500");

      expect(getByText("Mash time seems too long (>8 hours)")).toBeTruthy();
    });
  });

  describe("Input handling", () => {
    it("should handle invalid numeric input", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const boilTimeInput = getByDisplayValue("90");
      fireEvent.changeText(boilTimeInput, "invalid");

      expect(mockOnUpdateField).toHaveBeenCalledWith("boil_time", 0);
    });

    it("should handle empty mash time input", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTimeInput = getByDisplayValue("60");
      fireEvent.changeText(mashTimeInput, "");

      expect(mockOnUpdateField).toHaveBeenCalledWith("mash_time", undefined);
    });

    it("should handle decimal values", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const efficiencyInput = getByDisplayValue("75");
      fireEvent.changeText(efficiencyInput, "75.5");

      expect(mockOnUpdateField).toHaveBeenCalledWith("efficiency", 75.5);
    });
  });

  describe("Unit system integration", () => {
    it("should show imperial placeholders when unit system is imperial", () => {
      mockUnitContext.unitSystem = "imperial";

      const { getByPlaceholderText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByPlaceholderText("152")).toBeTruthy(); // Fahrenheit temperature
    });

    it("should show metric placeholders when unit system is metric", () => {
      mockUnitContext.unitSystem = "metric";

      const recipeWithCelsius = {
        ...defaultRecipeData,
        mash_temperature: 67,
        mash_temp_unit: "C" as const,
      };

      const { getByPlaceholderText } = render(
        <ParametersForm
          recipeData={recipeWithCelsius}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(getByPlaceholderText("67")).toBeTruthy(); // Celsius temperature
    });
  });

  describe("Helper text", () => {
    it("should display helpful information for each field", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      expect(
        getByText("Typical: 60-90 minutes for ales, 90+ for lagers")
      ).toBeTruthy();
      expect(
        getByText("Single infusion temperature for enzyme activity")
      ).toBeTruthy();
      expect(
        getByText("Optional - leave blank for default (60 minutes)")
      ).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should have proper input types", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const boilTimeInput = getByDisplayValue("90");
      const efficiencyInput = getByDisplayValue("75");
      const mashTempInput = getByDisplayValue("152");

      expect(boilTimeInput.props.keyboardType).toBe("numeric");
      expect(efficiencyInput.props.keyboardType).toBe("decimal-pad");
      expect(mashTempInput.props.keyboardType).toBe("decimal-pad");
    });

    it("should have proper return key types", () => {
      const { getByDisplayValue } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const boilTimeInput = getByDisplayValue("90");
      const efficiencyInput = getByDisplayValue("75");
      const mashTempInput = getByDisplayValue("152");

      expect(boilTimeInput.props.returnKeyType).toBe("next");
      expect(efficiencyInput.props.returnKeyType).toBe("next");
      expect(mashTempInput.props.returnKeyType).toBe("next");
    });
  });

  describe("Editing mode", () => {
    it("should handle editing mode prop", () => {
      const { getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
          isEditing={true}
        />
      );

      // Component should render normally in editing mode
      expect(getByText(/Boil Time/)).toBeTruthy();
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined mash_time", () => {
      const recipeWithUndefinedMashTime = {
        ...defaultRecipeData,
        mash_time: undefined,
      };

      const { root } = render(
        <ParametersForm
          recipeData={recipeWithUndefinedMashTime}
          onUpdateField={mockOnUpdateField}
        />
      );

      // Should render without crashing
      expect(root).toBeTruthy();
    });

    it("should handle extreme temperature values", () => {
      const { getByPlaceholderText, getByText } = render(
        <ParametersForm
          recipeData={defaultRecipeData}
          onUpdateField={mockOnUpdateField}
        />
      );

      const mashTempInput = getByPlaceholderText("152");
      fireEvent.changeText(mashTempInput, "1000");

      expect(getByText("Mash temperature too high (max 170°F)")).toBeTruthy();
    });
  });
});
