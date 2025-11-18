/**
 * Create Recipe Modal Screen
 *
 * Multi-step wizard for creating new beer recipes with real-time validation and metrics.
 * Provides a guided 4-step process: Basic Info → Parameters → Ingredients → Review.
 *
 * Features:
 * - Multi-step form with progress indicator
 * - Real-time recipe metrics calculation
 * - Unit-aware ingredient management
 * - Comprehensive form validation
 * - Optimistic UI updates with error handling
 * - Auto-save to prevent data loss
 *
 * The component uses a reducer for complex state management and React Query for
 * server-side operations including real-time metrics calculation.
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(recipes)/createRecipe');
 * ```
 */

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
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { useRecipes, useBeerStyles } from "@src/hooks/offlineV2";
import {
  RecipeFormData,
  RecipeIngredient,
  Recipe,
  AIAnalysisResponse,
} from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import { BasicInfoForm } from "@src/components/recipes/RecipeForm/BasicInfoForm";
import { ParametersForm } from "@src/components/recipes/RecipeForm/ParametersForm";
import { IngredientsForm } from "@src/components/recipes/RecipeForm/IngredientsForm";
import { ReviewForm } from "@src/components/recipes/RecipeForm/ReviewForm";
import { AIAnalysisResultsModal } from "@src/components/recipes/AIAnalysisResultsModal";
import { useRecipeMetrics } from "@src/hooks/useRecipeMetrics";
import { ModalHeader } from "@src/components/ui/ModalHeader";
import { TEST_IDS } from "@src/constants/testIDs";
import {
  generateUniqueId,
  generateIngredientInstanceId,
} from "@utils/keyUtils";
import { QUERY_KEYS } from "@services/api/queryClient";
import ApiService from "@services/api/apiService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

/**
 * Recipe creation wizard steps
 */
enum RecipeStep {
  BASIC_INFO = 0,
  PARAMETERS = 1,
  INGREDIENTS = 2,
  REVIEW = 3,
}

/**
 * Human-readable titles for each step in the wizard
 */
const STEP_TITLES = ["Basic Info", "Parameters", "Ingredients", "Review"];

/**
 * Creates initial recipe state with unit-aware defaults
 * Provides sensible defaults based on the user's unit system preference
 *
 * @param unitSystem - User's preferred unit system ('imperial' or 'metric')
 * @returns Initial recipe form data with appropriate units and defaults
 */
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
  const { create: createRecipeV2 } = useRecipes();

  const [currentStep, setCurrentStep] = useState(RecipeStep.BASIC_INFO);
  const [recipeState, dispatch] = useReducer(
    recipeBuilderReducer,
    createInitialRecipeState(unitSystem)
  );

  // AI Analysis state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysisResult, setAIAnalysisResult] =
    useState<AIAnalysisResponse | null>(null);
  const [aiAnalysisLoading, setAIAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAIAnalysisError] = useState<string | null>(null);

  // Fetch beer styles to get the full BeerStyle object for the modal
  const { data: beerStyles } = useBeerStyles({});

  // Get calculated recipe metrics for saving
  const {
    data: calculatedMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: onRetryMetrics,
  } = useRecipeMetrics(recipeState);

  // Create recipe mutation
  const createRecipeMutation = useMutation<Recipe, Error, RecipeFormData>({
    mutationFn: async (recipeData: RecipeFormData) => {
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
        }
        if (!sanitized.instance_id) {
          sanitized.instance_id = generateUniqueId("ing");
        }
        return sanitized;
      });

      const createData = {
        ...recipeData,
        ingredients: sanitizedIngredients,
      };

      try {
        return await createRecipeV2(createData);
      } catch (error) {
        console.error("❌ Failed to create recipe:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create recipe";
        throw new Error(`Recipe creation failed: ${errorMessage}`);
      }
    },
    onSuccess: response => {
      // Invalidate relevant recipe caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["userRecipes"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECIPES }); // AllRecipes cache
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.RECIPES, "offline"],
      }); // Offline recipes cache
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }); // Dashboard cache
      // Prime the detail cache for immediate access
      queryClient.setQueryData(QUERY_KEYS.RECIPE(response.id), response);
      Alert.alert("Success", "Recipe created successfully!", [
        {
          text: "View Recipe",
          onPress: () => {
            // Replace current modal with ViewRecipe modal
            // OfflineRecipeService returns recipe directly, not in response.data
            const recipeId = response.id;
            router.replace({
              pathname: "/(modals)/(recipes)/viewRecipe",
              params: { recipe_id: recipeId },
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

  // AI Analysis handlers
  const handleAIAnalysis = async () => {
    // Validate that we have a style database ID
    if (!recipeState.style_database_id) {
      Alert.alert(
        "Beer Style Required",
        "Please select a beer style before analysing the recipe."
      );
      return;
    }

    setAIAnalysisLoading(true);
    setAIAnalysisError(null);
    setShowAIModal(true);

    const requestPayload = {
      complete_recipe: recipeState as any, // API expects Recipe type
      style_id: recipeState.style_database_id, // MongoDB ObjectId for backend
      unit_system: recipeState.unit_system,
    };

    UnifiedLogger.info("AIAnalysis", "Starting AI recipe analysis", {
      recipeName: recipeState.name,
      style: recipeState.style,
      styleDatabaseId: recipeState.style_database_id,
      ingredients: recipeState.ingredients.map(ing => [
        ing.name,
        ing.amount,
        ing.unit,
        ing.type,
      ]),
      unitSystem: recipeState.unit_system,
    });

    try {
      const response = await ApiService.ai.analyzeRecipe(requestPayload);

      UnifiedLogger.info("AIAnalysis", "AI analysis completed successfully", {
        data: response.data,
        currentMetrics: response.data.current_metrics,
        styleAnalysis: response.data.style_analysis,
        suggestionsCount: response.data.suggestions?.length || 0,
        optimizationPerformed: response.data.optimization_performed,
        iterationsCompleted: response.data.iterations_completed,
        changesCount: response.data.recipe_changes?.length || 0,
        hasOptimizedRecipe: !!response.data.optimized_recipe,
      });

      setAIAnalysisResult(response.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to analyse recipe";

      UnifiedLogger.error("AIAnalysis", "AI analysis failed", {
        error: errorMessage,
        recipeName: recipeState.name,
        style: recipeState.style,
        ingredientCount: recipeState.ingredients.length,
      });

      setAIAnalysisError(errorMessage);
    } finally {
      setAIAnalysisLoading(false);
    }
  };

  const handleApplyOptimization = (optimizedRecipe: Recipe) => {
    UnifiedLogger.info("AIAnalysis", "Applying AI optimisation to recipe", {
      recipeName: recipeState.name,
      originalIngredientCount: recipeState.ingredients.length,
      optimizedIngredientCount: optimizedRecipe.ingredients.length,
      boilTimeChange: `${recipeState.boil_time} → ${optimizedRecipe.boil_time}`,
      efficiencyChange: `${recipeState.efficiency} → ${optimizedRecipe.efficiency}`,
    });

    // Normalize ingredients to ensure all have instance_id for client-side tracking
    // AI-provided ingredients may lack instance_id, which breaks editor functionality
    const normalizedIngredients = optimizedRecipe.ingredients.map(
      ingredient => ({
        ...ingredient,
        instance_id: ingredient.instance_id || generateIngredientInstanceId(),
      })
    );

    // Apply the optimized recipe to the current form state
    dispatch({
      type: "UPDATE_FIELD",
      field: "ingredients",
      value: normalizedIngredients,
    });
    dispatch({
      type: "UPDATE_FIELD",
      field: "boil_time",
      value: optimizedRecipe.boil_time,
    });
    dispatch({
      type: "UPDATE_FIELD",
      field: "efficiency",
      value: optimizedRecipe.efficiency,
    });
    dispatch({
      type: "UPDATE_FIELD",
      field: "mash_temperature",
      value: optimizedRecipe.mash_temperature,
    });
    dispatch({
      type: "UPDATE_FIELD",
      field: "mash_temp_unit",
      value: optimizedRecipe.mash_temp_unit,
    });
    if (optimizedRecipe.mash_time) {
      dispatch({
        type: "UPDATE_FIELD",
        field: "mash_time",
        value: optimizedRecipe.mash_time,
      });
    }

    setShowAIModal(false);
    Alert.alert(
      "Optimisation Applied",
      "Your recipe has been updated with the AI-optimised values."
    );

    UnifiedLogger.info("AIAnalysis", "AI optimisation applied successfully", {
      recipeName: recipeState.name,
    });
  };

  const handleDismissAIModal = () => {
    UnifiedLogger.debug("AIAnalysis", "User dismissed AI analysis modal", {
      hadResults: !!aiAnalysisResult,
      hadError: !!aiAnalysisError,
    });

    setShowAIModal(false);
    setAIAnalysisResult(null);
    setAIAnalysisError(null);
  };

  const handleRetryAIAnalysis = () => {
    UnifiedLogger.info("AIAnalysis", "User retrying AI analysis after error");
    handleAIAnalysis();
  };

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
    <View
      style={styles.progressContainer}
      testID={TEST_IDS.components.progressIndicator}
    >
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
            onAIAnalysis={handleAIAnalysis}
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
            onAIAnalysis={handleAIAnalysis}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Header */}
      <ModalHeader
        title="Create Recipe"
        onBack={handleCancel}
        testID="create-recipe-header"
        showHomeButton={false}
      />

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
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

      {/* AI Analysis Results Modal */}
      <AIAnalysisResultsModal
        visible={showAIModal}
        result={aiAnalysisResult}
        style={
          beerStyles?.find(s => s.id === recipeState.style_database_id) || null
        }
        originalRecipe={recipeState}
        loading={aiAnalysisLoading}
        error={aiAnalysisError}
        onApply={handleApplyOptimization}
        onDismiss={handleDismissAIModal}
        onRetry={handleRetryAIAnalysis}
      />
    </KeyboardAvoidingView>
  );
}
