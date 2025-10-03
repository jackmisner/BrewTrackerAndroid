/**
 * DryHopTracker Component Tests
 *
 * Comprehensive test suite for dry-hop tracking functionality:
 * - Recipe parsing using recipeUtils
 * - Status calculation (Ready/Added/Removed)
 * - Add/Remove actions with offline hooks
 * - Test ID accessibility
 * - Loading/error/empty states
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { DryHopTracker } from "@src/components/brewSessions/DryHopTracker";
import {
  Recipe,
  DryHopAddition,
  CreateDryHopFromRecipeRequest,
} from "@src/types";
import { getDryHopsFromRecipe } from "@utils/recipeUtils";
import { TEST_IDS } from "@src/constants/testIDs";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      surface: "#FFFFFF",
      background: "#F5F5F5",
      primary: "#f4511e",
      primaryText: "#000000",
      textSecondary: "#666666",
      success: "#4CAF50",
      warning: "#FF9800",
      white: "#FFFFFF",
    },
  }),
}));

jest.mock("react-native/Libraries/Alert/Alert", () => ({
  alert: jest.fn(),
}));

describe("DryHopTracker", () => {
  const mockRecipe: Recipe = {
    id: "recipe-1",
    name: "Test IPA",
    style: "IPA",
    description: "Test recipe",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    boil_time: 60,
    efficiency: 75,
    mash_temperature: 152,
    mash_temp_unit: "F",
    is_public: false,
    notes: "",
    ingredients: [
      {
        id: "ing-1",
        instance_id: "inst-1",
        name: "Cascade",
        type: "hop",
        amount: 2,
        unit: "oz",
        use: "dry-hop",
        time: 10080, // 7 days in minutes (7 * 1440)
        hop_type: "Pellet",
      },
      {
        id: "ing-2",
        instance_id: "inst-2",
        name: "Citra",
        type: "hop",
        amount: 1.5,
        unit: "oz",
        use: "dry_hop", // Test underscore variant
        time: 7200, // 5 days in minutes (5 * 1440)
        hop_type: "Pellet",
      },
      {
        id: "ing-3",
        instance_id: "inst-3",
        name: "Magnum",
        type: "hop",
        amount: 1,
        unit: "oz",
        use: "boil",
        time: 60,
      },
    ],
    user_id: "user-1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  } as Recipe;

  const mockOnAddDryHop = jest.fn();
  const mockOnRemoveDryHop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Recipe Parsing", () => {
    it("uses getDryHopsFromRecipe to extract dry-hops", () => {
      const dryHops = getDryHopsFromRecipe(mockRecipe.ingredients);
      expect(dryHops).toHaveLength(2);
      expect(dryHops[0].hop_name).toBe("Cascade");
      expect(dryHops[1].hop_name).toBe("Citra");
    });

    it("filters out non-dry-hop ingredients", () => {
      const dryHops = getDryHopsFromRecipe(mockRecipe.ingredients);
      const hopNames = dryHops.map(h => h.hop_name);
      expect(hopNames).not.toContain("Magnum"); // Boil hop should be filtered out
    });

    it("correctly transforms recipe ingredients to dry-hop requests", () => {
      const dryHops = getDryHopsFromRecipe(mockRecipe.ingredients);
      expect(dryHops[0]).toEqual({
        hop_name: "Cascade",
        hop_type: "Pellet",
        amount: 2,
        amount_unit: "oz",
        duration_days: 7,
        phase: "primary",
        recipe_instance_id: "inst-1",
      });
    });
  });

  describe("Rendering", () => {
    it("renders with correct test IDs", () => {
      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(
        getByTestId(TEST_IDS.patterns.sectionContainer("dry-hop-tracker"))
      ).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.iconElement("dry-hop"))
      ).toBeTruthy();
      expect(
        getByTestId(TEST_IDS.patterns.scrollAction("dry-hop-list"))
      ).toBeTruthy();
    });

    it("renders all dry-hops from recipe", () => {
      const { getByText } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(getByText("Cascade")).toBeTruthy();
      expect(getByText("2 oz • Pellet")).toBeTruthy();
      expect(getByText("Planned: 7 days")).toBeTruthy();

      expect(getByText("Citra")).toBeTruthy();
      expect(getByText("1.5 oz • Pellet")).toBeTruthy();
      expect(getByText("Planned: 5 days")).toBeTruthy();
    });

    it("renders title and header", () => {
      const { getByText } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(getByText("Dry Hop Schedule")).toBeTruthy();
    });
  });

  describe("Status Display", () => {
    it('shows "Ready to Add" status for dry-hops not yet added', () => {
      const { getAllByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const readyBadges = getAllByTestId(
        TEST_IDS.patterns.metricValue("dry-hop-status-ready")
      );
      expect(readyBadges.length).toBeGreaterThan(0);
    });

    it('shows "In Fermenter" status for added dry-hops', () => {
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(
        getByTestId(TEST_IDS.patterns.metricValue("dry-hop-status-added"))
      ).toBeTruthy();
    });

    it('shows "Removed" status for removed dry-hops', () => {
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          removal_date: "2024-01-22",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(
        getByTestId(TEST_IDS.patterns.metricValue("dry-hop-status-removed"))
      ).toBeTruthy();
    });

    it("calculates days in fermenter correctly", () => {
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          removal_date: "2024-01-22",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByText } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(getByText("7 days in fermenter")).toBeTruthy();
    });

    it("displays addition and removal dates", () => {
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          removal_date: "2024-01-22",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByText } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(getByText(/Added:/)).toBeTruthy();
      expect(getByText(/Removed:/)).toBeTruthy();
    });
  });

  describe("Action Buttons", () => {
    it('renders "Add to Fermenter" button for ready dry-hops', () => {
      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const addButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("add-dry-hop-cascade")
      );
      expect(addButton).toBeTruthy();
    });

    it('renders "Remove from Fermenter" button for added dry-hops', () => {
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const removeButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("remove-dry-hop-cascade")
      );
      expect(removeButton).toBeTruthy();
    });

    it('renders "Complete" indicator for removed dry-hops', () => {
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          removal_date: "2024-01-22",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByText } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(getByText("Complete")).toBeTruthy();
    });
  });

  describe("User Interactions", () => {
    it("calls onAddDryHop when Add button is pressed", async () => {
      mockOnAddDryHop.mockResolvedValueOnce(undefined);

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const addButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("add-dry-hop-cascade")
      );

      fireEvent.press(addButton);

      await waitFor(() => {
        expect(mockOnAddDryHop).toHaveBeenCalledWith({
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        });
      });
    });

    it("calls onRemoveDryHop when Remove button is pressed", async () => {
      mockOnRemoveDryHop.mockResolvedValueOnce(undefined);

      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const removeButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("remove-dry-hop-cascade")
      );

      fireEvent.press(removeButton);

      await waitFor(() => {
        expect(mockOnRemoveDryHop).toHaveBeenCalledWith(0); // Index 0
      });
    });

    it("shows loading state while processing", async () => {
      mockOnAddDryHop.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const addButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("add-dry-hop-cascade")
      );

      fireEvent.press(addButton);

      // Wait for state update - button should be disabled while processing
      await waitFor(() => {
        expect(addButton.props.disabled).toBe(true);
      });
    });

    it("shows error alert when add operation fails", async () => {
      mockOnAddDryHop.mockRejectedValueOnce(new Error("Network error"));

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const addButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("add-dry-hop-cascade")
      );

      fireEvent.press(addButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Error",
          "Failed to add Cascade to fermenter. Please try again."
        );
      });
    });

    it("shows error alert when remove operation fails", async () => {
      mockOnRemoveDryHop.mockRejectedValueOnce(new Error("Network error"));

      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const removeButton = getByTestId(
        TEST_IDS.patterns.touchableOpacityAction("remove-dry-hop-cascade")
      );

      fireEvent.press(removeButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Error",
          "Failed to remove Cascade from fermenter. Please try again."
        );
      });
    });
  });

  describe("Empty and Error States", () => {
    it("renders empty state when recipe has no dry-hops", () => {
      const recipeWithoutDryHops: Recipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: "ing-1",
            instance_id: "inst-1",
            name: "Magnum",
            type: "hop",
            amount: 1,
            unit: "oz",
            use: "boil",
            time: 60,
          },
        ],
      };

      const { getByText } = render(
        <DryHopTracker
          recipe={recipeWithoutDryHops}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(getByText("No dry-hops found in this recipe")).toBeTruthy();
      expect(
        getByText("Add dry-hop ingredients to your recipe to track them here")
      ).toBeTruthy();
    });

    it("renders null when recipe is null", () => {
      const { queryByTestId } = render(
        <DryHopTracker
          recipe={null}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(
        queryByTestId(TEST_IDS.patterns.sectionContainer("dry-hop-tracker"))
      ).toBeNull();
    });

    it("renders null when recipe is undefined", () => {
      const { queryByTestId } = render(
        <DryHopTracker
          recipe={undefined}
          sessionDryHops={[]}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      expect(
        queryByTestId(TEST_IDS.patterns.sectionContainer("dry-hop-tracker"))
      ).toBeNull();
    });
  });

  describe("Case-Insensitive Matching", () => {
    it("matches dry-hops case-insensitively", () => {
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "cascade", // lowercase
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-1",
        },
      ];

      const { getByTestId } = render(
        <DryHopTracker
          recipe={mockRecipe}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      // Should show "In Fermenter" status even though case doesn't match exactly
      expect(
        getByTestId(TEST_IDS.patterns.metricValue("dry-hop-status-added"))
      ).toBeTruthy();
    });
  });

  describe("Duplicate Hop Matching with instance_id", () => {
    it("disambiguates duplicate hops using recipe_instance_id", () => {
      // Create recipe with TWO Cascade hops (different instance_ids)
      const recipeWithDuplicateHops: Recipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: "ing-1",
            instance_id: "inst-cascade-1",
            name: "Cascade",
            type: "hop",
            amount: 2,
            unit: "oz",
            use: "dry-hop",
            time: 10080, // 7 days
            hop_type: "Pellet",
          },
          {
            id: "ing-2",
            instance_id: "inst-cascade-2",
            name: "Cascade", // DUPLICATE name, different instance
            type: "hop",
            amount: 1,
            unit: "oz",
            use: "dry-hop",
            time: 4320, // 3 days
            hop_type: "Pellet",
          },
        ],
      };

      // Add ONLY the first Cascade to fermenter
      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-cascade-1", // Matches first Cascade only
        },
      ];

      const { getAllByText, getAllByTestId } = render(
        <DryHopTracker
          recipe={recipeWithDuplicateHops}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      // Both Cascades should be rendered
      const cascadeElements = getAllByText("Cascade");
      expect(cascadeElements).toHaveLength(2);

      // First Cascade (inst-cascade-1) should show "added" status
      const addedStatuses = getAllByTestId(
        TEST_IDS.patterns.metricValue("dry-hop-status-added")
      );
      expect(addedStatuses).toHaveLength(1);

      // Second Cascade (inst-cascade-2) should show "ready" status
      const readyStatuses = getAllByTestId(
        TEST_IDS.patterns.metricValue("dry-hop-status-ready")
      );
      expect(readyStatuses).toHaveLength(1);

      // First Cascade should have "Remove from Fermenter" button
      const removeButton = getAllByTestId(
        TEST_IDS.patterns.touchableOpacityAction("remove-dry-hop-cascade")
      );
      expect(removeButton).toHaveLength(1);

      // Second Cascade should have "Add to Fermenter" button
      const addButton = getAllByTestId(
        TEST_IDS.patterns.touchableOpacityAction("add-dry-hop-cascade")
      );
      expect(addButton).toHaveLength(1);
    });

    it("calls onRemoveDryHop with correct index for duplicate hops", async () => {
      const recipeWithDuplicateHops: Recipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: "ing-1",
            instance_id: "inst-cascade-1",
            name: "Cascade",
            type: "hop",
            amount: 2,
            unit: "oz",
            use: "dry-hop",
            time: 10080,
            hop_type: "Pellet",
          },
          {
            id: "ing-2",
            instance_id: "inst-cascade-2",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            use: "dry-hop",
            time: 4320,
            hop_type: "Pellet",
          },
        ],
      };

      const sessionDryHops: DryHopAddition[] = [
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 2,
          amount_unit: "oz",
          addition_date: "2024-01-15",
          duration_days: 7,
          phase: "primary",
          recipe_instance_id: "inst-cascade-1", // First Cascade
        },
        {
          hop_name: "Cascade",
          hop_type: "Pellet",
          amount: 1,
          amount_unit: "oz",
          addition_date: "2024-01-16",
          duration_days: 3,
          phase: "primary",
          recipe_instance_id: "inst-cascade-2", // Second Cascade
        },
      ];

      const { getAllByTestId } = render(
        <DryHopTracker
          recipe={recipeWithDuplicateHops}
          sessionDryHops={sessionDryHops}
          onAddDryHop={mockOnAddDryHop}
          onRemoveDryHop={mockOnRemoveDryHop}
        />
      );

      const removeButtons = getAllByTestId(
        TEST_IDS.patterns.touchableOpacityAction("remove-dry-hop-cascade")
      );
      expect(removeButtons).toHaveLength(2);

      // Click first remove button (should call with index 0)
      fireEvent.press(removeButtons[0]);
      await waitFor(() => {
        expect(mockOnRemoveDryHop).toHaveBeenCalledWith(0);
      });

      jest.clearAllMocks();

      // Click second remove button (should call with index 1)
      fireEvent.press(removeButtons[1]);
      await waitFor(() => {
        expect(mockOnRemoveDryHop).toHaveBeenCalledWith(1);
      });
    });
  });
});
