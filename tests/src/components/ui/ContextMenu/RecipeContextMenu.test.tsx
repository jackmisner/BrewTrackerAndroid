import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders, testUtils } from "../../../../testUtils";
import { Alert } from "react-native";

import {
  RecipeContextMenu,
  createDefaultRecipeActions,
} from "@src/components/ui/ContextMenu/RecipeContextMenu";
import { BaseAction } from "@src/components/ui/ContextMenu/BaseContextMenu";
import { Recipe } from "@src/types";
import { TEST_IDS } from "@src/constants/testIDs";

// Comprehensive React Native mocking to avoid ES6 module issues
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  Modal: "Modal",
  TouchableWithoutFeedback: "TouchableWithoutFeedback",
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

// Mock dependencies with comprehensive provider support
jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: () => ({
      colors: {
        background: "#000000",
        text: "#ffffff",
        textMuted: "#888888",
        error: "#ff0000",
      },
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock context providers for testUtils
jest.mock("@contexts/NetworkContext", () => {
  const React = require("react");
  return {
    NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
    useNetwork: () => ({ isConnected: true }),
  };
});

jest.mock("@contexts/DeveloperContext", () => {
  const React = require("react");
  return {
    DeveloperProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useDeveloper: () => ({ isDeveloperMode: false }),
  };
});

jest.mock("@contexts/UnitContext", () => {
  const React = require("react");
  return {
    UnitProvider: ({ children }: { children: React.ReactNode }) => children,
    useUnit: () => ({ temperatureUnit: "F", weightUnit: "lb" }),
  };
});

jest.mock("@contexts/CalculatorsContext", () => {
  const React = require("react");
  return {
    CalculatorsProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useCalculators: () => ({ state: {}, dispatch: jest.fn() }),
  };
});

jest.mock("@contexts/AuthContext", () => {
  const React = require("react");
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    }),
  };
});

// Mock user validation
jest.mock("@utils/userValidation", () => ({
  useUserValidation: () => ({
    canUserModifyResource: jest.fn().mockResolvedValue(true),
    validateUserOwnership: jest.fn().mockResolvedValue({ isValid: true }),
  }),
}));

jest.mock("@styles/ui/baseContextMenuStyles", () => ({
  baseContextMenuStyles: () => ({
    overlay: { flex: 1 },
    menuContainer: { padding: 16 },
    menuHeader: { marginBottom: 8 },
    menuTitle: { fontSize: 16 },
    menuSubtitle: { fontSize: 14 },
    actionsList: { marginVertical: 8 },
    actionItem: { flexDirection: "row", padding: 8 },
    actionItemDisabled: { opacity: 0.5 },
    actionItemDestructive: { color: "#ff0000" },
    actionText: { marginLeft: 8 },
    actionTextDisabled: { color: "#888888" },
    actionTextDestructive: { color: "#ff0000" },
    cancelButton: { padding: 12 },
    cancelButtonText: { textAlign: "center" },
  }),
}));

jest.mock("@src/components/ui/ContextMenu/contextMenuUtils", () => ({
  calculateMenuPosition: jest.fn((position, dimensions) => ({
    x: position.x,
    y: position.y,
  })),
  calculateMenuHeight: jest.fn(() => 200),
  MENU_DIMENSIONS: { width: 250, height: 200 },
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, "alert");

const createMockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: "recipe-1",
  name: "Test IPA",
  style: "American IPA",
  description: "A hoppy test recipe",
  batch_size: 5,
  batch_size_unit: "gal",
  unit_system: "imperial",
  boil_time: 60,
  efficiency: 72,
  mash_temperature: 152,
  mash_temp_unit: "F",
  mash_time: 60,
  is_public: false,
  notes: "Test notes",
  ingredients: [],
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  is_owner: true,
  ...overrides,
});

const createMockActionHandlers = () => ({
  onView: jest.fn(),
  onEdit: jest.fn(),
  onClone: jest.fn(),
  onBeerXMLExport: jest.fn(),
  onStartBrewing: jest.fn(),
  onStartBoilTimer: jest.fn(),
  onShare: jest.fn(),
  onDelete: jest.fn(),
});

describe("RecipeContextMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
  });

  describe("Visibility and Basic Rendering", () => {
    it("should not render when recipe is null", () => {
      const actions: BaseAction<Recipe>[] = [];
      const { queryByTestId } = renderWithProviders(
        <RecipeContextMenu
          visible={true}
          recipe={null}
          actions={actions}
          onClose={jest.fn()}
        />
      );

      expect(queryByTestId(TEST_IDS.contextMenu.modal)).toBeNull();
    });

    it("should render menu when visible and recipe provided", () => {
      const recipe = createMockRecipe();
      const actions: BaseAction<Recipe>[] = [
        {
          id: "view",
          title: "View",
          icon: "visibility",
          onPress: jest.fn(),
        },
      ];

      const { getByTestId } = renderWithProviders(
        <RecipeContextMenu
          visible={true}
          recipe={recipe}
          actions={actions}
          onClose={jest.fn()}
        />
      );

      expect(getByTestId(TEST_IDS.contextMenu.modal)).toBeTruthy();
      expect(getByTestId(TEST_IDS.contextMenu.title)).toHaveTextContent(
        "Test IPA"
      );
      expect(getByTestId(TEST_IDS.contextMenu.subtitle)).toHaveTextContent(
        "American IPA"
      );
    });

    it("should display fallback values when name and style are missing", () => {
      const recipe = createMockRecipe({ name: "", style: "" });
      const actions: BaseAction<Recipe>[] = [];

      const { getByTestId } = renderWithProviders(
        <RecipeContextMenu
          visible={true}
          recipe={recipe}
          actions={actions}
          onClose={jest.fn()}
        />
      );

      expect(getByTestId(TEST_IDS.contextMenu.title)).toHaveTextContent(
        "Unnamed Recipe"
      );
      expect(getByTestId(TEST_IDS.contextMenu.subtitle)).toHaveTextContent(
        "Unknown Style"
      );
    });
  });

  describe("Action Passing", () => {
    it("should pass through all props to BaseContextMenu", () => {
      const recipe = createMockRecipe();
      const actions: BaseAction<Recipe>[] = [
        {
          id: "test-action",
          title: "Test Action",
          icon: "edit",
          onPress: jest.fn(),
        },
      ];
      const position = { x: 100, y: 200 };
      const onClose = jest.fn();

      const { getByTestId } = renderWithProviders(
        <RecipeContextMenu
          visible={true}
          recipe={recipe}
          actions={actions}
          onClose={onClose}
          position={position}
        />
      );

      // Should pass the action through to BaseContextMenu
      expect(
        getByTestId(TEST_IDS.patterns.contextMenuAction("test-action"))
      ).toBeTruthy();

      // Should apply position
      const container = getByTestId(TEST_IDS.contextMenu.container);
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: "absolute",
            top: position.y,
            left: position.x,
            width: 250,
          }),
        ])
      );
    });
  });
});

describe("createDefaultRecipeActions", () => {
  let handlers: ReturnType<typeof createMockActionHandlers>;

  beforeEach(() => {
    handlers = createMockActionHandlers();
  });

  describe("Action Creation", () => {
    it("should create all expected actions", () => {
      const actions = createDefaultRecipeActions(handlers);

      expect(actions.map(a => a.id)).toEqual([
        "view",
        "edit",
        "clone",
        "beerxml-export",
        "brew",
        "boil-timer",
        "delete",
      ]);
    });

    it("should set correct properties for each action", () => {
      const actions = createDefaultRecipeActions(handlers);

      const viewAction = actions.find(a => a.id === "view");
      expect(viewAction).toEqual({
        id: "view",
        title: "View Recipe",
        icon: "visibility",
        onPress: handlers.onView,
      });

      const deleteAction = actions.find(a => a.id === "delete");
      expect(deleteAction?.destructive).toBe(true);

      const cloneAction = actions.find(a => a.id === "clone");
      expect(cloneAction?.hidden).toBeUndefined();
    });
  });

  describe("Action Visibility Rules", () => {
    describe("Edit Action", () => {
      it("should hide edit action for public recipes that user doesn't own", () => {
        const actions = createDefaultRecipeActions(handlers);
        const editAction = actions.find(a => a.id === "edit");
        const publicNotOwnedRecipe = createMockRecipe({
          is_public: true,
          is_owner: false,
        });

        expect(editAction?.hidden?.(publicNotOwnedRecipe)).toBe(true);
      });

      it("should show edit action for public recipes that user owns", () => {
        const actions = createDefaultRecipeActions(handlers);
        const editAction = actions.find(a => a.id === "edit");
        const publicOwnedRecipe = createMockRecipe({
          is_public: true,
          is_owner: true,
        });

        expect(editAction?.hidden?.(publicOwnedRecipe)).toBe(false);
      });

      it("should show edit action for private recipes", () => {
        const actions = createDefaultRecipeActions(handlers);
        const editAction = actions.find(a => a.id === "edit");
        const privateRecipe = createMockRecipe({
          is_public: false,
          is_owner: true,
        });

        expect(editAction?.hidden?.(privateRecipe)).toBe(false);
      });
    });

    describe("Delete Action", () => {
      it("should hide delete action for public recipes that user doesn't own", () => {
        const actions = createDefaultRecipeActions(handlers);
        const deleteAction = actions.find(a => a.id === "delete");
        const publicNotOwnedRecipe = createMockRecipe({
          is_public: true,
          is_owner: false,
        });

        expect(deleteAction?.hidden?.(publicNotOwnedRecipe)).toBe(true);
      });

      it("should show delete action for public recipes that user owns", () => {
        const actions = createDefaultRecipeActions(handlers);
        const deleteAction = actions.find(a => a.id === "delete");
        const publicOwnedRecipe = createMockRecipe({
          is_public: true,
          is_owner: true,
        });

        expect(deleteAction?.hidden?.(publicOwnedRecipe)).toBe(false);
      });

      it("should show delete action for private recipes", () => {
        const actions = createDefaultRecipeActions(handlers);
        const deleteAction = actions.find(a => a.id === "delete");
        const privateRecipe = createMockRecipe({
          is_public: false,
          is_owner: true,
        });

        expect(deleteAction?.hidden?.(privateRecipe)).toBe(false);
      });
    });
  });

  describe("Actions That Are Always Visible", () => {
    it("should always show view, clone, beerxml-export, and brew actions", () => {
      const actions = createDefaultRecipeActions(handlers);
      const alwaysVisibleActions = ["view", "clone", "beerxml-export", "brew"];
      const testRecipe = createMockRecipe({ is_public: true, is_owner: false });

      alwaysVisibleActions.forEach(actionId => {
        const action = actions.find(a => a.id === actionId);
        expect(action?.hidden).toBeUndefined();
      });
    });
  });

  describe("Action Execution", () => {
    it("should call correct handler when action is pressed", () => {
      const actions = createDefaultRecipeActions(handlers);
      const recipe = createMockRecipe();

      const viewAction = actions.find(a => a.id === "view");
      viewAction?.onPress(recipe);
      expect(handlers.onView).toHaveBeenCalledWith(recipe);

      const editAction = actions.find(a => a.id === "edit");
      editAction?.onPress(recipe);
      expect(handlers.onEdit).toHaveBeenCalledWith(recipe);

      const cloneAction = actions.find(a => a.id === "clone");
      cloneAction?.onPress(recipe);
      expect(handlers.onClone).toHaveBeenCalledWith(recipe);

      const deleteAction = actions.find(a => a.id === "delete");
      deleteAction?.onPress(recipe);
      expect(handlers.onDelete).toHaveBeenCalledWith(recipe);
    });
  });

  describe("Action Icons and Titles", () => {
    it("should have correct icons and titles for all actions", () => {
      const actions = createDefaultRecipeActions(handlers);

      const expectedActionsData = [
        { id: "view", title: "View Recipe", icon: "visibility" },
        { id: "edit", title: "Edit Recipe", icon: "edit" },
        { id: "clone", title: "Clone Recipe", icon: "content-copy" },
        {
          id: "beerxml-export",
          title: "Export BeerXML",
          icon: "file-download",
        },
        { id: "brew", title: "Start Brewing", icon: "play-arrow" },
        { id: "delete", title: "Delete Recipe", icon: "delete" },
      ];

      expectedActionsData.forEach(expected => {
        const action = actions.find(a => a.id === expected.id);
        expect(action?.title).toBe(expected.title);
        expect(action?.icon).toBe(expected.icon);
      });
    });
  });
});

// Integration test with BaseContextMenu
describe("RecipeContextMenu Integration", () => {
  it("should integrate properly with BaseContextMenu for action execution", async () => {
    const handlers = createMockActionHandlers();
    const actions = createDefaultRecipeActions(handlers);
    const recipe = createMockRecipe();

    const { getByTestId } = renderWithProviders(
      <RecipeContextMenu
        visible={true}
        recipe={recipe}
        actions={actions}
        onClose={jest.fn()}
      />
    );

    // Test non-destructive action
    const viewAction = getByTestId(TEST_IDS.patterns.contextMenuAction("view"));
    await act(async () => {
      fireEvent.press(viewAction);
    });

    await waitFor(() => {
      expect(handlers.onView).toHaveBeenCalledWith(recipe);
    });

    // Test destructive action calls handler directly (no generic confirmation)
    const deleteAction = getByTestId(
      TEST_IDS.patterns.contextMenuAction("delete")
    );
    await act(async () => {
      fireEvent.press(deleteAction);
    });

    await waitFor(() => {
      expect(handlers.onDelete).toHaveBeenCalledWith(recipe);
    });
    // Should NOT show generic confirmation - let action handlers manage their own confirmations
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("should handle recipe ownership and visibility properly in integrated context", async () => {
    const handlers = createMockActionHandlers();
    const actions = createDefaultRecipeActions(handlers);
    const publicNotOwnedRecipe = createMockRecipe({
      is_public: true,
      is_owner: false,
      name: "Public Recipe",
    });

    const { queryByTestId } = renderWithProviders(
      <RecipeContextMenu
        visible={true}
        recipe={publicNotOwnedRecipe}
        actions={actions}
        onClose={jest.fn()}
      />
    );

    // Edit and delete actions should be hidden
    expect(
      queryByTestId(TEST_IDS.patterns.contextMenuAction("edit"))
    ).toBeNull();
    expect(
      queryByTestId(TEST_IDS.patterns.contextMenuAction("delete"))
    ).toBeNull();

    // View, clone, export, and brew should still be visible
    expect(
      queryByTestId(TEST_IDS.patterns.contextMenuAction("view"))
    ).toBeTruthy();
    expect(
      queryByTestId(TEST_IDS.patterns.contextMenuAction("clone"))
    ).toBeTruthy();
    expect(
      queryByTestId(TEST_IDS.patterns.contextMenuAction("beerxml-export"))
    ).toBeTruthy();
    expect(
      queryByTestId(TEST_IDS.patterns.contextMenuAction("brew"))
    ).toBeTruthy();
  });
});
