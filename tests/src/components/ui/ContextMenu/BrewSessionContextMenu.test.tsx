import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders, testUtils } from "../../../../testUtils";
import { Alert } from "react-native";

import {
  BrewSessionContextMenu,
  createDefaultBrewSessionActions,
} from "@src/components/ui/ContextMenu/BrewSessionContextMenu";
import { BaseAction } from "@src/components/ui/ContextMenu/BaseContextMenu";
import { BrewSession, BrewSessionStatus } from "@src/types";
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
  Platform: { OS: "android" },
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

const createMockBrewSession = (
  overrides: Partial<BrewSession> = {}
): BrewSession => ({
  id: "session-1",
  recipe_id: "recipe-1",
  name: "Test Session",
  status: "active" as BrewSessionStatus,
  batch_size: 5,
  batch_size_unit: "gal",
  brew_date: "2023-01-01",
  notes: "Test notes",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  user_id: "user-1",
  fermentation_entries: [
    { entry_date: "2023-01-01", temperature: 65, gravity: 1.05 },
  ],
  ...overrides,
});

const createMockActionHandlers = () => ({
  onView: jest.fn(),
  onEdit: jest.fn(),
  onAddFermentationEntry: jest.fn(),
  onExportData: jest.fn(),
  onArchive: jest.fn(),
  onDelete: jest.fn(),
});

describe("BrewSessionContextMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();
  });

  describe("Visibility and Basic Rendering", () => {
    it("should not render when brewSession is null", () => {
      const actions: BaseAction<BrewSession>[] = [];
      const { queryByTestId } = renderWithProviders(
        <BrewSessionContextMenu
          visible={true}
          brewSession={null}
          actions={actions}
          onClose={jest.fn()}
        />
      );

      expect(queryByTestId(TEST_IDS.contextMenu.modal)).toBeNull();
    });

    it("should render menu when visible and brewSession provided", () => {
      const brewSession = createMockBrewSession();
      const actions: BaseAction<BrewSession>[] = [
        {
          id: "view",
          title: "View",
          icon: "visibility",
          onPress: jest.fn(),
        },
      ];

      const { getByTestId } = renderWithProviders(
        <BrewSessionContextMenu
          visible={true}
          brewSession={brewSession}
          actions={actions}
          onClose={jest.fn()}
        />
      );

      expect(getByTestId(TEST_IDS.contextMenu.modal)).toBeTruthy();
      expect(getByTestId(TEST_IDS.contextMenu.title)).toHaveTextContent(
        "Test Session"
      );
      expect(getByTestId(TEST_IDS.contextMenu.subtitle)).toHaveTextContent(
        "Active"
      );
    });

    it("should display unnamed session title when name is missing", () => {
      const brewSession = createMockBrewSession({ name: "" });
      const actions: BaseAction<BrewSession>[] = [];

      const { getByTestId } = renderWithProviders(
        <BrewSessionContextMenu
          visible={true}
          brewSession={brewSession}
          actions={actions}
          onClose={jest.fn()}
        />
      );

      expect(getByTestId(TEST_IDS.contextMenu.title)).toHaveTextContent(
        "Unnamed Session"
      );
    });
  });

  describe("Status Display", () => {
    const testCases: Array<{
      status: BrewSessionStatus;
      expectedDisplay: string;
    }> = [
      { status: "planned", expectedDisplay: "Planned" },
      { status: "active", expectedDisplay: "Active" },
      { status: "fermenting", expectedDisplay: "Fermenting" },
      { status: "in-progress", expectedDisplay: "In Progress" },
      { status: "conditioning", expectedDisplay: "Conditioning" },
      { status: "completed", expectedDisplay: "Completed" },
      { status: "archived", expectedDisplay: "Archived" },
      { status: "failed", expectedDisplay: "Failed" },
      { status: "paused", expectedDisplay: "Paused" },
    ];

    testCases.forEach(({ status, expectedDisplay }) => {
      it(`should display "${expectedDisplay}" for status "${status}"`, () => {
        const brewSession = createMockBrewSession({ status });
        const actions: BaseAction<BrewSession>[] = [];

        const { getByTestId } = renderWithProviders(
          <BrewSessionContextMenu
            visible={true}
            brewSession={brewSession}
            actions={actions}
            onClose={jest.fn()}
          />
        );

        expect(getByTestId(TEST_IDS.contextMenu.subtitle)).toHaveTextContent(
          expectedDisplay
        );
      });
    });

    it("should handle undefined status", () => {
      const brewSession = createMockBrewSession();
      delete (brewSession as any).status;
      const actions: BaseAction<BrewSession>[] = [];

      const { getByTestId } = renderWithProviders(
        <BrewSessionContextMenu
          visible={true}
          brewSession={brewSession}
          actions={actions}
          onClose={jest.fn()}
        />
      );

      expect(getByTestId(TEST_IDS.contextMenu.subtitle)).toHaveTextContent(
        "Unknown Status"
      );
    });
  });

  describe("Action Passing", () => {
    it("should pass through all props to BaseContextMenu", () => {
      const brewSession = createMockBrewSession();
      const actions: BaseAction<BrewSession>[] = [
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
        <BrewSessionContextMenu
          visible={true}
          brewSession={brewSession}
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

describe("createDefaultBrewSessionActions", () => {
  let handlers: ReturnType<typeof createMockActionHandlers>;

  beforeEach(() => {
    handlers = createMockActionHandlers();
  });

  describe("Action Creation", () => {
    it("should create all expected actions", () => {
      const actions = createDefaultBrewSessionActions(handlers);

      expect(actions).toHaveLength(6);
      expect(actions.map(a => a.id)).toEqual([
        "view",
        "edit",
        "add-fermentation",
        "export",
        "archive",
        "delete",
      ]);
    });

    it("should set correct properties for each action", () => {
      const actions = createDefaultBrewSessionActions(handlers);

      const viewAction = actions.find(a => a.id === "view");
      expect(viewAction).toEqual({
        id: "view",
        title: "View Session",
        icon: "visibility",
        onPress: handlers.onView,
      });

      const deleteAction = actions.find(a => a.id === "delete");
      expect(deleteAction?.destructive).toBe(true);

      const exportAction = actions.find(a => a.id === "export");
      expect(exportAction?.disabled).toBeDefined();
    });
  });

  describe("Action Visibility Rules", () => {
    it("should hide edit action for completed sessions", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const editAction = actions.find(a => a.id === "edit");
      const completedSession = createMockBrewSession({ status: "completed" });

      expect(editAction?.hidden?.(completedSession)).toBe(true);
    });

    it("should hide edit action for archived sessions", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const editAction = actions.find(a => a.id === "edit");
      const archivedSession = createMockBrewSession({ status: "archived" });

      expect(editAction?.hidden?.(archivedSession)).toBe(true);
    });

    it("should show edit action for active sessions", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const editAction = actions.find(a => a.id === "edit");
      const activeSession = createMockBrewSession({ status: "active" });

      expect(editAction?.hidden?.(activeSession)).toBe(false);
    });

    it("should show fermentation action only for active/fermenting/in-progress sessions", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const fermentationAction = actions.find(a => a.id === "add-fermentation");

      expect(
        fermentationAction?.hidden?.(
          createMockBrewSession({ status: "active" })
        )
      ).toBe(false);
      expect(
        fermentationAction?.hidden?.(
          createMockBrewSession({ status: "fermenting" })
        )
      ).toBe(false);
      expect(
        fermentationAction?.hidden?.(
          createMockBrewSession({ status: "in-progress" })
        )
      ).toBe(false);
      expect(
        fermentationAction?.hidden?.(
          createMockBrewSession({ status: "completed" })
        )
      ).toBe(true);
      expect(
        fermentationAction?.hidden?.(
          createMockBrewSession({ status: "planned" })
        )
      ).toBe(true);
    });

    it("should show archive action only for completed sessions", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const archiveAction = actions.find(a => a.id === "archive");

      expect(
        archiveAction?.hidden?.(createMockBrewSession({ status: "completed" }))
      ).toBe(false);
      expect(
        archiveAction?.hidden?.(createMockBrewSession({ status: "active" }))
      ).toBe(true);
      expect(
        archiveAction?.hidden?.(createMockBrewSession({ status: "archived" }))
      ).toBe(true);
    });
  });

  describe("Action Disabled Rules", () => {
    it("should disable export when no fermentation entries", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const exportAction = actions.find(a => a.id === "export");

      const sessionWithoutEntries = createMockBrewSession({
        fermentation_entries: undefined,
      });
      const sessionWithEmptyEntries = createMockBrewSession({
        fermentation_entries: [],
      });
      const sessionWithEntries = createMockBrewSession({
        fermentation_entries: [{ entry_date: "2023-01-01" }],
      });

      expect(exportAction?.disabled?.(sessionWithoutEntries)).toBe(true);
      expect(exportAction?.disabled?.(sessionWithEmptyEntries)).toBe(true);
      expect(exportAction?.disabled?.(sessionWithEntries)).toBe(false);
    });

    it("should disable delete for active and fermenting sessions", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const deleteAction = actions.find(a => a.id === "delete");

      expect(
        deleteAction?.disabled?.(createMockBrewSession({ status: "active" }))
      ).toBe(true);
      expect(
        deleteAction?.disabled?.(
          createMockBrewSession({ status: "fermenting" })
        )
      ).toBe(true);
      expect(
        deleteAction?.disabled?.(createMockBrewSession({ status: "completed" }))
      ).toBe(false);
      expect(
        deleteAction?.disabled?.(createMockBrewSession({ status: "planned" }))
      ).toBe(false);
    });
  });

  describe("Action Execution", () => {
    it("should call correct handler when action is pressed", () => {
      const actions = createDefaultBrewSessionActions(handlers);
      const brewSession = createMockBrewSession();

      const viewAction = actions.find(a => a.id === "view");
      viewAction?.onPress(brewSession);
      expect(handlers.onView).toHaveBeenCalledWith(brewSession);

      const editAction = actions.find(a => a.id === "edit");
      editAction?.onPress(brewSession);
      expect(handlers.onEdit).toHaveBeenCalledWith(brewSession);

      const deleteAction = actions.find(a => a.id === "delete");
      deleteAction?.onPress(brewSession);
      expect(handlers.onDelete).toHaveBeenCalledWith(brewSession);
    });
  });
});

// Integration test with BaseContextMenu
describe("BrewSessionContextMenu Integration", () => {
  it("should integrate properly with BaseContextMenu for action execution", async () => {
    const handlers = createMockActionHandlers();
    const actions = createDefaultBrewSessionActions(handlers);
    const brewSession = createMockBrewSession();

    const { getByTestId } = renderWithProviders(
      <BrewSessionContextMenu
        visible={true}
        brewSession={brewSession}
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
      expect(handlers.onView).toHaveBeenCalledWith(brewSession);
    });

    // Test destructive action does NOT show a generic confirmation (delegated to handler)
    const deleteAction = getByTestId(
      TEST_IDS.patterns.contextMenuAction("delete")
    );
    await act(async () => {
      fireEvent.press(deleteAction);
    });

    await waitFor(() => {
      expect(handlers.onDelete).toHaveBeenCalledWith(brewSession);
    });
    // Allow any queued microtasks to run before asserting the negative
    await act(async () => {
      await Promise.resolve();
    });
    // Should NOT show generic confirmation - let action handlers manage their own confirmations
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
