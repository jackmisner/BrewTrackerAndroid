import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { brewingMetricsStyles } from "@styles/components/brewingMetricsStyles";

interface BrewingMetricsProps {
  metrics?: {
    og?: number;
    fg?: number;
    abv?: number;
    ibu?: number;
    srm?: number;
  };
  mash_temperature?: number;
  mash_temp_unit?: "F" | "C";
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
  showTitle?: boolean;
  onRetry?: () => void;
}

/**
 * Reusable component for displaying brewing metrics in a clean grid layout.
 * 
 * Supports both static metrics (from saved recipes) and dynamic metrics (real-time calculation).
 * Includes loading states, error handling, and compact mode for different contexts.
 * 
 * @param metrics - The brewing metrics to display (OG, FG, ABV, IBU, SRM)
 * @param mash_temperature - Optional mash temperature value
 * @param mash_temp_unit - Unit for mash temperature (F or C)
 * @param loading - Whether metrics are currently being calculated
 * @param error - Error message if calculation failed
 * @param compact - Use compact layout for smaller spaces (recipe builder)
 * @param showTitle - Whether to show the "Brewing Metrics" title
 * @param onRetry - Callback for retry button when error occurs
 */
export const BrewingMetricsDisplay: React.FC<BrewingMetricsProps> = ({
  metrics,
  mash_temperature,
  mash_temp_unit,
  loading = false,
  error = null,
  compact = false,
  showTitle = true,
  onRetry,
}) => {
  const theme = useTheme();
  const styles = brewingMetricsStyles(theme, compact);

  /**
   * Format metric values based on type with proper decimal places
   */
  const formatMetricValue = (
    label: string,
    value: number | undefined,
    unit?: string
  ): string => {
    if (value === undefined || value === null) return "—";
    if (!Number.isFinite(value)) return "—";
    let formattedValue: string;
    
    switch (label) {
      case "ABV":
        formattedValue = value.toFixed(1);
        break;
      case "OG":
      case "FG":
        formattedValue = value.toFixed(3);
        break;
      case "IBU":
        formattedValue = Math.round(value).toString();
        break;
      case "SRM":
        formattedValue = value.toFixed(1);
        break;
      case "Mash Temp":
        formattedValue = Math.round(value).toString();
        break;
      default:
        formattedValue = value.toString();
    }

    return `${formattedValue}${unit || ""}`;
  };

  /**
   * Get hex color for SRM value (beer color visualization)
   */
  const getSrmColor = (srm: number): string => {
    // SRM to hex color mapping for beer color visualization
    if (srm <= 2) return "#F3F993"; // Very light
    if (srm <= 4) return "#F5F75C"; // Light
    if (srm <= 6) return "#F6F513"; // Pale
    if (srm <= 9) return "#EAE615"; // Light gold
    if (srm <= 12) return "#D5BC26"; // Gold
    if (srm <= 16) return "#BF923B"; // Amber
    if (srm <= 20) return "#A16928"; // Light brown
    if (srm <= 24) return "#8D4C32"; // Brown
    if (srm <= 29) return "#5D341A"; // Dark brown
    if (srm <= 35) return "#4A2727"; // Very dark brown
    if (srm <= 40) return "#361F1B"; // Black
    return "#261716"; // Very black
  };

  /**
   * Render individual metric card
   */
  const renderMetric = (
    label: string,
    value: number | undefined,
    unit?: string,
    showColorIndicator?: boolean
  ) => (
    <View style={styles.metricCard} key={label}>
      <Text style={styles.metricLabel}>{label}</Text>
      {loading ? (
        <View style={styles.loadingSkeleton} />
      ) : (
        <>
          <Text style={styles.metricValue}>
            {formatMetricValue(label, value, unit)}
          </Text>
          {showColorIndicator && value !== undefined && label === "SRM" && (
            <View
              style={[
                styles.srmColorIndicator,
                { backgroundColor: getSrmColor(value) },
              ]}
            />
          )}
        </>
      )}
    </View>
  );

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.container}>
        {showTitle && <Text style={styles.sectionTitle}>Brewing Metrics</Text>}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  /**
   * Render empty state when no metrics available
   */
  const hasAnyMetric =
    !!metrics &&
    Object.values(metrics).some(v => typeof v === "number" && Number.isFinite(v));
  if (!loading && !hasAnyMetric) {
    return (
      <View style={styles.container}>
        {showTitle && <Text style={styles.sectionTitle}>Brewing Metrics</Text>}
        <View style={styles.emptyState}>
          <MaterialIcons 
            name="analytics" 
            size={compact ? 24 : 32} 
            color={theme.colors.textSecondary} 
          />
          <Text style={styles.emptyStateText}>
            {compact
              ? "Add ingredients to see metrics"
              : "Metrics will appear as you add ingredients"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && <Text style={styles.sectionTitle}>Brewing Metrics</Text>}
      <View style={styles.metricsGrid}>
        {renderMetric("OG", metrics?.og)}
        {renderMetric("FG", metrics?.fg)}
        {renderMetric("ABV", metrics?.abv, "%")}
        {renderMetric("IBU", metrics?.ibu)}
        {renderMetric("SRM", metrics?.srm, "", true)} {/* Show color indicator for SRM */}
        
        {/* Show mash temperature in full mode or when explicitly provided */}
        {!compact && mash_temperature != null && renderMetric(
          "Mash Temp",
          mash_temperature,
          `°${mash_temp_unit || "F"}`
        )}
      </View>
    </View>
  );
};