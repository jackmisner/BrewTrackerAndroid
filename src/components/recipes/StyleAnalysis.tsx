/**
 * StyleAnalysis Component
 *
 * Displays real-time beer style adherence analysis showing how well a recipe
 * matches the selected style's specifications.
 *
 * Features:
 * - Real-time match percentage calculation
 * - Spec-by-spec breakdown (OG, FG, ABV, IBU, SRM)
 * - Color-coded status indicators (green/yellow/red)
 * - Compact and detailed display variants
 * - Collapsible spec breakdown
 * - 100% offline functionality
 *
 * @example
 * ```typescript
 * <StyleAnalysis
 *   styleName="American IPA"
 *   metrics={recipeMetrics}
 *   variant="detailed"
 * />
 * ```
 */

import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { useBeerStyles } from "@src/hooks/offlineV2";
import { RecipeMetrics, MetricType } from "@src/types";
import { createStyleAnalysisStyles } from "@styles/components/styleAnalysisStyles";
import {
  beerStyleAnalysisService,
  StyleMatchResult,
} from "@services/beerStyles/BeerStyleAnalysisService";
import { formatMetricValue } from "@utils/formatUtils";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

interface StyleAnalysisProps {
  /**
   * Name of the selected beer style
   */
  styleName: string;
  /**
   * Calculated recipe metrics (from useRecipeMetrics hook)
   * If not provided, component shows ranges only without adherence
   */
  metrics?: Partial<RecipeMetrics>;
  /**
   * Display variant: compact for badges, detailed for full breakdown
   */
  variant?: "compact" | "detailed";
  /**
   * Display mode: 'adherence' shows match %, 'ranges' shows only target ranges
   */
  mode: "adherence" | "ranges";
  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * Metric specifications with labels
 */
const METRIC_SPECS: Array<{ key: MetricType; label: string }> = [
  { key: "og", label: "OG" },
  { key: "fg", label: "FG" },
  { key: "abv", label: "ABV" },
  { key: "ibu", label: "IBU" },
  { key: "srm", label: "SRM" },
];

/**
 * Displays beer style adherence analysis with real-time metrics comparison
 * All calculations are performed offline using cached beer style data
 */
export function StyleAnalysis({
  styleName,
  metrics,
  variant = "detailed",
  mode,
  testID,
}: StyleAnalysisProps) {
  const theme = useTheme();
  const styles = createStyleAnalysisStyles(theme);
  const [isExpanded, setIsExpanded] = useState(variant === "detailed");

  // Fetch beer styles from cache (OFFLINE)
  const { data: beerStyles, isLoading: stylesLoading } = useBeerStyles();

  // Find the selected style from cached data (OFFLINE)
  const selectedStyle = useMemo(() => {
    if (!beerStyles || !styleName) {
      return null;
    }

    const found = beerStyles.find(
      s => s.name.toLowerCase() === styleName.toLowerCase()
    );

    if (found) {
      UnifiedLogger.debug("StyleAnalysis", "Found beer style", {
        styleName,
        styleId: found.style_id,
        hasRanges: {
          og: found.original_gravity
            ? `${found.original_gravity.minimum?.value}-${found.original_gravity.maximum?.value}`
            : "missing",
          fg: found.final_gravity
            ? `${found.final_gravity.minimum?.value}-${found.final_gravity.maximum?.value}`
            : "missing",
          abv: found.alcohol_by_volume
            ? `${found.alcohol_by_volume.minimum?.value}-${found.alcohol_by_volume.maximum?.value}`
            : "missing",
          ibu: found.international_bitterness_units
            ? `${found.international_bitterness_units.minimum?.value}-${found.international_bitterness_units.maximum?.value}`
            : "missing",
          srm: found.color
            ? `${found.color.minimum?.value}-${found.color.maximum?.value}`
            : "missing",
        },
      });
    } else {
      UnifiedLogger.warn("StyleAnalysis", "Beer style not found", {
        styleName,
        availableStyles: beerStyles.slice(0, 5).map(s => s.name),
      });
    }

    return found;
  }, [beerStyles, styleName]);

  // Calculate match result (OFFLINE) - only if in adherence mode with valid metrics
  const matchResult = useMemo((): StyleMatchResult | null => {
    if (mode !== "adherence" || !selectedStyle || !metrics) {
      return null;
    }

    // Check if we have at least one valid metric value
    const hasValidMetrics = Object.values(metrics).some(
      value => value !== null && value !== undefined
    );

    if (!hasValidMetrics) {
      return null;
    }

    return beerStyleAnalysisService.calculateStyleMatch(selectedStyle, metrics);
  }, [mode, selectedStyle, metrics]);

  // Get match status for color coding
  const matchStatus = useMemo(() => {
    if (!matchResult) {
      return null;
    }
    return beerStyleAnalysisService.getMatchStatus(matchResult.percentage);
  }, [matchResult]);

  // Loading state
  if (stylesLoading) {
    return (
      <View
        style={
          variant === "compact" ? styles.compactContainer : styles.container
        }
        testID={testID}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading style data...</Text>
        </View>
      </View>
    );
  }

  // Style not found
  if (!selectedStyle) {
    return (
      <View
        style={
          variant === "compact" ? styles.compactContainer : styles.container
        }
        testID={testID}
      >
        <View style={styles.emptyStateContainer}>
          <MaterialIcons
            name="info-outline"
            size={48}
            color={theme.colors.textMuted}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateText}>
            Style "{styleName}" not found in database
          </Text>
        </View>
      </View>
    );
  }

  // Note: We always show the adherence table in adherence mode, even without metrics
  // This gives users immediate visibility of target ranges and default values

  // Get color styles based on match status
  const getMatchColor = () => {
    switch (matchStatus) {
      case "excellent":
        return {
          badge: styles.matchBadgeExcellent,
          percentage: styles.matchPercentageExcellent,
          label: styles.matchLabelExcellent,
          progress: styles.progressBarExcellent,
        };
      case "good":
        return {
          badge: styles.matchBadgeGood,
          percentage: styles.matchPercentageGood,
          label: styles.matchLabelGood,
          progress: styles.progressBarGood,
        };
      case "needs-adjustment":
        return {
          badge: styles.matchBadgeNeeds,
          percentage: styles.matchPercentageNeeds,
          label: styles.matchLabelNeeds,
          progress: styles.progressBarNeeds,
        };
      default:
        return {
          badge: styles.matchBadgeNeeds,
          percentage: styles.matchPercentageNeeds,
          label: styles.matchLabelNeeds,
          progress: styles.progressBarNeeds,
        };
    }
  };

  const colorStyles = getMatchColor();
  const matchStatusLabel = matchResult
    ? beerStyleAnalysisService.getMatchStatusLabel(matchResult.percentage)
    : "";

  // Helper to get style range for a metric
  const getStyleRange = (metric: MetricType): string => {
    let precision: number;

    switch (metric) {
      case "og":
      case "fg":
        precision = 3;
        break;
      case "abv":
      case "srm":
        precision = 1;
        break;
      case "ibu":
        precision = 0;
        break;
      default:
        precision = 1; // Safe fallback for any new metric types
        UnifiedLogger.warn(
          "StyleAnalysis",
          `Unknown metric type: ${metric}, using default precision`
        );
        break;
    }

    const range = beerStyleAnalysisService.getRange(selectedStyle, metric);
    const formatted = beerStyleAnalysisService.formatStyleRange(
      range,
      precision
    );

    if (formatted === "-") {
      UnifiedLogger.warn("StyleAnalysis", `No range for ${metric}`, {
        metric,
        range,
        styleId: selectedStyle.style_id,
        styleName: selectedStyle.name,
      });
    }

    return formatted;
  };

  // Render spec row with 3-column table layout (Metric | Current | Target Range)
  const renderSpecRow = (
    metric: MetricType,
    label: string,
    matches?: boolean,
    isLast: boolean = false
  ) => {
    const styleRange = getStyleRange(metric);
    const metricValue = metrics?.[metric];
    const formattedValue = formatMetricValue(metric, metricValue);
    const hasValue = metricValue !== null && metricValue !== undefined;

    // Ranges-only mode: Just metric name and target range (no current values)
    // Only use this when explicitly set to "ranges" mode (BasicInfo, Parameters)
    if (mode === "ranges") {
      return (
        <View
          key={metric}
          style={[styles.specRow, isLast && styles.specRowLast]}
          testID={`${testID}-range-${metric}`}
        >
          {/* Ranges-only: Just metric name and target range */}
          <View style={styles.specColumn1}>
            <MaterialIcons
              name="circle"
              size={8}
              color={theme.colors.textMuted}
              style={styles.specIcon}
            />
            <Text style={styles.specName}>{label}</Text>
          </View>
          <View style={styles.specColumn2} />
          <View style={styles.specColumn3}>
            <Text style={styles.specRange}>{styleRange}</Text>
          </View>
        </View>
      );
    }

    // Adherence mode: Always show 3-column layout with current values
    // Show red X with N/A when no ingredients yet, green check/red X with actual values once added
    // 3-column layout: [Icon + Metric] | [Current Value] | [Target Range]
    return (
      <View
        key={metric}
        style={[styles.specRow, isLast && styles.specRowLast]}
        testID={`${testID}-spec-${metric}`}
      >
        {/* Column 1: Icon + Metric Name */}
        <View style={styles.specColumn1}>
          <MaterialIcons
            name={hasValue && matches ? "check-circle" : "cancel"}
            size={20}
            color={
              hasValue && matches ? theme.colors.success : theme.colors.error
            }
            style={styles.specIcon}
          />
          <Text style={styles.specName}>{label}</Text>
        </View>

        {/* Column 2: Current Value */}
        <View style={styles.specColumn2}>
          <Text
            style={[
              styles.specCurrentValue,
              hasValue && matches
                ? styles.specValueMatch
                : styles.specValueNoMatch,
            ]}
          >
            {formattedValue}
          </Text>
        </View>

        {/* Column 3: Target Range */}
        <View style={styles.specColumn3}>
          <Text style={styles.specRange}>{styleRange}</Text>
        </View>
      </View>
    );
  };

  // Compact variant
  if (variant === "compact") {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
        testID={testID}
      >
        <View style={styles.compactHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.compactTitle}>{selectedStyle.name}</Text>
            <Text style={styles.summaryText}>
              {mode === "ranges" ? "Target Ranges" : matchStatusLabel}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {mode === "adherence" && matchResult ? (
              <View style={[styles.matchBadge, colorStyles.badge]}>
                <Text
                  style={[
                    styles.matchPercentageCompact,
                    colorStyles.percentage,
                  ]}
                >
                  {Math.round(matchResult.percentage)}%
                </Text>
              </View>
            ) : (
              <MaterialIcons
                name="tune"
                size={24}
                color={theme.colors.primary}
              />
            )}
          </View>
        </View>

        {isExpanded && (
          <View style={styles.specsContainer}>
            <View style={styles.divider} />
            {METRIC_SPECS.map((spec, index) =>
              renderSpecRow(
                spec.key,
                spec.label,
                matchResult?.matches[spec.key],
                index === METRIC_SPECS.length - 1
              )
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Detailed variant
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {matchResult ? "Style Adherence" : "Style Guidelines"}
          </Text>
          <Text style={styles.styleName}>{selectedStyle.name}</Text>
        </View>
        <View style={styles.headerRight}>
          {matchResult ? (
            <View style={[styles.matchBadge, colorStyles.badge]}>
              <View>
                <Text style={[styles.matchPercentage, colorStyles.percentage]}>
                  {Math.round(matchResult.percentage)}%
                </Text>
                <Text style={[styles.matchLabel, colorStyles.label]}>
                  {matchStatusLabel}
                </Text>
              </View>
            </View>
          ) : (
            <MaterialIcons name="tune" size={32} color={theme.colors.primary} />
          )}
        </View>
      </View>

      {/* Progress bar - only when showing adherence with valid metrics */}
      {matchResult && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              colorStyles.progress,
              { width: `${matchResult.percentage}%` },
            ]}
          />
        </View>
      )}

      {/* Spec breakdown */}
      <View style={styles.specsContainer}>
        {METRIC_SPECS.map((spec, index) =>
          renderSpecRow(
            spec.key,
            spec.label,
            matchResult?.matches[spec.key],
            index === METRIC_SPECS.length - 1
          )
        )}
      </View>
    </View>
  );
}

export default StyleAnalysis;
