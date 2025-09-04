/**
 * Ingredient Picker Modal Screen
 *
 * Comprehensive ingredient selection interface for recipe building with advanced
 * search, filtering, and category browsing capabilities.
 *
 * Features:
 * - Real-time search with debouncing (500ms delay)
 * - Category-based filtering (grain types, yeast types, etc.)
 * - Ingredient type filtering (grain, hop, yeast, other)
 * - Unit-aware amount and time editing
 * - Hop-specific usage and time configuration
 * - Detailed ingredient information display
 * - Optimized performance with virtualized lists
 *
 * The picker loads ingredients from the backend API with proper caching and
 * allows users to select, configure amounts/units, and add to their recipe.
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push({
 *   pathname: '/(modals)/(recipes)/ingredientPicker',
 *   params: { recipeId: '123', stepIndex: '2' }
 * });
 * ```
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import ApiService from "@services/api/apiService";
import { useDebounce } from "@src/hooks/useDebounce";
import { RecipeIngredient, IngredientType, IngredientUnit } from "@src/types";
import { ingredientPickerStyles } from "@styles/modals/ingredientPickerStyles";
import { IngredientDetailEditor } from "@src/components/recipes/IngredientEditor/IngredientDetailEditor";
import { HOP_USAGE_OPTIONS } from "@constants/hopConstants";
import { formatIngredientDetails } from "@utils/formatUtils";

/**
 * Ingredient categories for filtering (matching backend grain_type values)
 * Organizes ingredients by functional categories to improve searchability
 */
const INGREDIENT_CATEGORIES = {
  grain: [
    "base_malt",
    "caramel_crystal",
    "roasted",
    "specialty_malt",
    "adjunct_grain",
    "smoked",
  ],
  // hop: ["Bittering", "Aroma", "Dual Purpose", "Noble"], // Disabled - no hop_type field in backend
  yeast: [
    "american_ale",
    "belgian_ale",
    "english_ale",
    "lager",
    "wheat",
    "wild",
  ], // Match backend yeast_type values
  other: ["Spice", "Fruit", "Clarifying Agent", "Water Treatment"],
};

// Human-readable category labels
const CATEGORY_LABELS: Record<string, string> = {
  // Grain types
  base_malt: "Base Malts",
  caramel_crystal: "Caramel/Crystal",
  roasted: "Roasted",
  specialty_malt: "Specialty",
  adjunct_grain: "Adjunct",
  smoked: "Smoked",
  // Hop types
  Bittering: "Bittering",
  Aroma: "Aroma",
  "Dual Purpose": "Dual Purpose",
  Noble: "Noble",
  // Yeast types
  american_ale: "American",
  belgian_ale: "Belgian",
  english_ale: "English",
  lager: "Lager",
  wheat: "Wheat",
  wild: "Wild/Sour",
  // Other types
  Spice: "Spice",
  Fruit: "Fruit",
  "Clarifying Agent": "Clarifying Agent",
  "Water Treatment": "Water Treatment",
};

// Legacy constants for basic quantity form removed - IngredientDetailEditor has its own unit/hop handling

/**
 * Creates a complete RecipeIngredient with sensible defaults for editing
 */
const createRecipeIngredientWithDefaults = (
  baseIngredient: RecipeIngredient,
  ingredientType: IngredientType,
  unitSystem: "imperial" | "metric"
): RecipeIngredient => {
  // Default amounts by type and unit system
  const getDefaultAmount = (type: IngredientType): number => {
    switch (type) {
      case "grain":
        return unitSystem === "imperial" ? 1.0 : 1.0; //
      case "hop":
        return unitSystem === "imperial" ? 1.0 : 30; // 1 oz ≈ 28g
      case "yeast":
        return 1; // 1 package
      case "other":
        return unitSystem === "imperial" ? 1 : 15; // 0.5 oz ≈ 14g
      default:
        return 1.0;
    }
  };

  // Default units by type and unit system
  const getDefaultUnit = (type: IngredientType): IngredientUnit => {
    switch (type) {
      case "grain":
        return unitSystem === "imperial" ? "lb" : "kg";
      case "hop":
        return unitSystem === "imperial" ? "oz" : "g";
      case "yeast":
        return "pkg";
      case "other":
        return unitSystem === "imperial" ? "oz" : "g";
      default:
        return "oz";
    }
  };

  const recipeIngredient: RecipeIngredient = {
    ...baseIngredient,
    type: ingredientType, // Ensure the type is explicitly set
    amount: getDefaultAmount(ingredientType),
    unit: getDefaultUnit(ingredientType),
  };

  // Add hop-specific defaults
  if (ingredientType === "hop") {
    const defaultUsage = HOP_USAGE_OPTIONS[0]; // Default to boil
    recipeIngredient.use = defaultUsage.value;
    recipeIngredient.time = defaultUsage.defaultTime;
  }

  return recipeIngredient;
};

/**
 * Displays a modal screen for selecting an ingredient by type, with filtering, searching, sorting, and quantity/unit input.
 *
 * Allows users to browse, search, and filter ingredients by category, select an ingredient, specify its quantity and unit, and confirm the selection. Integrates with navigation to return the selected ingredient and amount to the previous screen. Handles loading, error, and empty states for ingredient data.
 */
export default function IngredientPickerScreen() {
  const theme = useTheme();
  const { unitSystem } = useUnits();
  const styles = ingredientPickerStyles(theme);
  const params = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // New state for IngredientDetailEditor integration
  const [editingIngredient, setEditingIngredient] =
    useState<RecipeIngredient | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Legacy selectedIngredient kept for potential future use
  // (IngredientDetailEditor now manages the working ingredient state)

  // Update hop time default when hop usage changes

  const ingredientType = (params.type as IngredientType) || "grain";

  // Fetch ingredients based on type and search
  const {
    data: ingredients = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ingredients", ingredientType, debouncedQuery, selectedCategory],
    queryFn: async () => {
      // API service now handles response transformation and error handling
      const response = await ApiService.ingredients.getAll(
        ingredientType,
        debouncedQuery || undefined,
        selectedCategory || undefined
      );

      return response;
    },
    select: response => {
      const selectedData = response?.data || [];
      return selectedData;
    },
    retry: (failureCount, error: any) => {
      // Only retry network errors, not auth errors
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Legacy useEffect for setting default units/amounts removed - IngredientDetailEditor handles defaults

  // Custom sorting function for ingredients with special handling for caramel malts and candi syrups
  // Based on the sophisticated algorithm from BrewTracker web frontend
  const sortIngredients = useMemo(() => {
    return (ingredients: RecipeIngredient[]): RecipeIngredient[] => {
      return [...ingredients].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Check for caramel malts (e.g., "caramel 60", "caramel/crystal 40L", "caramel malt - 120L")
        const caramelRegex =
          /(?:caramel|crystal)[\s/-]*(?:malt[\s-]*)?(\d+)l?/i;
        const aCaramelMatch = aName.match(caramelRegex);
        const bCaramelMatch = bName.match(caramelRegex);

        if (aCaramelMatch && bCaramelMatch) {
          // Both are caramel malts - sort by number
          const aNum = parseInt(aCaramelMatch[1]);
          const bNum = parseInt(bCaramelMatch[1]);
          return aNum - bNum;
        } else if (aCaramelMatch && !bCaramelMatch) {
          // Only a is caramel - check if b starts with caramel/crystal
          if (bName.startsWith("caramel") || bName.startsWith("crystal")) {
            return -1; // a (with number) comes before b (without number)
          }
          return aName.localeCompare(bName, undefined, { sensitivity: "base" });
        } else if (!aCaramelMatch && bCaramelMatch) {
          // Only b is caramel - check if a starts with caramel/crystal
          if (aName.startsWith("caramel") || aName.startsWith("crystal")) {
            return 1; // b (with number) comes before a (without number)
          }
          return aName.localeCompare(bName, undefined, { sensitivity: "base" });
        }

        // Check for candi syrups (e.g., "D-45", "D-180")
        const candiRegex = /d-(\d+)/i;
        const aCandiMatch = aName.match(candiRegex);
        const bCandiMatch = bName.match(candiRegex);

        if (aCandiMatch && bCandiMatch) {
          // Both are candi syrups - sort by number
          const aNum = parseInt(aCandiMatch[1]);
          const bNum = parseInt(bCandiMatch[1]);
          return aNum - bNum;
        } else if (aCandiMatch && !bCandiMatch) {
          // Only a is candi syrup - check if b starts with 'candi' or 'd-'
          if (bName.includes("candi") || bName.startsWith("d-")) {
            return -1; // a (with number) comes before b (without number)
          }
          return aName.localeCompare(bName, undefined, { sensitivity: "base" });
        } else if (!aCandiMatch && bCandiMatch) {
          // Only b is candi syrup - check if a starts with 'candi' or 'd-'
          if (aName.includes("candi") || aName.startsWith("d-")) {
            return 1; // b (with number) comes before a (without number)
          }
          return aName.localeCompare(bName, undefined, { sensitivity: "base" });
        }

        // Default alphabetical sorting
        return aName.localeCompare(bName, undefined, { sensitivity: "base" });
      });
    };
  }, []);

  // Filter and sort ingredients (backend handles category/search filtering)
  const filteredIngredients = useMemo(() => {
    // Ensure ingredients is always an array
    const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

    if (safeIngredients.length === 0) {
      return [];
    }

    // Apply smart sorting (backend handles search and category filtering)
    const sortedIngredients = sortIngredients(safeIngredients);

    return sortedIngredients;
  }, [ingredients, sortIngredients]);

  const handleIngredientSelect = (ingredient: RecipeIngredient) => {
    // Create a complete RecipeIngredient with defaults for editing
    const ingredientWithDefaults = createRecipeIngredientWithDefaults(
      ingredient,
      ingredientType,
      unitSystem
    );

    setEditingIngredient(ingredientWithDefaults);
    setShowEditor(true);
  };

  /**
   * Handles saving the ingredient from IngredientDetailEditor
   */
  const handleSaveIngredient = (finalIngredient: RecipeIngredient) => {
    // Navigate back with the configured ingredient
    router.setParams({
      selectedIngredient: JSON.stringify(finalIngredient),
    });
    router.back();
  };

  /**
   * Handles canceling the ingredient editor
   */
  const handleCancelEditor = () => {
    setShowEditor(false);
    setEditingIngredient(null);
  };

  /**
   * This shouldn't be called since we don't allow removing from picker, but required by IngredientDetailEditor
   */
  const handleRemoveIngredient = () => {
    setShowEditor(false);
    setEditingIngredient(null);
  };

  // Legacy ingredient validation and creation functions removed - IngredientDetailEditor provides all this functionality

  const handleCancel = () => {
    router.back();
  };

  const renderIngredientItem = ({ item }: { item: RecipeIngredient }) => (
    <TouchableOpacity
      style={styles.ingredientItem}
      onPress={() => handleIngredientSelect(item)}
    >
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.ingredientDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Type-specific info using shared formatting utilities */}
        <View style={styles.ingredientSpecs}>
          <Text style={styles.specText}>{formatIngredientDetails(item)}</Text>
        </View>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={20}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => {
    const categories =
      (INGREDIENT_CATEGORIES as Record<string, string[]>)[ingredientType] || [];

    // Don't render category filter for 'other' ingredients or 'hop' (no hop_type field in backend)
    if (ingredientType === "other" || ingredientType === "hop") {
      return null;
    }

    return (
      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory("")}
          >
            <Text
              style={[
                styles.categoryChipText,
                !selectedCategory && styles.categoryChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === category ? "" : category
                )
              }
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category &&
                    styles.categoryChipTextActive,
                ]}
              >
                {CATEGORY_LABELS[category] || category || "Unknown"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Legacy renderQuantityInput removed - IngredientDetailEditor provides advanced ingredient configuration

  const getTypeTitle = () => {
    const titles = {
      grain: "Grains & Fermentables",
      hop: "Hops",
      yeast: "Yeast",
      other: "Other Ingredients",
    };
    return titles[ingredientType] || "Ingredients";
  };

  // Note: Legacy showQuantityInput removed - now using IngredientDetailEditor

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTypeTitle()}</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${getTypeTitle().toLowerCase()}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="search"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialIcons
              name="clear"
              size={20}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Ingredients List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading ingredients...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorTitle}>Failed to load ingredients</Text>
          <Text style={styles.errorMessage}>
            {(error as any)?.response?.status === 401
              ? "Authentication required. Please log in again."
              : "Check your connection and try again"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredIngredients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="search-off"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyTitle}>No ingredients found</Text>
          <Text style={styles.emptyMessage}>
            {searchQuery && searchQuery.trim()
              ? "Try adjusting your search terms"
              : "No ingredients available"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredIngredients}
          renderItem={renderIngredientItem}
          keyExtractor={(item, index) =>
            item.id?.toString() || `ingredient-${index}`
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* IngredientDetailEditor for advanced ingredient configuration */}
      {editingIngredient ? (
        <IngredientDetailEditor
          ingredient={editingIngredient}
          onUpdate={handleSaveIngredient}
          onCancel={handleCancelEditor}
          onRemove={handleRemoveIngredient}
          isVisible={showEditor}
        />
      ) : null}
    </View>
  );
}
