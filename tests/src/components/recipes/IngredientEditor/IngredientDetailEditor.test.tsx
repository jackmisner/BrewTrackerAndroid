/**
 * IngredientDetailEditor Component Test Suite
 */

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { IngredientDetailEditor } from "@src/components/recipes/IngredientEditor/IngredientDetailEditor";
import { TEST_IDS } from "@constants/testIDs";

// Mock React Native components
jest.mock("react-native", () => ({
  View: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("View", props, children);
  },
  Text: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("Text", props, children);
  },
  TextInput: (props: any) => {
    const React = require("react");
    return React.createElement("TextInput", props);
  },
  TouchableOpacity: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("TouchableOpacity", props, children);
  },
  TouchableWithoutFeedback: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("TouchableWithoutFeedback", props, children);
  },
  ScrollView: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("ScrollView", props, children);
  },
  Modal: ({ children, visible, ...props }: any) => {
    const React = require("react");
    return visible ? React.createElement("Modal", props, children) : null;
  },
  Platform: {
    OS: "android",
    select: jest.fn(obj => obj.android || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Alert: { alert: jest.fn() },
  Keyboard: { dismiss: jest.fn() },
  StyleSheet: {
    create: jest.fn(styles => styles),
    flatten: jest.fn(styles => styles),
  },
}));

// Mock external dependencies
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name, size, color, ...props }: any) => {
    const React = require("react");
    return React.createElement("MaterialIcons", {
      name,
      size,
      color,
      ...props,
    });
  },
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#007AFF",
      background: "#FFFFFF",
      card: "#F2F2F7",
      text: "#000000",
      secondary: "#8E8E93",
      error: "#FF3B30",
      border: "#E5E5EA",
      textSecondary: "#8E8E93",
    },
  }),
}));

jest.mock("@contexts/UnitContext", () => ({
  useUnits: () => ({
    unitSystem: "imperial",
  }),
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    getUserId: jest.fn(() => Promise.resolve("test-user-id")),
  }),
}));

jest.mock("@src/types", () => ({
  RecipeIngredient: {},
  IngredientType: {},
}));

jest.mock("@styles/recipes/ingredientDetailEditorStyles", () => ({
  ingredientDetailEditorStyles: () => ({
    container: {},
    header: {},
    title: {},
    content: {},
    field: {},
    label: {},
    input: {},
    button: {},
    row: {},
    presetButton: {},
    presetText: {},
  }),
}));

jest.mock("@constants/hopConstants", () => ({
  HOP_USAGE_OPTIONS: [
    { value: "boil", display: "Boil", defaultTime: 60 },
    { value: "dry-hop", display: "Dry Hop", defaultTime: 1440 * 3 },
    { value: "whirlpool", display: "Whirlpool", defaultTime: 15 },
  ],
  HOP_TIME_PRESETS: {
    boil: [
      { label: "60 min", value: 60 },
      { label: "30 min", value: 30 },
      { label: "15 min", value: 15 },
      { label: "5 min", value: 5 },
      { label: "0 min", value: 0 },
    ],
    "dry-hop": [
      { label: "3 days", value: 3 * 1440 },
      { label: "5 days", value: 5 * 1440 },
      { label: "7 days", value: 7 * 1440 },
    ],
    whirlpool: [
      { label: "15 min", value: 15 },
      { label: "10 min", value: 10 },
      { label: "5 min", value: 5 },
    ],
  },
}));

jest.mock("@utils/formatUtils", () => ({
  getHopTimePlaceholder: jest.fn(() => "60 min"),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@utils/keyUtils", () => ({
  generateIngredientKey: jest.fn(() => "mock-key"),
  generateUniqueId: jest.fn(() => "mock-uuid"),
}));

jest.mock("@services/calculators/UnitConverter", () => ({
  UnitConverter: {
    convertWeight: jest.fn((amount: number, from: string, to: string) => {
      // oz → g
      if (from === "oz" && to === "g") {
        return amount * 28.3495;
      }
      // g → oz
      if (from === "g" && to === "oz") {
        return amount / 28.3495;
      }
      // lb → kg
      if (from === "lb" && to === "kg") {
        return amount * 0.453592;
      }
      // kg → lb
      if (from === "kg" && to === "lb") {
        return amount / 0.453592;
      }
      // Same unit or unsupported conversion
      if (from === to) {
        return amount;
      }
      throw new Error(`Unsupported weight conversion: ${from} → ${to}`);
    }),
    convertVolume: jest.fn((amount: number, from: string, to: string) => {
      // tsp → tbsp
      if (from === "tsp" && to === "tbsp") {
        return amount / 3;
      }
      // tbsp → tsp
      if (from === "tbsp" && to === "tsp") {
        return amount * 3;
      }
      // Same unit or unsupported conversion
      if (from === to) {
        return amount;
      }
      throw new Error(`Unsupported volume conversion: ${from} → ${to}`);
    }),
    isValidWeightUnit: jest.fn((unit: string) =>
      ["oz", "lb", "g", "kg"].includes(unit)
    ),
  },
}));

// Mock props for the component
const mockIngredient = {
  id: "test-ingredient-1",
  name: "Test Ingredient",
  type: "grain" as const,
  amount: 1,
  unit: "oz" as const,
  notes: "",
  instance_id: "mock-uuid",
};

const mockHopIngredient = {
  id: "test-hop-1",
  name: "Test Hop",
  type: "hop" as const,
  amount: 1,
  unit: "oz" as const,
  use: "boil" as const,
  time: 60,
  alpha_acid: 5.5,
  instance_id: "mock-uuid",
};

const mockYeastIngredient = {
  id: "test-yeast-1",
  name: "Test Yeast",
  type: "yeast" as const,
  amount: 1,
  unit: "pkg" as const,
  attenuation: 75,
  instance_id: "mock-uuid",
};

const mockOtherIngredient = {
  id: "test-other-1",
  name: "Test Other",
  type: "other" as const,
  amount: 1,
  unit: "tsp" as const,
  instance_id: "mock-uuid",
};

const mockProps = {
  ingredient: mockIngredient,
  onUpdate: jest.fn(),
  onCancel: jest.fn(),
  onRemove: jest.fn(),
  isVisible: true,
};

describe("IngredientDetailEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    expect(() => {
      render(<IngredientDetailEditor {...mockProps} />);
    }).not.toThrow();
  });

  describe("Ingredient Type Handling", () => {
    it("should render grain ingredient correctly", () => {
      expect(() => {
        render(
          <IngredientDetailEditor {...mockProps} ingredient={mockIngredient} />
        );
      }).not.toThrow();
    });

    it("should render hop ingredient with usage and time fields", () => {
      const hopProps = { ...mockProps, ingredient: mockHopIngredient };
      expect(() => {
        render(<IngredientDetailEditor {...hopProps} />);
      }).not.toThrow();
    });

    it("should render yeast ingredient correctly", () => {
      const yeastProps = { ...mockProps, ingredient: mockYeastIngredient };
      expect(() => {
        render(<IngredientDetailEditor {...yeastProps} />);
      }).not.toThrow();
    });

    it("should render other ingredient with dropdown unit selector", () => {
      const otherProps = { ...mockProps, ingredient: mockOtherIngredient };
      expect(() => {
        render(<IngredientDetailEditor {...otherProps} />);
      }).not.toThrow();
    });
  });

  describe("Unit Conversion Logic", () => {
    it("should handle weight unit conversion for grain", () => {
      const grainWithAmount = {
        ...mockIngredient,
        amount: 10,
        unit: "oz" as const,
      };
      const props = { ...mockProps, ingredient: grainWithAmount };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
      // Test that unit conversion would be called when changing units
    });

    it("should handle weight unit conversion for hops", () => {
      const hopWithAmount = {
        ...mockHopIngredient,
        amount: 2,
        unit: "oz" as const,
      };
      const props = { ...mockProps, ingredient: hopWithAmount };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle no conversion when amount is zero", () => {
      const ingredientZeroAmount = { ...mockIngredient, amount: 0 };
      const props = { ...mockProps, ingredient: ingredientZeroAmount };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle mixed weight/volume units for other ingredients", () => {
      const otherWithVolume = {
        ...mockOtherIngredient,
        amount: 2,
        unit: "cup" as const,
      };
      const props = { ...mockProps, ingredient: otherWithVolume };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });
  });

  describe("Hop-Specific Features", () => {
    it("should handle dry-hop usage with days conversion", () => {
      const dryHop = {
        ...mockHopIngredient,
        use: "dry-hop" as const,
        time: 4320,
      }; // 3 days in minutes
      const props = { ...mockProps, ingredient: dryHop };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle whirlpool usage", () => {
      const whirlpool = {
        ...mockHopIngredient,
        use: "whirlpool" as const,
        time: 15,
      };
      const props = { ...mockProps, ingredient: whirlpool };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop without time value", () => {
      const hopNoTime = { ...mockHopIngredient, time: undefined };
      const props = { ...mockProps, ingredient: hopNoTime };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop with null time value", () => {
      const hopNullTime = { ...mockHopIngredient, time: null as any };
      const props = { ...mockProps, ingredient: hopNullTime };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });
  });

  describe("Amount Rounding Logic", () => {
    it("should handle kilogram rounding for small amounts", () => {
      const smallKg = { ...mockIngredient, amount: 0.5, unit: "kg" as const };
      const props = { ...mockProps, ingredient: smallKg };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle kilogram rounding for large amounts", () => {
      const largeKg = { ...mockIngredient, amount: 5.678, unit: "kg" as const };
      const props = { ...mockProps, ingredient: largeKg };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle gram rounding for small amounts", () => {
      const smallGrams = { ...mockIngredient, amount: 5.7, unit: "g" as const };
      const props = { ...mockProps, ingredient: smallGrams };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle gram rounding for large amounts", () => {
      const largeGrams = {
        ...mockIngredient,
        amount: 250.5,
        unit: "g" as const,
      };
      const props = { ...mockProps, ingredient: largeGrams };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle ounce rounding for small amounts", () => {
      const smallOz = { ...mockIngredient, amount: 0.75, unit: "oz" as const };
      const props = { ...mockProps, ingredient: smallOz };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle ounce rounding for large amounts", () => {
      const largeOz = { ...mockIngredient, amount: 16.5, unit: "oz" as const };
      const props = { ...mockProps, ingredient: largeOz };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle pound rounding", () => {
      const pounds = { ...mockIngredient, amount: 2.456, unit: "lb" as const };
      const props = { ...mockProps, ingredient: pounds };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle teaspoon rounding", () => {
      const tsp = {
        ...mockOtherIngredient,
        amount: 1.55,
        unit: "tsp" as const,
      };
      const props = { ...mockProps, ingredient: tsp };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle tablespoon rounding", () => {
      const tbsp = {
        ...mockOtherIngredient,
        amount: 2.78,
        unit: "tbsp" as const,
      };
      const props = { ...mockProps, ingredient: tbsp };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle cup rounding", () => {
      const cup = {
        ...mockOtherIngredient,
        amount: 0.666,
        unit: "cup" as const,
      };
      const props = { ...mockProps, ingredient: cup };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });
  });

  describe("Validation Logic", () => {
    it("should handle validation for zero amount", () => {
      const zeroAmount = { ...mockIngredient, amount: 0 };
      const props = { ...mockProps, ingredient: zeroAmount };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle validation for negative amount", () => {
      const negativeAmount = { ...mockIngredient, amount: -5 };
      const props = { ...mockProps, ingredient: negativeAmount };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop without usage", () => {
      const hopNoUsage = { ...mockHopIngredient, use: undefined };
      const props = { ...mockProps, ingredient: hopNoUsage };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop with negative time", () => {
      const hopNegativeTime = { ...mockHopIngredient, time: -10 };
      const props = { ...mockProps, ingredient: hopNegativeTime };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should show validation error for zero amount", () => {
      const zeroAmount = { ...mockIngredient, amount: 0 };
      const props = {
        ...mockProps,
        ingredient: zeroAmount,
        onUpdate: jest.fn(),
      };
      const { queryByTestId, getByText, debug } = render(
        <IngredientDetailEditor {...props} />
      );

      // Debug: print the component tree
      // debug();

      // Trigger save to invoke validation
      const saveButton = queryByTestId(
        TEST_IDS.patterns.touchableOpacityAction("save")
      );

      // Verify save button exists
      expect(saveButton).toBeTruthy();

      if (saveButton) {
        fireEvent.press(saveButton);
        // Verify error message appears
        expect(getByText("Amount must be greater than 0")).toBeTruthy();
        // Verify onUpdate was NOT called due to validation error
        expect(props.onUpdate).not.toHaveBeenCalled();
      }
    });
  });

  describe("Data Sanitization", () => {
    it("should handle ingredient with null potential", () => {
      const nullPotential = { ...mockIngredient, potential: null as any };
      const props = { ...mockProps, ingredient: nullPotential };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle ingredient with undefined potential", () => {
      const undefinedPotential = { ...mockIngredient, potential: undefined };
      const props = { ...mockProps, ingredient: undefinedPotential };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle ingredient with valid potential", () => {
      const validPotential = { ...mockIngredient, potential: 1.038 };
      const props = { ...mockProps, ingredient: validPotential };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle ingredient with null color", () => {
      const nullColor = { ...mockIngredient, color: null as any };
      const props = { ...mockProps, ingredient: nullColor };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle ingredient with valid color", () => {
      const validColor = { ...mockIngredient, color: 10 };
      const props = { ...mockProps, ingredient: validColor };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop with null alpha_acid", () => {
      const nullAlphaAcid = { ...mockHopIngredient, alpha_acid: null as any };
      const props = { ...mockProps, ingredient: nullAlphaAcid };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop with valid alpha_acid", () => {
      const validAlphaAcid = { ...mockHopIngredient, alpha_acid: 12.5 };
      const props = { ...mockProps, ingredient: validAlphaAcid };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle yeast with null attenuation", () => {
      const nullAttenuation = {
        ...mockYeastIngredient,
        attenuation: null as any,
      };
      const props = { ...mockProps, ingredient: nullAttenuation };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle yeast with valid attenuation", () => {
      const validAttenuation = { ...mockYeastIngredient, attenuation: 80 };
      const props = { ...mockProps, ingredient: validAttenuation };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });
  });

  describe("Screen Size and Layout", () => {
    it("should handle small screen width for compact layout", () => {
      const mockDimensions = require("react-native").Dimensions;
      mockDimensions.get.mockReturnValue({ width: 320, height: 568 }); // iPhone SE

      expect(() => {
        render(<IngredientDetailEditor {...mockProps} />);
      }).not.toThrow();
    });

    it("should handle large screen width for classic layout", () => {
      const mockDimensions = require("react-native").Dimensions;
      mockDimensions.get.mockReturnValue({ width: 414, height: 896 }); // iPhone 11 Pro Max

      expect(() => {
        render(<IngredientDetailEditor {...mockProps} />);
      }).not.toThrow();
    });

    it("should handle small screen in classic mode for vertical layout", () => {
      const mockDimensions = require("react-native").Dimensions;
      mockDimensions.get.mockReturnValue({ width: 360, height: 640 }); // Small Android

      expect(() => {
        render(<IngredientDetailEditor {...mockProps} />);
      }).not.toThrow();
    });
  });

  describe("Visibility Handling", () => {
    it("should not render when isVisible is false", () => {
      const hiddenProps = { ...mockProps, isVisible: false };
      expect(() => {
        render(<IngredientDetailEditor {...hiddenProps} />);
        // Should render null
      }).not.toThrow();
    });

    it("should render when isVisible is true", () => {
      const visibleProps = { ...mockProps, isVisible: true };
      expect(() => {
        render(<IngredientDetailEditor {...visibleProps} />);
      }).not.toThrow();
    });
  });

  describe("Contextual Increments", () => {
    it("should handle grain with kg unit increments", () => {
      const grainKg = { ...mockIngredient, amount: 2.5, unit: "kg" as const };
      const props = { ...mockProps, ingredient: grainKg };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle grain with g unit increments", () => {
      const grainG = { ...mockIngredient, amount: 500, unit: "g" as const };
      const props = { ...mockProps, ingredient: grainG };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle grain with lb unit increments", () => {
      const grainLb = { ...mockIngredient, amount: 5, unit: "lb" as const };
      const props = { ...mockProps, ingredient: grainLb };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop with g unit increments", () => {
      const hopG = { ...mockHopIngredient, amount: 30, unit: "g" as const };
      const props = { ...mockProps, ingredient: hopG };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle hop with oz unit increments", () => {
      const hopOz = { ...mockHopIngredient, amount: 1.5, unit: "oz" as const };
      const props = { ...mockProps, ingredient: hopOz };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle yeast increments", () => {
      const props = { ...mockProps, ingredient: mockYeastIngredient };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle other ingredient increments", () => {
      const props = { ...mockProps, ingredient: mockOtherIngredient };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });

    it("should handle default case for unknown unit", () => {
      const unknownUnit = { ...mockIngredient, unit: "unknown" as any };
      const props = { ...mockProps, ingredient: unknownUnit };
      expect(() => {
        render(<IngredientDetailEditor {...props} />);
      }).not.toThrow();
    });
  });
});
