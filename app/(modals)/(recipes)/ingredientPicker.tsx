import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import ApiService from "@services/API/apiService";
import { RecipeIngredient, IngredientType, IngredientUnit } from "@src/types";
import { ingredientPickerStyles } from "@styles/modals/ingredientPickerStyles";

// Ingredient categories for filtering (matching backend grain_type values)
const INGREDIENT_CATEGORIES = {
  grain: [
    "base_malt",
    "caramel_crystal",
    "roasted",
    "specialty_malt",
    "adjunct_grain",
    "smoked",
  ],
  hop: ["Bittering", "Aroma", "Dual Purpose", "Noble"],
  yeast: ["Ale", "Lager", "Wild/Sour", "Belgian"],
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
  Ale: "Ale",
  Lager: "Lager",
  "Wild/Sour": "Wild/Sour",
  Belgian: "Belgian",
  // Other types
  Spice: "Spice",
  Fruit: "Fruit",
  "Clarifying Agent": "Clarifying Agent",
  "Water Treatment": "Water Treatment",
};

// Units by ingredient type
const UNITS_BY_TYPE = {
  grain: ["lb", "kg", "g", "oz"],
  hop: ["oz", "g"],
  yeast: ["pkg", "g"],
  other: ["tsp", "tbsp", "cup", "oz", "g", "ml", "l"],
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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedIngredient, setSelectedIngredient] =
    useState<RecipeIngredient | null>(null);
  const [amount, setAmount] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState<IngredientUnit>("lb");
  const [showQuantityInput, setShowQuantityInput] = useState(false);

  const ingredientType = (params.type as IngredientType) || "grain";

  // Fetch ingredients based on type and search
  const {
    data: ingredients = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ingredients", ingredientType, searchQuery, selectedCategory],
    queryFn: async () => {
      let searchTerm = searchQuery;
      if (selectedCategory) {
        searchTerm = selectedCategory + (searchQuery ? ` ${searchQuery}` : "");
      }

      // API service now handles response transformation and error handling
      const response = await ApiService.ingredients.getAll(
        ingredientType,
        searchTerm
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

  // Set default unit based on ingredient type and unit system
  useEffect(() => {
    const defaultUnits = {
      grain: unitSystem === "imperial" ? "lb" : "kg",
      hop: unitSystem === "imperial" ? "oz" : "g",
      yeast: "pkg",
      other: unitSystem === "imperial" ? "oz" : "g",
    };
    setSelectedUnit(defaultUnits[ingredientType] as IngredientUnit);
  }, [ingredientType, unitSystem]);

  // Custom sorting function for ingredients with special handling for caramel malts and candi syrups
  // Based on the sophisticated algorithm from BrewTracker web frontend
  const sortIngredients = useMemo(() => {
    return (ingredients: RecipeIngredient[]): RecipeIngredient[] => {
      return [...ingredients].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Check for caramel malts (e.g., "caramel 60", "caramel/crystal 40L", "caramel malt - 120L")
        const caramelRegex =
          /(?:caramel|crystal)[\s\/-]*(?:malt[\s-]*)?(\d+)l?/i;
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

  // Filter ingredients based on search and category
  const filteredIngredients = useMemo(() => {
    // Ensure ingredients is always an array
    const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

    if (safeIngredients.length === 0) {
      return [];
    }

    let filtered = safeIngredients;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      filtered = filtered.filter(
        ingredient =>
          ingredient.name.toLowerCase().includes(query) ||
          ingredient.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory.trim()) {
      filtered = filtered.filter(ingredient => {
        if (ingredientType === "grain") {
          // For grains, filter by grain_type field
          const ingredientGrainType = ingredient.grain_type;
          return ingredientGrainType === selectedCategory;
        } else if (ingredientType === "hop") {
          // For hops, filter by hop_type field
          return ingredient.hop_type === selectedCategory;
        } else if (ingredientType === "yeast") {
          // For yeast, filter by yeast_type field
          return ingredient.yeast_type === selectedCategory;
        }
        // For other types, no filtering is applied since category UI is disabled
        return true;
      });
    }

    // Apply smart sorting
    const sortedFiltered = sortIngredients(filtered);

    return sortedFiltered;
  }, [
    ingredientType,
    ingredients,
    searchQuery,
    selectedCategory,
    sortIngredients,
  ]);

  const handleIngredientSelect = (ingredient: RecipeIngredient) => {
    setSelectedIngredient(ingredient);
    setShowQuantityInput(true);
  };

  const handleConfirmSelection = () => {
    if (!selectedIngredient) {
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0"
      );
      return;
    }

    // Create the ingredient with quantity
    const ingredientWithQuantity: RecipeIngredient = {
      ...selectedIngredient,
      amount: numAmount,
      unit: selectedUnit,
    };

    // Navigate back with the selected ingredient as a parameter
    router.setParams({
      selectedIngredient: JSON.stringify(ingredientWithQuantity),
    });
    router.back();
  };

  const handleCancel = () => {
    if (showQuantityInput) {
      setShowQuantityInput(false);
      setSelectedIngredient(null);
    } else {
      router.back();
    }
  };

  const renderIngredientItem = ({ item }: { item: RecipeIngredient }) => (
    <TouchableOpacity
      style={styles.ingredientItem}
      onPress={() => handleIngredientSelect(item)}
    >
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.ingredientDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Type-specific info */}
        {ingredientType === "grain" && (
          <View style={styles.ingredientSpecs}>
            {item.potential && (
              <Text style={styles.specText}>
                {Math.round(item.potential * 46)} ppg
              </Text>
            )}
            {item.color && <Text style={styles.specText}>{item.color}°L</Text>}
          </View>
        )}

        {ingredientType === "hop" && (
          <View style={styles.ingredientSpecs}>
            {item.alpha_acid && (
              <Text style={styles.specText}>{item.alpha_acid}% AA</Text>
            )}
            {item.hop_type && (
              <Text style={styles.specText}>{item.hop_type}</Text>
            )}
          </View>
        )}

        {ingredientType === "yeast" && (
          <View style={styles.ingredientSpecs}>
            {item.attenuation && (
              <Text style={styles.specText}>{item.attenuation}% Att.</Text>
            )}
            {item.manufacturer && (
              <Text style={styles.specText}>{item.manufacturer}</Text>
            )}
          </View>
        )}
      </View>

      <MaterialIcons
        name="chevron-right"
        size={20}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => {
    const categories = INGREDIENT_CATEGORIES[ingredientType] || [];

    // Don't render category filter for 'other' ingredients since they don't have a dedicated type field
    if (ingredientType === "other") {
      return null;
    }

    return (
      <View style={styles.categoryContainer}>
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
              setSelectedCategory(selectedCategory === category ? "" : category)
            }
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {CATEGORY_LABELS[category] || category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderQuantityInput = () => {
    if (!showQuantityInput || !selectedIngredient) return null;

    const availableUnits = UNITS_BY_TYPE[ingredientType];

    return (
      <View style={styles.quantityContainer}>
        <View style={styles.quantityHeader}>
          <Text style={styles.quantityTitle}>
            Add {selectedIngredient.name}
          </Text>
          <TouchableOpacity onPress={handleCancel}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.quantityContent}>
          <Text style={styles.quantityLabel}>Amount</Text>
          <View style={styles.quantityInputContainer}>
            <TextInput
              style={styles.quantityInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="1.0"
              placeholderTextColor={theme.colors.textMuted}
              selectTextOnFocus
            />

            {/* Unit picker */}
            <View style={styles.unitPickerContainer}>
              {availableUnits.map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitButton,
                    selectedUnit === unit && styles.unitButtonActive,
                  ]}
                  onPress={() => setSelectedUnit(unit as IngredientUnit)}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      selectedUnit === unit && styles.unitButtonTextActive,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmSelection}
          >
            <Text style={styles.confirmButtonText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getTypeTitle = () => {
    const titles = {
      grain: "Grains & Fermentables",
      hop: "Hops",
      yeast: "Yeast",
      other: "Other Ingredients",
    };
    return titles[ingredientType] || "Ingredients";
  };

  if (showQuantityInput) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {renderQuantityInput()}
      </KeyboardAvoidingView>
    );
  }

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
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialIcons
              name="clear"
              size={20}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}
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
            {searchQuery
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
    </View>
  );
}
