/**
 * BeerXML Ingredient Matching Screen
 *
 * Mobile-optimized ingredient matching workflow for BeerXML imports.
 * Allows users to review and approve ingredient matches or create new ingredients.
 *
 * Features:
 * - Touch-optimized ingredient matching interface
 * - Swipe gestures for accept/reject actions
 * - Step-by-step ingredient review workflow
 * - Automatic ingredient creation for missing ingredients
 * - Progress tracking through matching process
 * - Native confirmation dialogs and feedback
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@contexts/ThemeContext";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import BeerXMLService from "@services/beerxml/BeerXMLService";
import { TEST_IDS } from "@src/constants/testIDs";

interface MatchingState {
  step: "matching" | "reviewing" | "creating" | "finalizing";
  isLoading: boolean;
  error: string | null;
  currentIndex: number;
  matchingResults: any[];
  decisions: {
    imported: any;
    action: "use_existing" | "create_new";
    selectedMatch?: any;
    newIngredientData?: any;
    confidence: number;
  }[];
  createdIngredients: any[];
  retryable?: boolean;
}

export default function IngredientMatchingScreen() {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);
  const params = useLocalSearchParams<{
    recipeData: string;
    filename: string;
  }>();

  const queryClient = useQueryClient();
  const [recipeData] = useState(() => {
    try {
      return JSON.parse(params.recipeData);
    } catch (error) {
      console.error("Failed to parse recipe data:", error);
      return null;
    }
  });

  const [matchingState, setMatchingState] = useState<MatchingState>({
    step: "matching",
    isLoading: true,
    error: null,
    currentIndex: 0,
    matchingResults: [],
    decisions: [],
    createdIngredients: [],
  });
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Initialize ingredient matching
   */
  useEffect(() => {
    let isActive = true;
    /**
     * Perform ingredient matching
     */
    const matchIngredients = async () => {
      try {
        const matchingResults = await BeerXMLService.matchIngredients(
          recipeData.ingredients
        );
        if (!isActive) {
          return;
        }

        // Initialize decisions
        const decisions = matchingResults.map(result => ({
          imported: result.imported,
          action: result.best_match
            ? "use_existing"
            : ("create_new" as "use_existing" | "create_new"),
          selectedMatch: result.best_match?.ingredient || null,
          newIngredientData: result.suggestedIngredientData || {
            // Prepare ingredient data from imported ingredient if no suggested data
            name: result.imported.name,
            type: result.imported.type,
            description: `Imported from BeerXML`,
            // Include type-specific fields from imported ingredient
            ...(result.imported.type === "grain" && {
              grain_type: result.imported.grain_type || "base_malt",
              potential: result.imported.potential,
              color: result.imported.color,
            }),
            ...(result.imported.type === "hop" && {
              alpha_acid: result.imported.alpha_acid,
            }),
            ...(result.imported.type === "yeast" && {
              attenuation: result.imported.attenuation,
            }),
            // Include any BeerXML metadata
            ...((result.imported as any).beerxml_data && {
              notes: `Origin: ${(result.imported as any).beerxml_data.origin || "Unknown"}`,
            }),
          },
          confidence: result.confidence,
        }));

        setMatchingState(prev => ({
          ...prev,
          isLoading: false,
          matchingResults,
          decisions,
          step: "reviewing",
        }));
      } catch (error) {
        console.error("🍺 Ingredient Matching - Error:", error);
        if (!isActive) {
          return;
        }
        setMatchingState(prev => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to match ingredients",
          retryable: true,
        }));
      }
    };

    if (!recipeData || !recipeData.ingredients) {
      setMatchingState(prev => ({
        ...prev,
        isLoading: false,
        error: "Invalid recipe data provided",
      }));
      return;
    }
    matchIngredients();
    return () => {
      isActive = false;
    };
  }, [recipeData, retryCount]);

  /**
   * Update decision for current ingredient
   */
  const updateDecision = (
    action: "use_existing" | "create_new",
    selectedMatch?: any,
    newIngredientData?: any
  ) => {
    setMatchingState(prev => ({
      ...prev,
      decisions: prev.decisions.map((decision, index) =>
        index === prev.currentIndex
          ? {
              ...decision,
              action,
              selectedMatch,
              newIngredientData:
                newIngredientData || decision.newIngredientData,
            }
          : decision
      ),
    }));
  };

  /**
   * Move to next ingredient
   */
  const nextIngredient = () => {
    setMatchingState(prev => {
      if (prev.currentIndex < prev.decisions.length - 1) {
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
        };
      }
      return prev;
    });
  };

  /**
   * Move to previous ingredient
   */
  const previousIngredient = () => {
    setMatchingState(prev => {
      if (prev.currentIndex > 0) {
        return {
          ...prev,
          currentIndex: prev.currentIndex - 1,
        };
      }
      return prev;
    });
  };

  /**
   * Complete the matching process
   */
  const completeMatching = async () => {
    setMatchingState(prev => ({ ...prev, step: "creating", isLoading: true }));

    try {
      // Collect ingredients that need to be created
      const ingredientsToCreate = matchingState.decisions
        .filter(decision => decision.action === "create_new")
        .map(decision => decision.newIngredientData)
        .filter(Boolean);

      let createdIngredients: any[] = [];

      // Create new ingredients if needed
      if (ingredientsToCreate.length > 0) {
        createdIngredients =
          await BeerXMLService.createIngredients(ingredientsToCreate);
      }

      // Prepare final ingredient list for recipe creation
      const finalIngredients = matchingState.decisions.map(
        (decision, index) => {
          if (decision.action === "use_existing") {
            // Use existing ingredient with imported amounts/usage
            return {
              ...decision.imported,
              ingredient_id:
                decision.selectedMatch.id ||
                decision.selectedMatch.ingredient_id,
              name: decision.selectedMatch.name,
            };
          } else {
            // Use newly created ingredient
            // Match by the ingredient data object reference or fall back to index mapping
            let createdIndex = ingredientsToCreate.findIndex(
              ing => ing === decision.newIngredientData
            );

            // If direct reference match fails, try matching by name and type
            if (createdIndex === -1) {
              createdIndex = ingredientsToCreate.findIndex(
                ing =>
                  ing.name === decision.newIngredientData?.name &&
                  ing.type === decision.newIngredientData?.type
              );
            }

            // If still not found, use the order of creation (index in decisions)
            if (createdIndex === -1) {
              const createNewDecisions = matchingState.decisions
                .slice(0, index + 1)
                .filter(d => d.action === "create_new");
              createdIndex = createNewDecisions.length - 1;
            }

            const createdIngredient =
              createdIndex !== -1 && createdIndex < createdIngredients.length
                ? createdIngredients[createdIndex]
                : null;

            if (!createdIngredient?.id && !createdIngredient?.ingredient_id) {
              console.error(
                "Failed to associate created ingredient for:",
                decision.imported.name
              );
              console.error(
                "Available created ingredients:",
                createdIngredients
              );
              console.error("CreatedIndex:", createdIndex);
              console.error(
                "IngredientsToCreate length:",
                ingredientsToCreate.length
              );
            }

            return {
              ...decision.imported,
              ingredient_id:
                createdIngredient?.id || createdIngredient?.ingredient_id,
              name: createdIngredient?.name || decision.imported.name,
            };
          }
        }
      );

      // Prepare recipe data
      const finalRecipeData = {
        ...recipeData,
        ingredients: finalIngredients,
      };

      // Navigate to final import confirmation
      router.push({
        pathname: "/(modals)/(beerxml)/importReview",
        params: {
          recipeData: JSON.stringify(finalRecipeData),
          filename: params.filename,
          createdIngredientsCount: createdIngredients.length.toString(),
        },
      });

      // Invalidate ingredient queries to show newly created ingredients
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    } catch (error) {
      console.error("🍺 Ingredient Matching - Completion error:", error);
      setMatchingState(prev => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to complete import",
        step: "reviewing",
      }));
    }
  };

  /**
   * Navigate back
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Render matching progress
   */
  const renderProgress = () => {
    const current = matchingState.currentIndex + 1;
    const total = matchingState.decisions.length;
    const percent =
      total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Ingredient {current} of {total}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      </View>
    );
  };

  /**
   * Render current ingredient matching
   */
  const renderIngredientMatching = () => {
    const currentDecision = matchingState.decisions[matchingState.currentIndex];
    const matchingResult =
      matchingState.matchingResults[matchingState.currentIndex];

    if (!currentDecision || !matchingResult) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredient Matching</Text>

        {/* Imported ingredient info */}
        <View style={styles.ingredientCard}>
          <Text style={styles.ingredientName}>
            {currentDecision.imported.name}
          </Text>
          <Text style={styles.ingredientDetails}>
            {[
              currentDecision.imported.amount && currentDecision.imported.unit
                ? `${currentDecision.imported.amount} ${currentDecision.imported.unit}`
                : null,
              currentDecision.imported.type,
              currentDecision.imported.use,
            ]
              .filter(Boolean)
              .join(" • ")}
          </Text>
        </View>

        {/* Matching options */}
        {matchingResult.best_match ? (
          <View style={styles.matchingOptions}>
            <Text style={styles.optionsTitle}>Found Match:</Text>

            <TouchableOpacity
              style={[
                styles.matchOption,
                currentDecision.action === "use_existing" &&
                  styles.selectedMatchOption,
              ]}
              onPress={() =>
                updateDecision(
                  "use_existing",
                  matchingResult.best_match.ingredient
                )
              }
              testID={TEST_IDS.patterns.touchableOpacityAction(
                "use-existing-ingredient"
              )}
            >
              <View style={styles.matchOptionContent}>
                <Text style={styles.matchOptionName}>
                  {matchingResult.best_match.ingredient.name}
                </Text>
                <Text style={styles.matchOptionConfidence}>
                  {Math.round(currentDecision.confidence * 100)}% confidence
                </Text>
                {matchingResult.best_match.reasons ? (
                  <Text style={styles.matchOptionReasons}>
                    {matchingResult.best_match.reasons.join(", ")}
                  </Text>
                ) : null}
              </View>
              <MaterialIcons
                name={
                  currentDecision.action === "use_existing"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.matchOption,
                currentDecision.action === "create_new" &&
                  styles.selectedMatchOption,
              ]}
              onPress={() => updateDecision("create_new")}
              testID={TEST_IDS.patterns.touchableOpacityAction(
                "create-new-ingredient"
              )}
            >
              <View style={styles.matchOptionContent}>
                <Text style={styles.matchOptionName}>
                  Create New Ingredient
                </Text>
                <Text style={styles.matchOptionDetails}>
                  Will create: {currentDecision.imported.name}
                </Text>
              </View>
              <MaterialIcons
                name={
                  currentDecision.action === "create_new"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noMatchContainer}>
            <Text style={styles.noMatchText}>
              No matching ingredient found. A new ingredient will be created.
            </Text>
            <Text style={styles.newIngredientName}>
              &quot;{currentDecision.imported.name}&quot;
            </Text>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={previousIngredient}
            disabled={matchingState.currentIndex === 0}
            testID={TEST_IDS.patterns.touchableOpacityAction(
              "previous-ingredient"
            )}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Previous
            </Text>
          </TouchableOpacity>

          {matchingState.currentIndex === matchingState.decisions.length - 1 ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={completeMatching}
              testID={TEST_IDS.patterns.touchableOpacityAction(
                "complete-import"
              )}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Complete Import
              </Text>
              <MaterialIcons
                name="check"
                size={24}
                color={theme.colors.background}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={nextIngredient}
              testID={TEST_IDS.patterns.touchableOpacityAction(
                "next-ingredient"
              )}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Next
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={24}
                color={theme.colors.background}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  /**
   * Render loading state
   */
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>
        {matchingState.step === "matching" && "Matching ingredients..."}
        {matchingState.step === "creating" && "Creating ingredients..."}
        {matchingState.step === "finalizing" && "Finalizing import..."}
      </Text>
    </View>
  );

  /**
   * Render error state
   */
  const renderError = () => (
    <View style={styles.section}>
      <Text style={styles.errorTitle}>Matching Error</Text>
      <Text style={styles.errorText}>{matchingState.error}</Text>
      {matchingState.retryable ? (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => {
            setMatchingState(p => ({
              ...p,
              isLoading: true,
              error: null,
              step: "matching",
            }));
            setRetryCount(c => c + 1);
          }}
          testID={TEST_IDS.patterns.touchableOpacityAction("try-again")}
        >
          <MaterialIcons
            name="refresh"
            size={24}
            color={theme.colors.background}
          />
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            Try Again
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={() => router.back()}
        testID={TEST_IDS.patterns.touchableOpacityAction("go-back")}
      >
        <MaterialIcons
          name="arrow-back"
          size={24}
          color={theme.colors.background}
        />
        <Text style={[styles.buttonText, styles.primaryButtonText]}>
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!recipeData) {
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.errorTitle}>Invalid Recipe Data</Text>
          <Text style={styles.errorText}>
            The recipe data could not be loaded. Please try importing again.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.back()}
            testID={TEST_IDS.patterns.touchableOpacityAction(
              "invalid-recipe-go-back"
            )}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.background}
            />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          testID={TEST_IDS.patterns.touchableOpacityAction(
            "ingredient-matching-back"
          )}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ingredient Matching</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={TEST_IDS.patterns.scrollAction("ingredient-matching")}
      >
        {matchingState.step === "reviewing" && renderProgress()}

        {matchingState.isLoading && renderLoading()}
        {matchingState.error && renderError()}
        {!matchingState.isLoading &&
          !matchingState.error &&
          matchingState.step === "reviewing" &&
          renderIngredientMatching()}
      </ScrollView>
    </View>
  );
}
