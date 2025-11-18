/**
 * AI Analysis Results Modal Component
 *
 * Displays AI recipe analysis and optimisation results in a modal overlay.
 * Shows metrics comparison, recipe changes, and allows user to apply or dismiss optimisations.
 *
 * Features:
 * - Scrollable results view with sections
 * - Metrics comparison (original vs optimised)
 * - Grouped recipe changes (modifications, additions, removals, parameters)
 * - Apply/dismiss actions
 * - Loading and error states
 * - Theme-aware styling
 *
 * @example
 * ```typescript
 * <AIAnalysisResultsModal
 *   visible={showResults}
 *   result={analysisResult}
 *   onApply={(optimisedRecipe) => handleApply(optimisedRecipe)}
 *   onDismiss={() => setShowResults(false)}
 * />
 * ```
 */

import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { createAIStyles } from "@styles/ai/aiStyles";
import { TEST_IDS } from "@src/constants/testIDs";
import {
  AIAnalysisResponse,
  Recipe,
  MetricType,
  BeerStyle,
  RecipeFormData,
} from "@src/types";
import {
  groupRecipeChanges,
  formatChangeDescription,
  formatMetricForComparison,
  isMetricImproved,
  enrichRecipeChanges,
  normalizeBackendMetrics,
} from "@utils/aiHelpers";
import { beerStyleAnalysisService } from "@services/beerStyles/BeerStyleAnalysisService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

interface AIAnalysisResultsModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * AI analysis result data (null when loading or error)
   */
  result: AIAnalysisResponse | null;

  /**
   * Beer style for style guidelines (optional)
   */
  style?: BeerStyle | null;

  /**
   * Original recipe data (for enriching changes with actual user values)
   */
  originalRecipe?: RecipeFormData;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Error message (if analysis failed)
   */
  error?: string | null;

  /**
   * Callback when user applies optimisation
   */
  onApply: (optimisedRecipe: Recipe) => void;

  /**
   * Callback when user dismisses modal
   */
  onDismiss: () => void;

  /**
   * Callback to retry analysis (shown on error)
   */
  onRetry?: () => void;

  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * Modal displaying AI recipe analysis results with apply/dismiss actions
 */
export function AIAnalysisResultsModal({
  visible,
  result,
  style,
  originalRecipe,
  loading = false,
  error = null,
  onApply,
  onDismiss,
  onRetry,
  testID = TEST_IDS.ai.resultsModal,
}: AIAnalysisResultsModalProps) {
  const theme = useTheme();
  const styles = createAIStyles(theme);

  // Normalize backend metrics (uppercase keys) to RecipeMetrics format (lowercase keys)
  const normalizedOriginalMetrics = useMemo(
    () => normalizeBackendMetrics(result?.original_metrics as any),
    [result?.original_metrics]
  );

  const normalizedOptimizedMetrics = useMemo(
    () => normalizeBackendMetrics(result?.optimized_metrics as any),
    [result?.optimized_metrics]
  );

  // Enrich and group recipe changes for organized display
  const groupedChanges = useMemo(() => {
    if (!result?.recipe_changes) {
      return null;
    }

    // Enrich changes with actual original values from user's recipe
    const enrichedChanges = originalRecipe
      ? enrichRecipeChanges(result.recipe_changes, originalRecipe)
      : result.recipe_changes;

    return groupRecipeChanges(enrichedChanges);
  }, [result?.recipe_changes, originalRecipe]);

  // Metrics to display with proper MetricType
  const metrics = useMemo<Array<{ key: MetricType; label: string }>>(
    () => [
      { key: "og", label: "OG" },
      { key: "fg", label: "FG" },
      { key: "abv", label: "ABV" },
      { key: "ibu", label: "IBU" },
      { key: "srm", label: "SRM" },
    ],
    []
  );

  const handleApply = () => {
    if (result?.optimized_recipe) {
      onApply(result.optimized_recipe);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        testID={testID}
      >
        <View
          style={styles.modalOverlay}
          testID={TEST_IDS.ai.resultsModalOverlay}
        >
          <View
            style={[styles.modalContent, { maxHeight: "40%" }]}
            testID={TEST_IDS.ai.resultsModalContent}
          >
            <View
              style={styles.loadingContainer}
              testID={TEST_IDS.ai.loadingContainer}
            >
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Analysing your recipe...</Text>
              <Text style={styles.loadingSubtext}>
                This may take up to 30 seconds
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Render error state
  if (error) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        testID={testID}
      >
        <View
          style={styles.modalOverlay}
          testID={TEST_IDS.ai.resultsModalOverlay}
        >
          <View
            style={[styles.modalContent, { maxHeight: "50%" }]}
            testID={TEST_IDS.ai.resultsModalContent}
          >
            {/* Header */}
            <View
              style={styles.modalHeader}
              testID={TEST_IDS.ai.resultsModalHeader}
            >
              <Text
                style={styles.modalTitle}
                testID={TEST_IDS.ai.resultsModalTitle}
              >
                Analysis Failed
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onDismiss}
                activeOpacity={0.7}
                testID={TEST_IDS.ai.closeButton}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Error content */}
            <View
              style={styles.errorContainer}
              testID={TEST_IDS.ai.errorContainer}
            >
              <MaterialIcons
                name="error-outline"
                size={48}
                color={theme.colors.error}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.errorTitle}>Unable to Analyse Recipe</Text>
              <Text style={styles.errorText}>{error}</Text>
              {onRetry && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRetry}
                  activeOpacity={0.7}
                  testID={TEST_IDS.ai.retryButton}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Render results
  if (!result) {
    return null;
  }

  const hasOptimisation = !!(
    result.optimization_performed && result.optimized_recipe
  );

  // Debug logging
  UnifiedLogger.debug("AIAnalysisResultsModal", "Rendering modal", {
    hasOptimisation,
    hasStyle: !!style,
    styleName: style?.name,
    styleId: style?.id,
    recipeChangesCount: result.recipe_changes?.length || 0,
    hasOriginalMetrics: !!result.original_metrics,
    hasOptimizedMetrics: !!result.optimized_metrics,
    iterationsCompleted: result.iterations_completed,
  });

  // Debug grouped changes
  UnifiedLogger.debug("AIAnalysisResultsModal", "Grouped changes", {
    hasGroupedChanges: !!groupedChanges,
    parametersCount: groupedChanges?.parameters.length || 0,
    modificationsCount: groupedChanges?.modifications.length || 0,
    additionsCount: groupedChanges?.additions.length || 0,
    removalsCount: groupedChanges?.removals.length || 0,
  });

  // Debug conditionals - ensure all are explicit booleans
  const showSummary = hasOptimisation;
  const showMetrics =
    hasOptimisation &&
    !!normalizedOriginalMetrics &&
    !!normalizedOptimizedMetrics;
  const showChanges = hasOptimisation && !!groupedChanges;

  UnifiedLogger.debug("AIAnalysisResultsModal", "Boolean check", {
    hasOptimisationType: typeof hasOptimisation,
    hasOptimisationValue: hasOptimisation,
    showSummaryType: typeof showSummary,
    showSummaryValue: showSummary,
  });

  UnifiedLogger.debug("AIAnalysisResultsModal", "Section visibility", {
    showSummary,
    showMetrics,
    showChanges,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID={testID}
    >
      <View
        style={styles.modalOverlay}
        testID={TEST_IDS.ai.resultsModalOverlay}
      >
        <View
          style={[styles.modalContent, { height: "80%" }]}
          testID={TEST_IDS.ai.resultsModalContent}
        >
          {/* Header */}
          <View
            style={styles.modalHeader}
            testID={TEST_IDS.ai.resultsModalHeader}
          >
            <Text
              style={styles.modalTitle}
              testID={TEST_IDS.ai.resultsModalTitle}
            >
              {hasOptimisation ? "Recipe Optimisation" : "Recipe Analysis"}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              activeOpacity={0.7}
              testID={TEST_IDS.ai.closeButton}
            >
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {/* Summary section */}
            {showSummary && (
              <View
                style={styles.summaryContainer}
                testID={TEST_IDS.ai.summaryContainer}
              >
                <Text style={styles.summaryTitle}>Optimisation Complete</Text>
                <Text style={styles.summaryText}>
                  The AI has analysed your recipe and made{" "}
                  {result.recipe_changes?.length || 0} changes to improve style
                  adherence
                  {style ? ` for ${style.name}` : ""}.
                </Text>
              </View>
            )}

            {/* Metrics comparison */}
            {showMetrics && (
              <>
                <Text style={styles.metricsSectionTitle}>
                  Metrics Comparison
                </Text>
                <View
                  style={styles.metricsContainer}
                  testID={TEST_IDS.ai.metricsContainer}
                >
                  {/* Header Row */}
                  <View style={styles.metricHeaderRow}>
                    <Text style={styles.metricHeaderCell}>Metric</Text>
                    <Text style={styles.metricHeaderCell}>Original</Text>
                    <Text style={styles.metricHeaderCell}>Optimised</Text>
                    <Text style={styles.metricHeaderCell}>Style Range</Text>
                  </View>

                  {metrics.map((metric, index) => {
                    // Access normalized metrics with lowercase keys
                    const original = normalizedOriginalMetrics?.[metric.key];
                    const optimised = normalizedOptimizedMetrics?.[metric.key];

                    // Use existing BeerStyleAnalysisService to extract ranges
                    const range = style
                      ? beerStyleAnalysisService.getRange(style, metric.key)
                      : undefined;
                    const min = range?.min;
                    const max = range?.max;

                    const improved =
                      original !== undefined &&
                      optimised !== undefined &&
                      isMetricImproved(original, optimised, min, max);

                    const inRange =
                      optimised !== undefined &&
                      range !== undefined &&
                      beerStyleAnalysisService.isInRange(optimised, range);

                    // Format range string
                    const rangeString =
                      min !== undefined && max !== undefined
                        ? `${formatMetricForComparison(metric.label, min)} - ${formatMetricForComparison(metric.label, max)}`
                        : "—";

                    return (
                      <View
                        key={metric.key}
                        style={[
                          styles.metricDataRow,
                          index === metrics.length - 1 && styles.metricRowLast,
                        ]}
                        testID={TEST_IDS.patterns.aiMetricRow(metric.key)}
                      >
                        <Text style={styles.metricNameCell}>
                          {metric.label}
                        </Text>
                        <Text style={styles.metricValueCell}>
                          {formatMetricForComparison(metric.label, original)}
                        </Text>
                        <Text
                          style={[
                            styles.metricValueCell,
                            inRange
                              ? styles.metricValueInRange
                              : improved
                                ? styles.metricValueImproved
                                : styles.metricValueUnchanged,
                          ]}
                        >
                          {formatMetricForComparison(metric.label, optimised)}
                        </Text>
                        <Text style={styles.metricRangeCell}>
                          {rangeString}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Recipe changes */}
            {showChanges && (
              <>
                <Text style={styles.changesSectionTitle}>Recipe Changes</Text>
                <View
                  style={styles.changesContainer}
                  testID={TEST_IDS.ai.changesContainer}
                >
                  {/* Parameters */}
                  {groupedChanges.parameters.length > 0 && (
                    <>
                      <Text style={styles.changeGroupTitle}>Parameters</Text>
                      {groupedChanges.parameters.map((change, index) => (
                        <View
                          key={`param-${index}`}
                          style={[
                            styles.changeItem,
                            styles.changeItemParameter,
                          ]}
                          testID={TEST_IDS.patterns.aiChangeItem(
                            `parameter-${index}`
                          )}
                        >
                          <Text style={styles.changeDescription}>
                            {formatChangeDescription(change)}
                          </Text>
                          <Text style={styles.changeReason}>
                            {change.change_reason}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Modifications */}
                  {groupedChanges.modifications.length > 0 && (
                    <>
                      <Text style={styles.changeGroupTitle}>
                        Ingredient Modifications
                      </Text>
                      {groupedChanges.modifications.map((change, index) => (
                        <View
                          key={`mod-${index}`}
                          style={[
                            styles.changeItem,
                            styles.changeItemModification,
                          ]}
                          testID={TEST_IDS.patterns.aiChangeItem(
                            `modification-${index}`
                          )}
                        >
                          <Text style={styles.changeDescription}>
                            {formatChangeDescription(change)}
                          </Text>
                          <Text style={styles.changeReason}>
                            {change.change_reason}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Additions */}
                  {groupedChanges.additions.length > 0 && (
                    <>
                      <Text style={styles.changeGroupTitle}>
                        New Ingredients
                      </Text>
                      {groupedChanges.additions.map((change, index) => (
                        <View
                          key={`add-${index}`}
                          style={[styles.changeItem, styles.changeItemAddition]}
                          testID={TEST_IDS.patterns.aiChangeItem(
                            `addition-${index}`
                          )}
                        >
                          <Text style={styles.changeDescription}>
                            {formatChangeDescription(change)}
                          </Text>
                          <Text style={styles.changeReason}>
                            {change.change_reason}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Removals */}
                  {groupedChanges.removals.length > 0 && (
                    <>
                      <Text style={styles.changeGroupTitle}>
                        Removed Ingredients
                      </Text>
                      {groupedChanges.removals.map((change, index) => (
                        <View
                          key={`rem-${index}`}
                          style={[styles.changeItem, styles.changeItemRemoval]}
                          testID={TEST_IDS.patterns.aiChangeItem(
                            `removal-${index}`
                          )}
                        >
                          <Text style={styles.changeDescription}>
                            {formatChangeDescription(change)}
                          </Text>
                          <Text style={styles.changeReason}>
                            {change.change_reason}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </>
            )}

            {/* Non-optimisation analysis (suggestions only) */}
            {!hasOptimisation &&
              result.suggestions &&
              result.suggestions.length > 0 && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Analysis Complete</Text>
                  <Text style={styles.summaryText}>
                    Your recipe looks good! Here are {result.suggestions.length}{" "}
                    suggestions for potential improvements.
                  </Text>
                </View>
              )}
          </ScrollView>

          {/* Action buttons */}
          {hasOptimisation && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.applyButton]}
                onPress={handleApply}
                activeOpacity={0.7}
                testID={TEST_IDS.ai.applyButton}
              >
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.colors.primaryText}
                />
                <Text style={[styles.actionButtonText, styles.applyButtonText]}>
                  Apply Changes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.dismissButton]}
                onPress={onDismiss}
                activeOpacity={0.7}
                testID={TEST_IDS.ai.dismissButton}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme.colors.text}
                />
                <Text
                  style={[styles.actionButtonText, styles.dismissButtonText]}
                >
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default AIAnalysisResultsModal;
