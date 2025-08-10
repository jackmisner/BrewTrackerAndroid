import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Dimensions
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@contexts/ThemeContext";
import { Recipe } from "@src/types";
import { recipeContextMenuStyles } from "@styles/ui/recipeContextMenuStyles";

export interface RecipeAction {
  id: string;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: (recipe: Recipe) => void;
  destructive?: boolean;
  disabled?: (recipe: Recipe) => boolean;
  hidden?: (recipe: Recipe) => boolean;
}

interface RecipeContextMenuProps {
  visible: boolean;
  recipe: Recipe | null;
  actions: RecipeAction[];
  onClose: () => void;
  position?: { x: number; y: number };
}

/**
 * Context menu component for recipe actions with haptic feedback and accessibility support.
 *
 * Provides a modal-based action list that appears when long-pressing on recipe items.
 * Supports different action types (view, edit, clone, delete) with proper visual feedback
 * and confirmation dialogs for destructive actions.
 */
export function RecipeContextMenu({
  visible,
  recipe,
  actions,
  onClose,
  position,
}: RecipeContextMenuProps) {
  const theme = useTheme();
  const styles = recipeContextMenuStyles(theme);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const menuWidth = 200; // Approximate menu width
  const menuHeight = 300; // Approximate menu height


  /**
   * Handles action press with haptic feedback
   */
  const handleActionPress = async (action: RecipeAction) => {
    if (!recipe) return;

    // Provide haptic feedback
    await Haptics.selectionAsync();

    // Close menu first
    onClose();

    // Handle destructive actions with confirmation
    if (action.destructive) {
      Alert.alert(
        `${action.title}?`,
        `Are you sure you want to ${action.title.toLowerCase()} "${recipe.name}"?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: action.title,
            style: "destructive",
            onPress: () => action.onPress(recipe),
          },
        ],
        { cancelable: true }
      );
    } else {
      // Execute non-destructive actions immediately
      action.onPress(recipe);
    }
  };

  /**
   * Filters actions based on recipe state and action conditions
   */
  const getVisibleActions = (): RecipeAction[] => {
    if (!recipe) return [];

    return actions.filter(action => {
      // Hide action if hidden condition is met
      if (action.hidden && action.hidden(recipe)) {
        return false;
      }
      return true;
    });
  };

  /**
   * Checks if an action should be disabled
   */
  const isActionDisabled = (action: RecipeAction): boolean => {
    if (!recipe) return true;
    if (action.disabled && action.disabled(recipe)) {
      return true;
    }
    return false;
  };

  if (!visible || !recipe) {
    return null;
  }

  const visibleActions = getVisibleActions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.menuContainer,
                position && {
                  top: Math.min(Math.max(position.y - 100, 50), screenHeight - menuHeight),
                  left: Math.min(Math.max(position.x - menuWidth / 2, 20), screenWidth - menuWidth - 20),
                },
              ]}
            >
              {/* Menu Header */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle} numberOfLines={1}>
                  {recipe.name}
                </Text>
                <Text style={styles.menuSubtitle}>
                  {recipe.style || "Unknown Style"}
                </Text>
              </View>

              {/* Action List */}
              <View style={styles.actionsList}>
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
 * Default recipe actions factory function
 */
export function createDefaultRecipeActions(handlers: {
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onClone: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onStartBrewing: (recipe: Recipe) => void;
}): RecipeAction[] {
  return [
    {
      id: "view",
      title: "View Recipe",
      icon: "visibility",
      onPress: handlers.onView,
    },
    {
      id: "edit",
      title: "Edit Recipe",
      icon: "edit",
      onPress: handlers.onEdit,
      // Hide edit for public recipes that aren't owned by the user
      hidden: recipe => recipe.is_public && !recipe.is_owner,
    },
    {
      id: "clone",
      title: "Clone Recipe",
      icon: "content-copy",
      onPress: handlers.onClone,
    },
    {
      id: "brew",
      title: "Start Brewing",
      icon: "play-arrow",
      onPress: handlers.onStartBrewing,
    },
    {
      id: "delete",
      title: "Delete Recipe",
      icon: "delete",
      onPress: handlers.onDelete,
      destructive: true,
      // Hide delete for public recipes that aren't owned by the user
      hidden: recipe => recipe.is_public && !recipe.is_owner,
    },
  ];
}
