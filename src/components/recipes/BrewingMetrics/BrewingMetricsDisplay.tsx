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
    // Coerce strings like "1.050" to numbers safely
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return "—";
    let formattedValue: string;

    switch (label) {
      case "ABV":
        formattedValue = num.toFixed(1);
        break;
      case "OG":
      case "FG":
        formattedValue = num.toFixed(3);
        break;
      case "IBU":
        formattedValue = Math.round(num).toString();
        break;
      case "SRM":
        formattedValue = num.toFixed(1);
        break;
      case "Mash Temp":
        formattedValue = Math.round(num).toString();
        break;
      default:
        formattedValue = num.toString();
    }

    return `${formattedValue}${unit || ""}`;
  };

  /**
   * Get hex color for SRM value (beer color visualization)
   */
  function getSrmColor(srm: number | string | null | undefined): string {
    if (!srm) return "#FFE699";
    const numSrm = parseFloat(srm.toString());
    if (isNaN(numSrm) || numSrm < 0) return "#FFE699";

    // Round to nearest integer for lookup
    const roundedSrm = Math.round(numSrm);

    // Colors for SRM 0-40, anything above 40 returns black
    if (roundedSrm > 40) return "#000000";

    const srmColors: string[] = [
      "#FFE699", // SRM 0
      "#FFE699", // SRM 1
      "#FFE699", // SRM 2
      "#FFCA5A", // SRM 3
      "#FFBF42", // SRM 4
      "#FFC232", // SRM 5
      "#FBB123", // SRM 6
      "#F8A615", // SRM 7
      "#F39C00", // SRM 8
      "#F09100", // SRM 9
      "#E58500", // SRM 10
      "#E07A00", // SRM 11
      "#DB6F00", // SRM 12
      "#CF6900", // SRM 13
      "#CA5E00", // SRM 14
      "#C45400", // SRM 15
      "#BE4A00", // SRM 16
      "#BB5100", // SRM 17
      "#B04600", // SRM 18
      "#A63C00", // SRM 19
      "#A13700", // SRM 20
      "#9B3200", // SRM 21
      "#962E00", // SRM 22
      "#912A00", // SRM 23
      "#8E2900", // SRM 24
      "#862400", // SRM 25
      "#7E1F00", // SRM 26
      "#761B00", // SRM 27
      "#6E1700", // SRM 28
      "#701400", // SRM 29
      "#6A1200", // SRM 30
      "#651000", // SRM 31
      "#600E00", // SRM 32
      "#5B0C00", // SRM 33
      "#560A01", // SRM 34
      "#600903", // SRM 35
      "#550802", // SRM 36
      "#4A0702", // SRM 37
      "#420601", // SRM 38
      "#3D0601", // SRM 39
      "#3D0708", // SRM 40
    ];

    return srmColors[roundedSrm];
  }

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
          <MaterialIcons
            name="error-outline"
            size={24}
            color={theme.colors.error}
          />
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
    Object.values(metrics).some(
      v => typeof v === "number" && Number.isFinite(v)
    );
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
        {renderMetric("SRM", metrics?.srm, "", true)}
        {/* Show color indicator for SRM */}
        {/* Show mash temperature in full mode or when explicitly provided */}
        {!compact &&
          mash_temperature != null &&
          renderMetric(
            "Mash Temp",
            mash_temperature,
            `°${mash_temp_unit || "F"}`
          )}
      </View>
    </View>
  );
};
