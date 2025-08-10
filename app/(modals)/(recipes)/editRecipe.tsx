import React, { useState, useReducer, useCallback, useEffect } from "react";
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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import ApiService from "@services/API/apiService";
import {
  RecipeFormData,
  RecipeIngredient,
  IngredientType,
  Recipe,
} from "@src/types";
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

// Create unit-aware initial recipe state from existing recipe
const createRecipeStateFromExisting = (
  existingRecipe: Recipe,
  unitSystem: "imperial" | "metric"
): RecipeFormData => ({
  name: existingRecipe.name || "",
  style: existingRecipe.style || "",
  description: existingRecipe.description || "",
  batch_size: existingRecipe.batch_size || (unitSystem === "imperial" ? 5 : 19),
  batch_size_unit:
    existingRecipe.batch_size_unit || (unitSystem === "imperial" ? "gal" : "l"),
  unit_system: unitSystem,
  boil_time: existingRecipe.boil_time || 60,
  efficiency: existingRecipe.efficiency || 75,
  mash_temperature:
    existingRecipe.mash_temperature || (unitSystem === "imperial" ? 152 : 67),
  mash_temp_unit:
    existingRecipe.mash_temp_unit || (unitSystem === "imperial" ? "F" : "C"),
  mash_time: existingRecipe.mash_time || 60,
  is_public: existingRecipe.is_public || false,
  notes: existingRecipe.notes || "",
  ingredients: existingRecipe.ingredients || [],
});

// Recipe builder reducer (same as createRecipe)
type RecipeBuilderAction =
  | { type: "UPDATE_FIELD"; field: keyof RecipeFormData; value: any }
  | { type: "ADD_INGREDIENT"; ingredient: RecipeIngredient }
  | { type: "REMOVE_INGREDIENT"; index: number }
  | { type: "UPDATE_INGREDIENT"; index: number; ingredient: RecipeIngredient }
  | { type: "RESET"; recipe: RecipeFormData }
  | { type: "LOAD_RECIPE"; recipe: RecipeFormData };

/**
 * Updates the recipe form state based on the specified action.
 *
 * Handles field updates, ingredient management (add, remove, update), state reset,
 * and loading existing recipes for editing.
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
      return action.recipe;
    case "LOAD_RECIPE":
      return action.recipe;
    default:
      return state;
  }
}

/**
 * Edit Recipe Screen - Allows editing existing recipes using the same multi-step wizard
 * interface as recipe creation.
 *
 * Loads an existing recipe based on recipe_id parameter, pre-populates all form fields,
 * and provides real-time metrics calculation and unsaved changes detection.
 */
export default function EditRecipeScreen() {
  const theme = useTheme();
  const { unitSystem } = useUnits();
  const styles = createRecipeStyles(theme);
  const queryClient = useQueryClient();

  // Get recipe_id from route parameters
  const { recipe_id } = useLocalSearchParams<{ recipe_id: string }>();

  // State management
  const [currentStep, setCurrentStep] = useState<RecipeStep>(
    RecipeStep.BASIC_INFO
  );
  const [recipeData, dispatch] = useReducer(recipeBuilderReducer, {
    name: "",
    style: "",
    description: "",
    batch_size: unitSystem === "imperial" ? 5 : 19,
    batch_size_unit: unitSystem === "imperial" ? "gal" : "l",
    unit_system: unitSystem,
    boil_time: 60,
    efficiency: 75,
    mash_temperature: unitSystem === "imperial" ? 152 : 67,
    mash_temp_unit: unitSystem === "imperial" ? "F" : "C",
    mash_time: 60,
    is_public: false,
    notes: "",
    ingredients: [],
  });
  const [originalRecipe, setOriginalRecipe] = useState<RecipeFormData | null>(
    null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing recipe data
  const {
    data: existingRecipe,
    isLoading: loadingRecipe,
    error: loadError,
  } = useQuery<Recipe>({
    queryKey: ["recipe", recipe_id],
    queryFn: async () => {
      if (!recipe_id) throw new Error("No recipe ID provided");
      const response = await ApiService.recipes.getById(recipe_id);
      return response.data;
    },
    enabled: !!recipe_id,
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load recipe data into form when available
  useEffect(() => {
    if (existingRecipe) {
      const recipeFormData = createRecipeStateFromExisting(
        existingRecipe,
        unitSystem
      );
      dispatch({ type: "LOAD_RECIPE", recipe: recipeFormData });
      setOriginalRecipe(recipeFormData);
    }
  }, [existingRecipe, unitSystem]);

  // Check for unsaved changes
  useEffect(() => {
    if (originalRecipe) {
      const hasChanges =
        JSON.stringify(recipeData) !== JSON.stringify(originalRecipe);
      setHasUnsavedChanges(hasChanges);
    }
  }, [recipeData, originalRecipe]);

  // Real-time recipe metrics calculation
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: retryMetrics,
  } = useRecipeMetrics(recipeData);

  // Update recipe mutation
  const updateRecipeMutation = useMutation({
    mutationFn: async (formData: RecipeFormData) => {
      if (!recipe_id) throw new Error("No recipe ID provided");

      // Sanitize ingredients to ensure all numeric fields are valid
      // Note: Adding explicit ID mapping as fallback - the API interceptor should handle this but seems to have issues with nested ingredients
      const sanitizedIngredients = formData.ingredients.map(ingredient => {
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

        // Remove fields that shouldn't be sent to API for updates
        delete sanitized.created_at;
        delete sanitized.updated_at;

        // Explicit ID mapping as fallback (API interceptor should handle this but has issues with nested ingredients)
        if (sanitized.id && !sanitized.ingredient_id) {
          sanitized.ingredient_id = sanitized.id;
          delete sanitized.id;
        }

        return sanitized;
      });

      const updateData = {
        name: formData.name || "",
        style: formData.style || "",
        description: formData.description || "",
        batch_size: Number(formData.batch_size) || 5,
        batch_size_unit: formData.batch_size_unit || "gal",
        boil_time: Number(formData.boil_time) || 60,
        efficiency: Number(formData.efficiency) || 75,
        mash_temperature: Number(formData.mash_temperature) || 152,
        mash_temp_unit: formData.mash_temp_unit || "F",
        mash_time: formData.mash_time ? Number(formData.mash_time) : undefined,
        is_public: Boolean(formData.is_public),
        notes: formData.notes || "",
        ingredients: sanitizedIngredients,
        // Include estimated metrics if available
        ...(metricsData && {
          estimated_og: Number(metricsData.og) || null,
          estimated_fg: Number(metricsData.fg) || null,
          estimated_abv: Number(metricsData.abv) || null,
          estimated_ibu: Number(metricsData.ibu) || null,
          estimated_srm: Number(metricsData.srm) || null,
        }),
      };

      const response = await ApiService.recipes.update(recipe_id, updateData);

      return response.data;
    },
    onSuccess: updatedRecipe => {
      // Update the original recipe to prevent unsaved changes warning
      const newRecipeFormData = createRecipeStateFromExisting(
        updatedRecipe,
        unitSystem
      );
      setOriginalRecipe(newRecipeFormData);
      setHasUnsavedChanges(false);

      // Invalidate and refetch recipe queries
      queryClient.invalidateQueries({ queryKey: ["recipe", recipe_id] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });

      // Navigate back to the updated recipe view
      router.back();
    },
    onError: error => {
      console.error("Failed to update recipe:", error);
      Alert.alert(
        "Update Failed",
        "Failed to update recipe. Please check your connection and try again."
      );
    },
  });

  /**
   * Updates a field in the recipe data
   */
  const updateField = useCallback((field: keyof RecipeFormData, value: any) => {
    dispatch({ type: "UPDATE_FIELD", field, value });
  }, []);

  /**
   * Navigation helpers
   */
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
    if (hasUnsavedChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  /**
   * Form submission
   */
  const handleSubmit = async () => {
    try {
      await updateRecipeMutation.mutateAsync(recipeData);
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      console.error("Update error:", error);
    }
  };

  /**
   * Form validation
   */
  const canProceed = () => {
    switch (currentStep) {
      case RecipeStep.BASIC_INFO:
        return recipeData.name.trim().length > 0;
      case RecipeStep.PARAMETERS:
        return recipeData.batch_size > 0 && recipeData.boil_time > 0;
      case RecipeStep.INGREDIENTS:
        return recipeData.ingredients.length > 0;
      case RecipeStep.REVIEW:
        return true;
      default:
        return false;
    }
  };

  const canSave = () => {
    return (
      recipeData.name.trim().length > 0 &&
      recipeData.batch_size > 0 &&
      recipeData.ingredients.length > 0 &&
      hasUnsavedChanges &&
      !updateRecipeMutation.isPending
    );
  };

  // Loading state while fetching recipe
  if (loadingRecipe) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Recipe</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (loadError || !existingRecipe) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Recipe</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Recipe</Text>
          <Text style={styles.errorText}>
            {loadError instanceof Error
              ? loadError.message
              : "Recipe not found or could not be loaded."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleCancel}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case RecipeStep.BASIC_INFO:
        return (
          <BasicInfoForm
            recipeData={recipeData}
            onUpdateField={updateField}
            isEditing={true}
          />
        );
      case RecipeStep.PARAMETERS:
        return (
          <ParametersForm
            recipeData={recipeData}
            onUpdateField={updateField}
            isEditing={true}
          />
        );
      case RecipeStep.INGREDIENTS:
        return (
          <IngredientsForm
            recipeData={recipeData}
            onUpdateField={updateField}
            isEditing={true}
          />
        );
      case RecipeStep.REVIEW:
        return (
          <ReviewForm
            recipeData={recipeData}
            metrics={metricsData}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            onRetryMetrics={retryMetrics}
            isEditing={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Header with navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <MaterialIcons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Recipe {hasUnsavedChanges && "*"}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress indicator */}
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

      {/* Step content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation buttons */}
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
                !canSave() && styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSave()}
            >
              {updateRecipeMutation.isPending ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}>Updating...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Update Recipe</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
