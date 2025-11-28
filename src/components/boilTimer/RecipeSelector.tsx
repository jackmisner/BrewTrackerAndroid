/**
 * RecipeSelector Component for Boil Timer
 *
 * Allows users to select a recipe to load its boil time and hop schedule
 * into the timer, or choose manual timer mode.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme, ThemeContextValue } from "@contexts/ThemeContext";
import { Recipe } from "@src/types";
import ApiService from "@services/api/apiService";
import { TEST_IDS } from "@constants/testIDs";
import { recipeSelectorStyles } from "@styles/components/recipeSelectorStyles";

interface RecipeSelectorProps {
  selectedRecipe: {
    id: string;
    name: string;
    style: string;
    boil_time: number;
  } | null;
  onRecipeSelect: (recipe: Recipe | null) => void;
  onManualMode: () => void;
  disabled?: boolean;
  testID?: string;
}

interface RecipeItemProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  isSelected: boolean;
  theme: ThemeContextValue;
  styles: ReturnType<typeof recipeSelectorStyles>;
}

const RecipeItem: React.FC<RecipeItemProps> = ({
  recipe,
  onSelect,
  isSelected,
  theme,
  styles,
}) => (
  <TouchableOpacity
    style={[
      styles.recipeItem,
      {
        backgroundColor: isSelected
          ? theme.colors.primaryLight20
          : theme.colors.backgroundSecondary,
        borderColor: isSelected
          ? theme.colors.primary
          : theme.colors.borderLight,
      },
    ]}
    onPress={() => onSelect(recipe)}
    testID={TEST_IDS.patterns.touchableOpacityAction(
      `recipe-select-${recipe.id}`
    )}
  >
    <View style={styles.recipeItemContent}>
      <Text
        style={[styles.recipeName, { color: theme.colors.text }]}
        numberOfLines={1}
      >
        {recipe.name}
      </Text>
      <Text
        style={[styles.recipeStyle, { color: theme.colors.textSecondary }]}
        numberOfLines={1}
      >
        {recipe.style}
      </Text>
      <View style={styles.recipeMetrics}>
        <Text style={[styles.boilTime, { color: theme.colors.primary }]}>
          {recipe.boil_time} min boil
        </Text>
        <Text style={[styles.hopCount, { color: theme.colors.textSecondary }]}>
          {recipe.ingredients?.filter(ing => ing.type === "hop").length || 0}{" "}
          hops
        </Text>
      </View>
    </View>
    {isSelected && (
      <MaterialIcons
        name="check-circle"
        size={24}
        color={theme.colors.primary}
      />
    )}
  </TouchableOpacity>
);

export const RecipeSelector: React.FC<RecipeSelectorProps> = ({
  selectedRecipe,
  onRecipeSelect,
  onManualMode,
  disabled = false,
  testID,
}) => {
  const theme = useTheme();
  const styles = recipeSelectorStyles(theme.colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user recipes
  const {
    data: recipesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recipes", { page: 1, limit: 100 }], // Get more recipes for selection
    queryFn: () => ApiService.recipes.getAll(1, 100),
    enabled: modalVisible, // Only fetch when modal is open
  });

  const recipes = recipesResponse?.data?.recipes || [];

  // Filter recipes by search query and ensure they have boil times
  const filteredRecipes = recipes.filter((recipe: Recipe) => {
    const hasBoilTime = recipe.boil_time && recipe.boil_time > 0;
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.style.toLowerCase().includes(searchQuery.toLowerCase());
    return hasBoilTime && matchesSearch;
  });

  const handleRecipeSelect = (recipe: Recipe) => {
    onRecipeSelect(recipe);
    setModalVisible(false);
    setSearchQuery("");
  };

  const handleManualMode = () => {
    onRecipeSelect(null);
    onManualMode();
    setModalVisible(false);
    setSearchQuery("");
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            borderColor: theme.colors.borderLight,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        testID={testID}
      >
        <View style={styles.selectorContent}>
          <MaterialIcons
            name="receipt-long"
            size={24}
            color={theme.colors.primary}
          />
          <View style={styles.selectorText}>
            {selectedRecipe ? (
              <>
                <Text
                  style={[styles.selectedName, { color: theme.colors.text }]}
                >
                  {selectedRecipe.name}
                </Text>
                <Text
                  style={[
                    styles.selectedDetails,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {selectedRecipe.style} • {selectedRecipe.boil_time} min
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={[styles.placeholderText, { color: theme.colors.text }]}
                >
                  Select Recipe
                </Text>
                <Text
                  style={[
                    styles.placeholderSubtext,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Choose a recipe or manual timer
                </Text>
              </>
            )}
          </View>
        </View>
        <MaterialIcons
          name="expand-more"
          size={24}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.colors.borderLight },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Select Recipe for Timer
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search recipes..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Manual Timer Option */}
          <TouchableOpacity
            style={[
              styles.manualOption,
              { borderBottomColor: theme.colors.borderLight },
            ]}
            onPress={handleManualMode}
            testID={TEST_IDS.patterns.touchableOpacityAction("manual-mode")}
          >
            <MaterialIcons
              name="timer"
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.manualOptionText}>
              <Text style={[styles.manualTitle, { color: theme.colors.text }]}>
                Manual Timer
              </Text>
              <Text
                style={[
                  styles.manualSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Set custom duration without recipe
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Recipe List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Loading recipes...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons
                name="error"
                size={48}
                color={theme.colors.error}
              />
              <Text style={[styles.errorText, { color: theme.colors.text }]}>
                Failed to load recipes
              </Text>
              <Text
                style={[
                  styles.errorSubtext,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Please check your connection and try again
              </Text>
            </View>
          ) : filteredRecipes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="receipt-long"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                {searchQuery ? "No recipes found" : "No recipes available"}
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {searchQuery
                  ? "Try a different search term"
                  : "Create a recipe first"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <RecipeItem
                  recipe={item}
                  onSelect={handleRecipeSelect}
                  isSelected={selectedRecipe?.id === item.id}
                  theme={theme}
                  styles={styles}
                />
              )}
              style={styles.recipeList}
              contentContainerStyle={styles.recipeListContent}
            />
          )}
        </View>
      </Modal>
    </>
  );
};
