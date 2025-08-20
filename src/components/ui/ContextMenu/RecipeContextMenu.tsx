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
 * - Share recipe
 * - Delete recipe
 *
 * @remarks Wraps BaseContextMenu via composition.
 */

import React from "react";
import { Recipe } from "@src/types";
import { BaseContextMenu, BaseAction } from "./BaseContextMenu";

export interface RecipeAction extends BaseAction<Recipe> {}

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
  if (!recipe) return null;

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
  onShare: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
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
      id: "share",
      title: "Share Recipe",
      icon: "share",
      onPress: handlers.onShare,
      // Hide share for already public recipes
      hidden: recipe => recipe.is_public,
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
