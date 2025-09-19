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
import OfflineRecipeService from "@services/offline/OfflineRecipeService";
import { RecipeFormData, RecipeIngredient, Recipe } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import { BasicInfoForm } from "@src/components/recipes/RecipeForm/BasicInfoForm";
import { ParametersForm } from "@src/components/recipes/RecipeForm/ParametersForm";
import { IngredientsForm } from "@src/components/recipes/RecipeForm/IngredientsForm";
import { ReviewForm } from "@src/components/recipes/RecipeForm/ReviewForm";
import { useRecipeMetrics } from "@src/hooks/useRecipeMetrics";
import { generateUniqueId } from "@utils/keyUtils";
import { QUERY_KEYS } from "@services/api/queryClient";

// Recipe builder steps
enum RecipeStep {
  BASIC_INFO = 0,
  PARAMETERS = 1,
  INGREDIENTS = 2,
  REVIEW = 3,
}

const STEP_TITLES = ["Basic Info", "Parameters", "Ingredients", "Review"];

/**
 * Efficiently compares two recipe objects for changes, ignoring volatile fields
 * that shouldn't trigger unsaved changes detection.
 *
 * Uses shallow comparison for top-level fields and array length + simple hashing
 * for ingredients array instead of expensive JSON.stringify.
 *
 * @internal Exported for testing purposes only
 */
export function hasRecipeChanges(
  current: RecipeFormData | null,
  original: RecipeFormData | null
): boolean {
  if (!current || !original) {
    return false;
  }
  if (current === original) {
    return false;
  }

  // Compare top-level scalar fields (ignore volatile fields)
  const fieldsToCompare: (keyof RecipeFormData)[] = [
    "name",
    "style",
    "description",
    "batch_size",
    "batch_size_unit",
    "unit_system",
    "boil_time",
    "efficiency",
    "mash_temperature",
    "mash_temp_unit",
    "mash_time",
    "notes",
    "is_public",
  ];

  for (const field of fieldsToCompare) {
    if (current[field] !== original[field]) {
      return true;
    }
  }

  // Fast ingredients array comparison
  const currentIngredients = current.ingredients || [];
  const originalIngredients = original.ingredients || [];

  // Quick length check
  if (currentIngredients.length !== originalIngredients.length) {
    return true;
  }

  // Compare ingredients by stable fields only (ignore volatile instance_id)
  for (let i = 0; i < currentIngredients.length; i++) {
    const curr = currentIngredients[i];
    const orig = originalIngredients[i];

    // Compare stable ingredient fields that matter for unsaved changes
    // Note: instance_id is intentionally ignored as it's volatile and regenerated
    if (
      curr.name !== orig.name ||
      curr.type !== orig.type ||
      curr.amount !== orig.amount ||
      curr.unit !== orig.unit ||
      curr.use !== orig.use ||
      curr.time !== orig.time ||
      curr.alpha_acid !== orig.alpha_acid ||
      curr.notes !== orig.notes ||
      curr.id !== orig.id || // ID changes are significant
      curr.potential !== orig.potential ||
      curr.color !== orig.color ||
      curr.attenuation !== orig.attenuation ||
      curr.description !== orig.description
    ) {
      return true;
    }
  }

  return false;
}

// Helper function to convert values to optional numbers
const toOptionalNumber = (v: any): number | undefined => {
  if (v === null || v === undefined) {
    return undefined;
  }
  if (typeof v === "string" && v.trim() === "") {
    return undefined;
  }
  if (typeof v === "boolean") {
    return undefined;
  }
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number.parseFloat(v)
        : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// Create unit-aware initial recipe state from existing recipe
const createRecipeStateFromExisting = (
  existingRecipe: Recipe,
  unitSystem: "imperial" | "metric"
): RecipeFormData => ({
  name: existingRecipe.name ?? "",
  style: existingRecipe.style ?? "",
  description: existingRecipe.description ?? "",
  batch_size: existingRecipe.batch_size ?? (unitSystem === "imperial" ? 5 : 19),
  batch_size_unit:
    existingRecipe.batch_size_unit ?? (unitSystem === "imperial" ? "gal" : "l"),
  unit_system: unitSystem,
  boil_time: existingRecipe.boil_time ?? 60,
  efficiency: existingRecipe.efficiency ?? 75,
  mash_temperature:
    existingRecipe.mash_temperature ?? (unitSystem === "imperial" ? 152 : 67),
  mash_temp_unit:
    existingRecipe.mash_temp_unit ?? (unitSystem === "imperial" ? "F" : "C"),
  mash_time: existingRecipe.mash_time ?? undefined,
  is_public: existingRecipe.is_public ?? false,
  notes: existingRecipe.notes ?? "",
  ingredients: existingRecipe.ingredients ?? [],
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
    mash_time: undefined,
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
    queryKey: [...QUERY_KEYS.RECIPE(recipe_id)],
    queryFn: async () => {
      const recipe = await OfflineRecipeService.getById(recipe_id);
      if (!recipe) {
        throw new Error("Recipe not found");
      }
      return recipe;
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

  // Check for unsaved changes using efficient comparison
  useEffect(() => {
    const hasChanges = hasRecipeChanges(recipeData, originalRecipe);
    setHasUnsavedChanges(hasChanges);
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
      // Filter out ingredients with zero/empty amounts first
      const validIngredients = formData.ingredients.filter(ingredient => {
        const amt = toOptionalNumber(ingredient.amount);
        return amt !== undefined && amt > 0;
      });

      const sanitizedIngredients = validIngredients.map(ingredient => {
        const sanitized: any = { ...ingredient };

        // Amount is already validated as positive, so just use it
        sanitized.amount = toOptionalNumber(sanitized.amount);
        {
          const v = toOptionalNumber(sanitized.potential);
          if (v === undefined) {
            delete sanitized.potential;
          } else {
            sanitized.potential = v;
          }
        }
        {
          const v = toOptionalNumber(sanitized.color);
          if (v === undefined) {
            delete sanitized.color;
          } else {
            sanitized.color = v;
          }
        }
        {
          const v = toOptionalNumber(sanitized.alpha_acid);
          if (v === undefined) {
            delete sanitized.alpha_acid;
          } else {
            sanitized.alpha_acid = Math.max(0, Math.min(100, v));
          }
        }
        {
          const v = toOptionalNumber(sanitized.time);
          if (v === undefined) {
            delete sanitized.time;
          } else {
            sanitized.time = Math.max(0, v);
          }
        }
        {
          const v = toOptionalNumber(sanitized.attenuation);
          if (v === undefined) {
            delete sanitized.attenuation;
          } else {
            sanitized.attenuation = Math.max(0, Math.min(100, v));
          }
        }

        // Remove fields that shouldn't be sent to API for updates
        delete sanitized.created_at;
        delete sanitized.updated_at;

        // Explicit ID mapping as fallback (API interceptor should handle this but has issues with nested ingredients)
        if (sanitized.id && !sanitized.ingredient_id) {
          sanitized.ingredient_id = sanitized.id;
        }
        if (!sanitized.instance_id) {
          sanitized.instance_id = generateUniqueId("ing");
        }
        return sanitized;
      });

      const updateData = {
        name: formData.name || "",
        style: formData.style || "",
        description: formData.description || "",
        batch_size: (() => {
          const v = toOptionalNumber(formData.batch_size);
          return v && v > 0 ? v : 5;
        })(),
        batch_size_unit:
          formData.batch_size_unit || (unitSystem === "metric" ? "l" : "gal"),
        boil_time: (() => {
          const v = toOptionalNumber(formData.boil_time);
          return v !== undefined && v >= 0 && v <= 300 ? v : 60;
        })(),
        efficiency: (() => {
          const v = toOptionalNumber(formData.efficiency);
          return v !== undefined && v > 0 && v <= 100 ? v : 75;
        })(),
        // Unit-aware clamp with sensible fallback (°F:152, °C:67)
        mash_temperature: (() => {
          const unit =
            formData.mash_temp_unit || (unitSystem === "metric" ? "C" : "F");
          const fallback = unit === "C" ? 67 : 152;
          const t = Number(formData.mash_temperature);
          if (!Number.isFinite(t)) {
            return fallback;
          }
          const [min, max] = unit === "C" ? [60, 77] : [140, 170];
          return Math.min(max, Math.max(min, t));
        })(),
        mash_temp_unit:
          formData.mash_temp_unit || (unitSystem === "metric" ? "C" : "F"),
        mash_time: toOptionalNumber(formData.mash_time),
        is_public: Boolean(formData.is_public),
        notes: formData.notes || "",
        ingredients: sanitizedIngredients,
        // Include estimated metrics only when finite
        ...(metricsData &&
          Number.isFinite(metricsData.og) && {
            estimated_og: metricsData.og,
          }),
        ...(metricsData &&
          Number.isFinite(metricsData.fg) && {
            estimated_fg: metricsData.fg,
          }),
        ...(metricsData &&
          Number.isFinite(metricsData.abv) && {
            estimated_abv: metricsData.abv,
          }),
        ...(metricsData &&
          Number.isFinite(metricsData.ibu) && {
            estimated_ibu: metricsData.ibu,
          }),
        ...(metricsData &&
          Number.isFinite(metricsData.srm) && {
            estimated_srm: metricsData.srm,
          }),
      };

      const updatedRecipe = await OfflineRecipeService.update(
        recipe_id,
        updateData
      );

      return updatedRecipe;
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
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPE(recipe_id)],
      });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.RECIPES] });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPE(recipe_id), "offline"],
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      });

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
   * Helper function to validate ingredients have positive amounts
   */
  const hasValidIngredients = () => {
    if (recipeData.ingredients.length === 0) {
      return false;
    }

    return recipeData.ingredients.some(ingredient => {
      const amt = toOptionalNumber(ingredient.amount);
      return amt !== undefined && amt > 0;
    });
  };

  /**
   * Form validation
   */
  const canProceed = () => {
    switch (currentStep) {
      case RecipeStep.BASIC_INFO:
        return (
          recipeData.name.trim().length > 0 &&
          recipeData.style.trim().length > 0
        );
      case RecipeStep.PARAMETERS:
        return (
          recipeData.batch_size > 0 &&
          recipeData.boil_time >= 0 &&
          recipeData.boil_time <= 300 &&
          recipeData.efficiency > 0 &&
          recipeData.efficiency <= 100 &&
          // Mash temp bounds per unit (F: 140–170, C: 60–77)
          (() => {
            const unit =
              recipeData.mash_temp_unit ||
              (recipeData.unit_system === "metric" ? "C" : "F");
            const [min, max] = unit === "C" ? [60, 77] : [140, 170];
            return (
              recipeData.mash_temperature >= min &&
              recipeData.mash_temperature <= max
            );
          })() &&
          (recipeData.mash_time === undefined ||
            (recipeData.mash_time >= 0 && recipeData.mash_time <= 480))
        );
      case RecipeStep.INGREDIENTS:
        return hasValidIngredients();
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
      hasValidIngredients() &&
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
          <BasicInfoForm recipeData={recipeData} onUpdateField={updateField} />
        );
      case RecipeStep.PARAMETERS:
        return (
          <ParametersForm recipeData={recipeData} onUpdateField={updateField} />
        );
      case RecipeStep.INGREDIENTS:
        return (
          <IngredientsForm
            recipeData={recipeData}
            onUpdateField={updateField}
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
        {currentStep > RecipeStep.BASIC_INFO ? (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : null}

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
