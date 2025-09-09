import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@contexts/ThemeContext";
import { baseContextMenuStyles } from "@styles/ui/baseContextMenuStyles";
import { TEST_IDS } from "@src/constants/testIDs";
import {
  calculateMenuPosition,
  MENU_DIMENSIONS,
  calculateMenuHeight,
} from "./contextMenuUtils";

export interface BaseAction<T> {
  id: string;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: (item: T) => void;
  destructive?: boolean;
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}

interface BaseContextMenuProps<T> {
  visible: boolean;
  item: T | null;
  actions: BaseAction<T>[];
  onClose: () => void;
  position?: { x: number; y: number };
  title: string;
  subtitle: string;
}

/**
 * Generic context menu component that can be used for any data type.
 * Provides haptic feedback, smart positioning, and accessibility support.
 */
export function BaseContextMenu<T>({
  visible,
  item,
  actions,
  onClose,
  position,
  title,
  subtitle,
}: BaseContextMenuProps<T>) {
  const theme = useTheme();
  const styles = baseContextMenuStyles(theme);

  /**
   * Handles action press with haptic feedback and confirmation for destructive actions
   */
  const handleActionPress = async (action: BaseAction<T>) => {
    if (!item) {
      return;
    }

    // Provide haptic feedback (best-effort)
    try {
      await Haptics.selectionAsync();
    } catch {
      // no-op
    }
    // Close menu first
    onClose();

    // Execute all actions immediately - let the action handlers manage their own confirmations
    action.onPress(item);
  };

  /**
   * Filters actions based on item state and action conditions
   */
  const getVisibleActions = (): BaseAction<T>[] => {
    if (!item) {
      return [];
    }

    return actions.filter(action => {
      // Hide action if hidden condition is met
      if (action.hidden && action.hidden(item)) {
        return false;
      }
      return true;
    });
  };

  /**
   * Checks if an action should be disabled
   */
  const isActionDisabled = (action: BaseAction<T>): boolean => {
    if (!item) {
      return true;
    }
    if (action.disabled && action.disabled(item)) {
      return true;
    }
    return false;
  };

  if (!visible || !item) {
    return null;
  }

  const visibleActions = getVisibleActions();
  const menuHeight = calculateMenuHeight(visibleActions.length);
  const menuPosition = position
    ? calculateMenuPosition(position, {
        ...MENU_DIMENSIONS,
        height: menuHeight,
      })
    : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={TEST_IDS.contextMenu.modal}
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel={`Context menu for ${title}`}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} testID={TEST_IDS.contextMenu.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.menuContainer,
                menuPosition && {
                  position: "absolute",
                  top: menuPosition.y,
                  left: menuPosition.x,
                  width: MENU_DIMENSIONS.width,
                },
              ]}
              testID={TEST_IDS.contextMenu.container}
            >
              {/* Menu Header */}
              <View
                style={styles.menuHeader}
                testID={TEST_IDS.contextMenu.header}
              >
                <Text
                  style={styles.menuTitle}
                  numberOfLines={1}
                  testID={TEST_IDS.contextMenu.title}
                >
                  {title}
                </Text>
                <Text
                  style={styles.menuSubtitle}
                  testID={TEST_IDS.contextMenu.subtitle}
                >
                  {subtitle}
                </Text>
              </View>

              {/* Action List */}
              <View
                style={styles.actionsList}
                testID={TEST_IDS.contextMenu.actionsList}
              >
                {visibleActions.map(action => {
                  const disabled = isActionDisabled(action);

                  return (
                    <TouchableOpacity
                      key={action.id}
                      style={[
                        styles.actionItem,
                        disabled && styles.actionItemDisabled,
                        action.destructive && styles.actionItemDestructive,
                      ]}
                      onPress={() => handleActionPress(action)}
                      disabled={disabled}
                      activeOpacity={0.7}
                      testID={TEST_IDS.patterns.contextMenuAction(action.id)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled,
                      }}
                      accessibilityLabel={action.title}
                      accessibilityHint={
                        action.destructive
                          ? `${action.title} - This action is destructive and will require confirmation`
                          : `${action.title} for ${title}`
                      }
                    >
                      <MaterialIcons
                        name={action.icon}
                        size={20}
                        color={
                          disabled
                            ? theme.colors.textMuted
                            : action.destructive
                              ? theme.colors.error
                              : theme.colors.text
                        }
                      />
                      <Text
                        style={[
                          styles.actionText,
                          disabled && styles.actionTextDisabled,
                          action.destructive && styles.actionTextDestructive,
                        ]}
                      >
                        {action.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
                testID={TEST_IDS.contextMenu.cancelButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                accessibilityHint="Close this context menu"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Hook to manage context menu state
 */
export function useContextMenu<T>() {
  const [visible, setVisible] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);
  const [position, setPosition] = React.useState<
    { x: number; y: number } | undefined
  >();

  const showMenu = (item: T, touchPosition?: { x: number; y: number }) => {
    setSelectedItem(item);
    setPosition(touchPosition);
    setVisible(true);
  };

  const hideMenu = () => {
    setVisible(false);
    setSelectedItem(null);
    setPosition(undefined);
  };

  return {
    visible,
    selectedItem,
    position,
    showMenu,
    hideMenu,
  };
}
