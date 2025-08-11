import React, { useState, useReducer, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import ApiService from "@services/API/apiService";
import { RecipeFormData, RecipeIngredient, IngredientType } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import { BasicInfoForm } from "@src/components/recipes/RecipeForm/BasicInfoForm";
import { ParametersForm } from "@src/components/recipes/RecipeForm/ParametersForm";
import { IngredientsForm } from "@src/components/recipes/RecipeForm/IngredientsForm";
import { ReviewForm } from "@src/components/recipes/RecipeForm/ReviewForm";
import { useRecipeMetrics } from "@src/hooks/useRecipeMetrics";

// Recipe builder steps
enum RecipeStep {
  BASIC_INFO = 0,
  PARAMETERS = 1,
  INGREDIENTS = 2,
  REVIEW = 3,
}

const STEP_TITLES = ["Basic Info", "Parameters", "Ingredients", "Review"];

// Create unit-aware initial recipe state
const createInitialRecipeState = (
  unitSystem: "imperial" | "metric"
): RecipeFormData => ({
  name: "",
  style: "",
  description: "",
  batch_size: unitSystem === "imperial" ? 5 : 19, // 5 gallons ≈ 19 liters
  batch_size_unit: unitSystem === "imperial" ? "gal" : "l",
  unit_system: unitSystem,
  boil_time: 60,
  efficiency: 75,
  mash_temperature: unitSystem === "imperial" ? 152 : 67, // 152°F ≈ 67°C
  mash_temp_unit: unitSystem === "imperial" ? "F" : "C",
  mash_time: 60,
  is_public: false,
  notes: "",
  ingredients: [],
});

// Recipe builder reducer
type RecipeBuilderAction =
  | { type: "UPDATE_FIELD"; field: keyof RecipeFormData; value: any }
  | { type: "ADD_INGREDIENT"; ingredient: RecipeIngredient }
  | { type: "REMOVE_INGREDIENT"; index: number }
  | { type: "UPDATE_INGREDIENT"; index: number; ingredient: RecipeIngredient }
  | { type: "RESET"; unitSystem: "imperial" | "metric" };

/**
 * Updates the recipe form state based on the specified action.
 *
 * Handles field updates, ingredient management (add, remove, update), and state reset for the recipe creation form.
 *
 * @param state - The current recipe form state
 * @param action - The action describing the state change
 * @returns The updated recipe form state
 */
function recipeBuilderReducer(
  state: RecipeFormData,
  action: RecipeBuilderAction
): RecipeFormData {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value };
    case "ADD_INGREDIENT":
      return {
        ...state,
        ingredients: [...state.ingredients, action.ingredient],
      };
    case "REMOVE_INGREDIENT":
      return {
        ...state,
        ingredients: state.ingredients.filter(
          (_, index) => index !== action.index
        ),
      };
    case "UPDATE_INGREDIENT":
      return {
        ...state,
        ingredients: state.ingredients.map((ingredient, index) =>
          index === action.index ? action.ingredient : ingredient
        ),
      };
    case "RESET":
      return createInitialRecipeState(action.unitSystem);
    default:
      return state;
  }
}

/**
 * Displays a multi-step form for creating a new recipe, guiding the user through basic information, parameters, ingredients, and review steps.
 *
 * Handles form state, validation, and submission, including navigation between steps and cancellation confirmation. On successful creation, navigates to the newly created recipe's detail view.
 */
export default function CreateRecipeScreen() {
  const theme = useTheme();
  const { unitSystem } = useUnits();
  const queryClient = useQueryClient();
  const styles = createRecipeStyles(theme);

  const [currentStep, setCurrentStep] = useState(RecipeStep.BASIC_INFO);
  const [recipeState, dispatch] = useReducer(
    recipeBuilderReducer,
    createInitialRecipeState(unitSystem)
  );

  // Get calculated recipe metrics for saving
  const {
    data: calculatedMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: onRetryMetrics,
  } = useRecipeMetrics(recipeState);

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: (recipeData: RecipeFormData) => {
      // Sanitize ingredients to ensure all numeric fields are valid and add ID mapping
      // Note: Adding explicit ID mapping as fallback - the API interceptor should handle this but seems to have issues with nested ingredients
      const sanitizedIngredients = recipeData.ingredients.map(ingredient => {
        const sanitized: any = { ...ingredient };

        // Ensure required amount is a valid number
        sanitized.amount = Number(sanitized.amount) || 0;

        // Clean up optional numeric fields - convert null to undefined or valid numbers
        if (
          sanitized.potential !== undefined &&
          (sanitized.potential === null || isNaN(Number(sanitized.potential)))
        ) {
          delete sanitized.potential;
        } else if (sanitized.potential !== undefined) {
          sanitized.potential = Number(sanitized.potential);
        }

        if (
          sanitized.color !== undefined &&
          (sanitized.color === null || isNaN(Number(sanitized.color)))
        ) {
          delete sanitized.color;
        } else if (sanitized.color !== undefined) {
          sanitized.color = Number(sanitized.color);
        }

        if (
          sanitized.alpha_acid !== undefined &&
          (sanitized.alpha_acid === null || isNaN(Number(sanitized.alpha_acid)))
        ) {
          delete sanitized.alpha_acid;
        } else if (sanitized.alpha_acid !== undefined) {
          sanitized.alpha_acid = Number(sanitized.alpha_acid);
        }

        if (
          sanitized.time !== undefined &&
          (sanitized.time === null || isNaN(Number(sanitized.time)))
        ) {
          delete sanitized.time;
        } else if (sanitized.time !== undefined) {
          sanitized.time = Number(sanitized.time);
        }

        if (
          sanitized.attenuation !== undefined &&
          (sanitized.attenuation === null ||
            isNaN(Number(sanitized.attenuation)))
        ) {
          delete sanitized.attenuation;
        } else if (sanitized.attenuation !== undefined) {
          sanitized.attenuation = Number(sanitized.attenuation);
        }

        // Remove fields that shouldn't be sent to API for creation
        delete sanitized.created_at;
        delete sanitized.updated_at;

        // Explicit ID mapping as fallback (API interceptor should handle this but has issues with nested ingredients)
        if (sanitized.id && !sanitized.ingredient_id) {
          sanitized.ingredient_id = sanitized.id;
          delete sanitized.id;
        }

        return sanitized;
      });

      const createData = {
        ...recipeData,
        ingredients: sanitizedIngredients,
      };

      return ApiService.recipes.create(createData);
    },
    onSuccess: response => {
      // Invalidate relevant recipe caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["userRecipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] }); // AllRecipes cache
      Alert.alert("Success", "Recipe created successfully!", [
        {
          text: "View Recipe",
          onPress: () => {
            // Replace current modal with ViewRecipe modal
            router.replace({
              pathname: "/(modals)/(recipes)/viewRecipe",
              params: { recipe_id: response.data.id },
            });
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create recipe"
      );
    },
  });

  const updateField = useCallback((field: keyof RecipeFormData, value: any) => {
    dispatch({ type: "UPDATE_FIELD", field, value });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET", unitSystem });
  }, [unitSystem]);

  const handleNext = () => {
    if (currentStep < RecipeStep.REVIEW) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > RecipeStep.BASIC_INFO) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Recipe Creation",
      "Are you sure you want to cancel? All progress will be lost.",
      [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleSave = () => {
    // Basic validation
    if (!recipeState.name.trim()) {
      Alert.alert("Error", "Recipe name is required");
      return;
    }
    if (!recipeState.style.trim()) {
      Alert.alert("Error", "Recipe style is required");
      return;
    }
    if (recipeState.ingredients.length === 0) {
      Alert.alert("Error", "At least one ingredient is required");
      return;
    }

    // Include calculated metrics in the recipe data
    const recipeWithMetrics = {
      ...recipeState,
      // Add calculated metrics if available
      ...(calculatedMetrics && {
        estimated_og: calculatedMetrics.og,
        estimated_fg: calculatedMetrics.fg,
        estimated_abv: calculatedMetrics.abv,
        estimated_ibu: calculatedMetrics.ibu,
        estimated_srm: calculatedMetrics.srm,
      }),
    };

    createRecipeMutation.mutate(recipeWithMetrics);
  };

  const canProceed = () => {
    switch (currentStep) {
      case RecipeStep.BASIC_INFO:
        return recipeState.name.trim() && recipeState.style.trim();
      case RecipeStep.PARAMETERS:
        return recipeState.batch_size > 0 && recipeState.efficiency > 0;
      case RecipeStep.INGREDIENTS:
        return recipeState.ingredients.length > 0;
      case RecipeStep.REVIEW:
        return true;
      default:
        return false;
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {STEP_TITLES.map((title, index) => (
        <View key={index} style={styles.progressStep}>
          <View
            style={[
              styles.progressDot,
              index === currentStep && styles.progressDotActive,
              index < currentStep && styles.progressDotCompleted,
            ]}
          >
            {index < currentStep ? (
              <MaterialIcons name="check" size={12} color="#fff" />
            ) : (
              <Text
                style={[
                  styles.progressDotText,
                  index === currentStep && styles.progressDotTextActive,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.progressLabel,
              index === currentStep && styles.progressLabelActive,
            ]}
          >
            {title}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case RecipeStep.BASIC_INFO:
        return (
          <BasicInfoForm recipeData={recipeState} onUpdateField={updateField} />
        );
      case RecipeStep.PARAMETERS:
        return (
          <ParametersForm
            recipeData={recipeState}
            onUpdateField={updateField}
          />
        );
      case RecipeStep.INGREDIENTS:
        return (
          <IngredientsForm
            recipeData={recipeState}
            onUpdateField={updateField}
          />
        );
      case RecipeStep.REVIEW:
        return (
          <ReviewForm
            recipeData={recipeState}
            metrics={calculatedMetrics}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            onRetryMetrics={onRetryMetrics}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <MaterialIcons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Recipe</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {currentStep > RecipeStep.BASIC_INFO && (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={styles.navigationRight}>
          {currentStep < RecipeStep.REVIEW ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceed() && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  !canProceed() && styles.nextButtonTextDisabled,
                ]}
              >
                Next
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={canProceed() ? "#fff" : theme.colors.textMuted}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.saveButton,
                createRecipeMutation.isPending && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={createRecipeMutation.isPending}
            >
              {createRecipeMutation.isPending ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}>Creating...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Create Recipe</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
