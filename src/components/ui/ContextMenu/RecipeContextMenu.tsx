/**
 * Recipe Context Menu Component
 *
 * Specialized context menu for recipe-related actions. Wraps the BaseContextMenu
 * (composition) with recipe-specific functionality and actions.
 *
 * Common Actions:
 * - View recipe details
 * - Edit recipe
 * - Clone recipe
 * - Export BeerXML
 * - Start brewing
 * - Delete recipe
 *
 * @remarks Wraps BaseContextMenu via composition.
 */

import React from "react";
import { Recipe } from "@src/types";
import { BaseContextMenu, BaseAction } from "./BaseContextMenu";
import { useUserValidation } from "@utils/userValidation";

interface RecipeContextMenuProps {
  visible: boolean;
  recipe: Recipe | null;
  actions: BaseAction<Recipe>[];
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
  if (!recipe) {
    return null;
  }

  const title = recipe.name || "Unnamed Recipe";
  const subtitle = recipe.style || "Unknown Style";

  return (
    <BaseContextMenu
      visible={visible}
      item={recipe}
      actions={actions}
      onClose={onClose}
      position={position}
      title={title}
      subtitle={subtitle}
    />
  );
}

/**
 * Default recipe actions factory function
 */
export function createDefaultRecipeActions(handlers: {
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onClone: (recipe: Recipe) => void;
  onBeerXMLExport: (recipe: Recipe) => void;
  onStartBrewing: (recipe: Recipe) => void;
  onStartBoilTimer: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}): BaseAction<Recipe>[] {
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
      // Hide edit action for public recipes that user doesn't own
      hidden: recipe => recipe.is_public && !recipe.is_owner,
    },
    {
      id: "clone",
      title: "Clone Recipe",
      icon: "content-copy",
      onPress: handlers.onClone,
    },
    {
      id: "beerxml-export",
      title: "Export BeerXML",
      icon: "file-download",
      onPress: handlers.onBeerXMLExport,
    },
    {
      id: "brew",
      title: "Start Brewing",
      icon: "play-arrow",
      onPress: handlers.onStartBrewing,
    },
    {
      id: "boil-timer",
      title: "Start Boil Timer",
      icon: "timer",
      onPress: handlers.onStartBoilTimer,
      // Only show for recipes with boil time and hop additions
      hidden: recipe => !recipe.boil_time || recipe.boil_time <= 0,
    },
    {
      id: "delete",
      title: "Delete Recipe",
      icon: "delete",
      onPress: handlers.onDelete,
      destructive: true,
      // Hide delete action for public recipes that user doesn't own
      hidden: recipe => recipe.is_public && !recipe.is_owner,
    },
  ];
}

/**
 * Filter recipe actions based on user ownership validation
 * Use this function to validate destructive actions before displaying the context menu
 *
 * @param actions - All possible actions
 * @param recipe - Recipe to validate ownership for
 * @param canUserModify - Result of canUserModifyResource validation
 * @returns Filtered actions array with destructive actions removed if user lacks permission
 */
export function filterRecipeActionsByOwnership(
  actions: BaseAction<Recipe>[],
  recipe: Recipe,
  canUserModify: boolean
): BaseAction<Recipe>[] {
  return actions.filter(action => {
    // For public recipes that user doesn't own, hide edit and delete actions
    if (recipe.is_public && !canUserModify) {
      return !["edit", "delete"].includes(action.id);
    }

    // For private recipes, use the validated ownership check for destructive actions
    if (["edit", "delete"].includes(action.id)) {
      return canUserModify;
    }

    // Keep all non-destructive actions
    return true;
  });
}

/**
 * React hook version for filtering actions with async validation
 * Use this in components that can handle async operations
 *
 * @param recipe - Recipe to validate
 * @returns Object with validated actions and loading state
 */
export function useValidatedRecipeActions(recipe: Recipe | null) {
  const { canUserModifyResource } = useUserValidation();
  const [canModify, setCanModify] = React.useState<boolean>(false);
  const [isValidating, setIsValidating] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!recipe) {
      setCanModify(false);
      return;
    }

    setIsValidating(true);
    canUserModifyResource({
      ...recipe,
      user_id: recipe.user_id || null, // Convert undefined to null for type compatibility
    })
      .then(setCanModify)
      .catch(error => {
        console.warn("Failed to validate recipe ownership:", error);
        setCanModify(false);
      })
      .finally(() => setIsValidating(false));
  }, [recipe, canUserModifyResource]);

  return {
    canModify,
    isValidating,
    getFilteredActions: (actions: BaseAction<Recipe>[]) =>
      recipe
        ? filterRecipeActionsByOwnership(actions, recipe, canModify)
        : actions,
  };
}
