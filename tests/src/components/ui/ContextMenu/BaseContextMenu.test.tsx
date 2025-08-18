import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert, TouchableOpacity, Text } from "react-native";
import * as Haptics from "expo-haptics";

import { BaseContextMenu, useContextMenu, BaseAction } from "@src/components/ui/ContextMenu/BaseContextMenu";
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
}));

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#000000",
      text: "#ffffff",
      textMuted: "#888888",
      error: "#ff0000",
    },
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
  calculateMenuPosition: jest.fn((position, dimensions) => ({ x: position.x, y: position.y })),
  calculateMenuHeight: jest.fn(() => 200),
  MENU_DIMENSIONS: { width: 250, height: 200 },
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, "alert");

interface TestItem {
  id: string;
  name: string;
  status: "active" | "inactive";
}

const mockItem: TestItem = {
  id: "test-1",
  name: "Test Item",
  status: "active",
};

const createMockActions = (overrides: Partial<BaseAction<TestItem>>[] = []): BaseAction<TestItem>[] => [
  {
    id: "view",
    title: "View",
    icon: "visibility",
    onPress: jest.fn(),
    ...overrides[0],
  },
  {
    id: "edit",
    title: "Edit",
    icon: "edit",
    onPress: jest.fn(),
    disabled: (item) => item.status === "inactive",
    ...overrides[1],
  },
  {
    id: "delete",
    title: "Delete",
    icon: "delete",
    onPress: jest.fn(),
    destructive: true,
    ...overrides[2],
  },
  {
    id: "hidden",
    title: "Hidden Action",
    icon: "visibility-off",
    onPress: jest.fn(),
    hidden: () => true,
    ...overrides[3],
  },
];

describe("BaseContextMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Visibility and Basic Rendering", () => {
    it("should not render when visible is false", () => {
      const actions = createMockActions();
      const { queryByTestId } = render(
        <BaseContextMenu
          visible={false}
          item={mockItem}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      expect(queryByTestId(TEST_IDS.contextMenu.modal)).toBeNull();
    });

    it("should not render when item is null", () => {
      const actions = createMockActions();
      const { queryByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={null}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      expect(queryByTestId(TEST_IDS.contextMenu.modal)).toBeNull();
    });

    it("should render menu when visible and item provided", () => {
      const actions = createMockActions();
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      expect(getByTestId(TEST_IDS.contextMenu.modal)).toBeTruthy();
      expect(getByTestId(TEST_IDS.contextMenu.overlay)).toBeTruthy();
      expect(getByTestId(TEST_IDS.contextMenu.container)).toBeTruthy();
    });

    it("should display title and subtitle correctly", () => {
      const actions = createMockActions();
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu Title"
          subtitle="Test Menu Subtitle"
        />
      );

      expect(getByTestId(TEST_IDS.contextMenu.title)).toHaveTextContent("Test Menu Title");
      expect(getByTestId(TEST_IDS.contextMenu.subtitle)).toHaveTextContent("Test Menu Subtitle");
    });
  });

  describe("Actions Filtering and Display", () => {
    it("should display visible actions and hide hidden ones", () => {
      const actions = createMockActions();
      const { getByTestId, queryByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      // Should show non-hidden actions
      expect(getByTestId(TEST_IDS.patterns.contextMenuAction("view"))).toBeTruthy();
      expect(getByTestId(TEST_IDS.patterns.contextMenuAction("edit"))).toBeTruthy();
      expect(getByTestId(TEST_IDS.patterns.contextMenuAction("delete"))).toBeTruthy();

      // Should hide hidden action
      expect(queryByTestId(TEST_IDS.patterns.contextMenuAction("hidden"))).toBeNull();
    });

    it("should properly disable actions based on disabled condition", () => {
      const inactiveItem: TestItem = { ...mockItem, status: "inactive" };
      const actions = createMockActions();
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={inactiveItem}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      const editAction = getByTestId(TEST_IDS.patterns.contextMenuAction("edit"));
      const viewAction = getByTestId(TEST_IDS.patterns.contextMenuAction("view"));

      // Edit should be disabled, view should be enabled
      expect(editAction.props.disabled).toBe(true);
      expect(viewAction.props.disabled).toBe(false);
    });
  });

  describe("Action Interactions", () => {
    it("should call onPress for non-destructive actions immediately", async () => {
      const actions = createMockActions();
      const mockOnPress = jest.fn();
      actions[0].onPress = mockOnPress; // view action

      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={mockOnClose}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      const viewAction = getByTestId(TEST_IDS.patterns.contextMenuAction("view"));
      
      await act(async () => {
        fireEvent.press(viewAction);
      });

      await waitFor(() => {
        expect(Haptics.selectionAsync).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnPress).toHaveBeenCalledWith(mockItem);
      });
    });

    it("should show confirmation alert for destructive actions", async () => {
      const actions = createMockActions();
      const mockOnPress = jest.fn();
      actions[2].onPress = mockOnPress; // delete action

      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={mockOnClose}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      const deleteAction = getByTestId(TEST_IDS.patterns.contextMenuAction("delete"));
      
      await act(async () => {
        fireEvent.press(deleteAction);
      });

      await waitFor(() => {
        expect(Haptics.selectionAsync).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          "Delete?",
          "Are you sure you want to delete?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: expect.any(Function) },
          ],
          { cancelable: true }
        );
      });
          // Trigger the destructive confirmation and ensure handler runs
          const lastCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
          const buttons = lastCall?.[2] as { text: string; style?: string; onPress?: () => void }[];
          const confirm = buttons?.find(b => b.style === "destructive");
          confirm?.onPress?.();
          await waitFor(() => {
            expect(mockOnPress).toHaveBeenCalledWith(mockItem);
          });
    });

    it("should not render when item is null", () => {
      const actions = createMockActions();
      const mockOnPress = jest.fn();
      actions[0].onPress = mockOnPress;

      const component = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      // Re-render with null item
      component.rerender(
        <BaseContextMenu
          visible={true}
          item={null}
          actions={actions}
          onClose={jest.fn()}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      // Component should not render when item is null
      expect(component.queryByTestId(TEST_IDS.contextMenu.modal)).toBeNull();
    });
  });

  describe("Menu Closing", () => {
    it("should close menu when cancel button is pressed", () => {
      const actions = createMockActions();
      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={mockOnClose}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      const cancelButton = getByTestId(TEST_IDS.contextMenu.cancelButton);
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should close menu when overlay is pressed", () => {
      const actions = createMockActions();
      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={mockOnClose}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      const overlay = getByTestId(TEST_IDS.contextMenu.overlay);
      fireEvent.press(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Position Handling", () => {
    it("should apply position styles when position is provided", () => {
      const actions = createMockActions();
      const position = { x: 100, y: 200 };
      const { getByTestId } = render(
        <BaseContextMenu
          visible={true}
          item={mockItem}
          actions={actions}
          onClose={jest.fn()}
          position={position}
          title="Test Menu"
          subtitle="Test Subtitle"
        />
      );

      const container = getByTestId(TEST_IDS.contextMenu.container);
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: "absolute",
            top: position.y,
            left: position.x,
            width: 250, // MENU_DIMENSIONS.width
          })
        ])
      );
    });
  });
});

describe("useContextMenu Hook", () => {
  const TestComponent = () => {
    const contextMenu = useContextMenu<TestItem>();
    
    return (
      <>
        {/* Test buttons to trigger hook functions */}
        <TouchableOpacity 
          testID="show-menu-btn"
          onPress={() => contextMenu.showMenu(mockItem, { x: 50, y: 100 })}
        />
        <TouchableOpacity 
          testID="hide-menu-btn"
          onPress={contextMenu.hideMenu}
        />
        
        {/* Display current state for testing */}
        <Text testID="visible-state">{contextMenu.visible.toString()}</Text>
        <Text testID="selected-item">{contextMenu.selectedItem?.id || "none"}</Text>
        <Text testID="position">{JSON.stringify(contextMenu.position || {})}</Text>
      </>
    );
  };

  it("should initialize with correct default values", () => {
    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId("visible-state")).toHaveTextContent("false");
    expect(getByTestId("selected-item")).toHaveTextContent("none");
    expect(getByTestId("position")).toHaveTextContent("{}");
  });

  it("should show menu with correct state", () => {
    const { getByTestId } = render(<TestComponent />);

    fireEvent.press(getByTestId("show-menu-btn"));

    expect(getByTestId("visible-state")).toHaveTextContent("true");
    expect(getByTestId("selected-item")).toHaveTextContent("test-1");
    expect(getByTestId("position")).toHaveTextContent('{"x":50,"y":100}');
  });

  it("should hide menu and reset state", () => {
    const { getByTestId } = render(<TestComponent />);

    // First show the menu
    fireEvent.press(getByTestId("show-menu-btn"));
    expect(getByTestId("visible-state")).toHaveTextContent("true");

    // Then hide it
    fireEvent.press(getByTestId("hide-menu-btn"));
    expect(getByTestId("visible-state")).toHaveTextContent("false");
    expect(getByTestId("selected-item")).toHaveTextContent("none");
    expect(getByTestId("position")).toHaveTextContent("{}");
  });
});