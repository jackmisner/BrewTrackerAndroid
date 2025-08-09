import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useGlobalSearchParams } from "expo-router";

import { useTheme } from "@contexts/ThemeContext";
import { RecipeFormData, RecipeIngredient } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";

interface IngredientsFormProps {
  recipeData: RecipeFormData;
  onUpdateField: (field: keyof RecipeFormData, value: any) => void;
}

/**
 * Displays and manages a categorized ingredient list for a recipe, allowing users to add or remove ingredients by type.
 *
 * Handles ingredient addition via navigation parameters, categorizes ingredients into grains, hops, yeast, and other, and updates the recipe data through a callback when changes occur.
 *
 * @param recipeData - The current recipe form data containing the ingredients list.
 * @param onUpdateField - Callback to update fields in the recipe data when ingredients are added or removed.
 *
 * @returns A React element rendering the ingredient form UI.
 */
export function IngredientsForm({
  recipeData,
  onUpdateField,
}: IngredientsFormProps) {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);
  const params = useGlobalSearchParams();

  // Ensure ingredients is always an array to prevent crashes
  const safeIngredients = Array.isArray(recipeData.ingredients)
    ? recipeData.ingredients
    : [];

  const ingredientsByType = {
    grain: safeIngredients.filter(ing => ing.type === "grain"),
    hop: safeIngredients.filter(ing => ing.type === "hop"),
    yeast: safeIngredients.filter(ing => ing.type === "yeast"),
    other: safeIngredients.filter(ing => ing.type === "other"),
  };

  // Handle ingredient selection from picker
  useEffect(() => {
    const raw = params.selectedIngredient;
    const serialized = Array.isArray(raw) ? raw[0] : raw;
    if (!serialized) return;
    try {
      const decoded = decodeURIComponent(serialized);
      const ingredient = JSON.parse(decoded) as RecipeIngredient;
      const newIngredients = [...safeIngredients, ingredient];

      onUpdateField("ingredients", newIngredients);
      // Clear the parameter to prevent re-adding
      router.setParams({ selectedIngredient: undefined });
    } catch (error) {
      console.error("Error parsing selectedIngredient param:", error);
      console.error("Raw param value:", raw);
    }
  }, [params.selectedIngredient, safeIngredients, onUpdateField]);
  const handleAddIngredient = (type: "grain" | "hop" | "yeast" | "other") => {
    router.push(`/(modals)/(recipes)/ingredientPicker?type=${type}`);
  };

  const renderIngredientSection = (
    type: "grain" | "hop" | "yeast" | "other",
    title: string
  ) => {
    const ingredients = ingredientsByType[type];

    return (
      <View style={styles.ingredientSection} key={type}>
        <View style={styles.ingredientSectionHeader}>
          <Text style={styles.ingredientSectionTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.addIngredientButton}
            onPress={() => handleAddIngredient(type)}
          >
            <MaterialIcons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addIngredientText}>Add</Text>
          </TouchableOpacity>
        </View>

        {ingredients.length === 0 ? (
          <View style={styles.emptyIngredientContainer}>
            <Text style={styles.emptyIngredientText}>
              No {type} ingredients added yet
            </Text>
          </View>
        ) : (
          <View style={styles.ingredientsList}>
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.ingredientRemoveButton}
                  onPress={() => {
                    // Find the ingredient in the full safe ingredients array
                    const globalIndex = safeIngredients.findIndex(
                      ing =>
                        ing.name === ingredient.name &&
                        ing.type === ingredient.type &&
                        ing.amount === ingredient.amount &&
                        ing.unit === ingredient.unit
                    );

                    if (globalIndex !== -1) {
                      const newIngredients = safeIngredients.filter(
                        (_, i) => i !== globalIndex
                      );

                      onUpdateField("ingredients", newIngredients);
                    } else {
                      console.error(
                        "❌ IngredientsForm - Could not find ingredient to remove"
                      );
                    }
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Recipe Ingredients</Text>
      <Text style={styles.sectionDescription}>
        Add ingredients to build your recipe. Start with grains, then add hops,
        yeast, and any other ingredients.
      </Text>

      {renderIngredientSection("grain", "Grains & Fermentables")}
      {renderIngredientSection("hop", "Hops")}
      {renderIngredientSection("yeast", "Yeast")}
      {renderIngredientSection("other", "Other Ingredients")}

      {safeIngredients.length === 0 && (
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialIcons
              name="lightbulb-outline"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.infoTitle}>Getting Started</Text>
          </View>
          <Text style={styles.infoText}>
            Start by adding your base grains, then specialty grains for flavour
            and colour. Add hops for bitterness and aroma, choose your yeast
            strain, and any other ingredients like spices or clarifying agents.
          </Text>
        </View>
      )}
    </View>
  );
}
