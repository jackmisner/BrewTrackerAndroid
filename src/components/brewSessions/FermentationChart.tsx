import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { FermentationEntry, Recipe } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { useScreenDimensions } from "@contexts/ScreenDimensionsContext";
import { formatGravity } from "@utils/formatUtils";

// Chart wrapper component that forces complete remount
const ChartWrapper: React.FC<{
  children: React.ReactNode;
  refreshKey: string | number;
}> = ({ children, refreshKey }) => {
  return (
    <View key={`chart-wrapper-${refreshKey}`} style={{ width: "100%" }}>
      {children}
    </View>
  );
};

// Reusable chart section component to eliminate duplication
const ChartSection: React.FC<{
  title: string;
  children: React.ReactNode;
  theme: any;
  styles: any;
}> = ({ title, children, theme, styles }) => {
  return (
    <View style={styles.chartSection}>
      <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View style={styles.chart}>{children}</View>
    </View>
  );
};

// Reusable modal data row component to eliminate duplication
const ModalDataRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  theme: any;
  styles: any;
}> = ({ label, value, valueColor, theme, styles }) => {
  return (
    <View style={styles.modalRow}>
      <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
        {label}:
      </Text>
      <Text
        style={[styles.modalValue, { color: valueColor || theme.colors.text }]}
      >
        {value}
      </Text>
    </View>
  );
};

// Chart utility functions
const chartUtils = {
  /**
   * Calculate visual height position for data point positioning
   */
  calculateVisualHeight: (
    value: number,
    axisConfig: { minValue: number; maxValue: number }
  ): number => {
    const range = axisConfig.maxValue - axisConfig.minValue;
    const normalizedPosition = (value - axisConfig.minValue) / range;
    return Math.min(1, Math.max(0, normalizedPosition));
  },

  /**
   * Create axis configuration with smart bounds
   */
  createAxisConfig: (
    values: number[],
    padding: number = 0.01
  ): { minValue: number; maxValue: number } => {
    if (values.length === 0) return { minValue: 0, maxValue: 1 };

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Smart bounds for gravity values close to 1.000
    let adjustedMinValue = minValue - padding;
    if (minValue < 1.01) {
      adjustedMinValue = 0.995; // Provide space below for labels when readings are low
    }

    return {
      minValue: adjustedMinValue,
      maxValue: maxValue + padding,
    };
  },

  /**
   * Build chart configuration with common settings
   */
  buildChartConfig: (
    width: number,
    axisConfig: { minValue: number; maxValue: number },
    theme: any,
    additionalConfig: any = {}
  ) => {
    const baseConfig = {
      width,
      height: 200,
      yAxisOffset: axisConfig.minValue,
      maxValue: axisConfig.maxValue - axisConfig.minValue,
      noOfSections: 6,
      spacing: 50,
      backgroundColor: "transparent",
      yAxisColor: theme.colors.border,
      xAxisColor: theme.colors.border,
      yAxisTextStyle: { color: theme.colors.textSecondary, fontSize: 10 },
      xAxisTextStyle: { color: theme.colors.textSecondary, fontSize: 10 },
      showVerticalLines: true,
      verticalLinesColor: theme.colors.border,
      verticalLinesThickness: 0.5,
      hideRules: false,
      rulesColor: theme.colors.border,
      rulesThickness: 0.5,
      hideYAxisText: false,
      hideAxesAndRules: false,
      showYAxisIndices: false,
      pointerConfig: {
        pointerStripHeight: 200,
        pointerStripColor: theme.colors.textMuted,
        pointerStripWidth: 1,
        strokeDashArray: [3, 3],
        shiftPointerLabelX: 2,
        pointerLabelWidth: 100,
        pointerLabelHeight: 90,
        pointerLabelComponent: () => null,
      },
    };

    return { ...baseConfig, ...additionalConfig };
  },
};

interface FermentationChartProps {
  fermentationData: FermentationEntry[];
  expectedFG?: number;
  actualOG?: number;
  temperatureUnit?: "C" | "F"; // Session-specific temperature unit
  forceRefresh?: number; // External refresh trigger
  recipeData?: Recipe; // Recipe data for accessing estimated_fg
}

interface ProcessedDataPoint {
  x: number; // Day number
  gravity?: number;
  temperature?: number;
  ph?: number;
  date: string; // For display
  rawDate: Date; // Original Date object for chart formatting
}

export const FermentationChart: React.FC<FermentationChartProps> = ({
  fermentationData = [],
  expectedFG,
  actualOG,
  temperatureUnit,
  forceRefresh = 0,
  recipeData,
}) => {
  const theme = useTheme();
  const units = useUnits();
  const { dimensions: screenDimensions, refreshDimensions } =
    useScreenDimensions();
  const [combinedView, setCombinedView] = React.useState(true);
  const [chartRefreshKey, setChartRefreshKey] = React.useState(0);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [modalData, setModalData] = React.useState<{
    title: string;
    date: string;
    gravity?: string;
    temperature?: string;
    ph?: string;
  } | null>(null);

  // Force chart refresh when fermentation data, screen dimensions, or external refresh changes
  React.useEffect(() => {
    setChartRefreshKey(prev => prev + 1);
  }, [
    fermentationData,
    forceRefresh,
    screenDimensions.width,
    screenDimensions.height,
  ]);

  // Force refresh when switching between combined/separate views
  const handleViewToggle = React.useCallback(() => {
    setCombinedView(prev => !prev);
    // Add small delay to ensure state change is processed before refresh
    setChartRefreshKey(prev => prev + 1);
  }, []);

  // Get temperature symbol based on session-specific unit, fallback to user preference
  const getSessionTemperatureSymbol = React.useCallback((): string => {
    if (temperatureUnit) {
      return temperatureUnit === "C" ? "°C" : "°F";
    }
    return units.getTemperatureSymbol(); // Fallback to user preference
  }, [temperatureUnit, units]);

  // Format temperature using session-specific unit
  const formatSessionTemperature = React.useCallback(
    (value: number, precision: number = 1): string => {
      const symbol = getSessionTemperatureSymbol();

      return `${value.toFixed(precision)}${symbol}`;
    },
    [getSessionTemperatureSymbol]
  );

  // Transform fermentation data to chart format
  const processedData: ProcessedDataPoint[] = React.useMemo(() => {
    if (!fermentationData || fermentationData.length === 0) {
      return [];
    }

    // Helper function to normalize date to remove time components
    const normalizeDate = (date: Date): Date => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    // Helper function to extract date from entry
    const getEntryDate = (entry: any) => {
      // Try different possible date field names
      const possibleDates = [
        entry.entry_date,
        entry.date,
        entry.created_at,
        entry.dateRecorded,
        entry.date_recorded,
      ].filter(Boolean);

      for (const dateStr of possibleDates) {
        if (dateStr && typeof dateStr === "string") {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            return normalizeDate(parsedDate);
          }
        }
      }

      return normalizeDate(new Date()); // Fallback to current date, normalized
    };

    const sortedData = [...fermentationData].sort((a, b) => {
      // Sorting entries by date
      const dateA = getEntryDate(a);
      const dateB = getEntryDate(b);
      return dateA.getTime() - dateB.getTime();
    });

    const firstDate = getEntryDate(sortedData[0]);

    return sortedData.map((entry, index) => {
      const entryDate = getEntryDate(entry);
      // Since dates are normalized to midnight, this calculation will work correctly
      // for consecutive calendar days, ensuring Day 1, Day 2, etc.
      const dayNumber =
        Math.floor(
          (entryDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

      const processedEntry = {
        x: dayNumber,
        gravity: entry.gravity || undefined,
        temperature: entry.temperature || undefined,
        ph: entry.ph || undefined,
        date: entryDate.toLocaleDateString(),
        rawDate: entryDate, // Keep the actual Date object for chart formatting
      };

      // Processed entry successfully

      return processedEntry;
    });
  }, [fermentationData]);

  // Data point click/focus handler with themed modal
  const handleDataPointInteraction = React.useCallback(
    (item: any, index?: number) => {
      // For focus events, we need to find the matching data point
      let dataPointIndex = index;
      if (dataPointIndex === undefined && item?.label) {
        // Find matching data point by label for focus events
        const dayMatch = item.label.match(/Day (\d+)/);
        if (dayMatch) {
          const dayNumber = parseInt(dayMatch[1]);
          dataPointIndex = processedData.findIndex(p => p.x === dayNumber);
        }
      }

      if (dataPointIndex === undefined || !processedData[dataPointIndex]) {
        return;
      }

      const dataPoint = processedData[dataPointIndex];

      // Prepare modal data
      const modalInfo = {
        title: `Day ${dataPoint.x} Details`,
        date: dataPoint.date,
        gravity:
          dataPoint.gravity !== undefined
            ? formatGravity(dataPoint.gravity)
            : undefined,
        temperature:
          dataPoint.temperature !== undefined
            ? formatSessionTemperature(dataPoint.temperature)
            : undefined,
        ph: dataPoint.ph !== undefined ? dataPoint.ph.toFixed(1) : undefined,
      };

      setModalData(modalInfo);
      setModalVisible(true);
    },
    [processedData, formatSessionTemperature]
  );

  // Screen dimensions handled by ScreenDimensionsContext for reliable foldable device support

  // Calculate optimal chart width based on current screen dimensions
  const chartWidth = React.useMemo(() => {
    // Context guarantees valid dimensions - no safety check needed
    const { width } = screenDimensions;

    // Account for all padding layers:
    // - container: 16px * 2 = 32px
    // - chartContainer: 12px + 20px (right) = 32px
    // - chartSection: 8px * 2 = 16px
    const totalPadding = 32 + 32 + 16; // 80px total

    // Use context's computed isSmallScreen property
    const { isSmallScreen } = screenDimensions;

    // Scale secondary axis padding more aggressively for small screens
    const secondaryAxisPadding = isSmallScreen
      ? Math.max(30, width * 0.12) // 12% for small screens, min 30px
      : Math.max(
          50, // Standard minimum for larger screens
          Math.min(
            width * 0.18, // 18% of screen width
            90 // Maximum padding
          )
        );

    // Reduce max width for small screens
    const maxChartWidth = isSmallScreen ? 300 : 500;

    const calculatedWidth = width - totalPadding - secondaryAxisPadding;

    // Ensure minimum viable width but be more aggressive on small screens
    const minChartWidth = isSmallScreen ? 150 : 200;

    return Math.max(minChartWidth, Math.min(calculatedWidth, maxChartWidth));
  }, [screenDimensions]);

  // Generate chart keys for force re-rendering when data changes
  const chartKeys = React.useMemo(() => {
    // Include width calculation details for more granular cache busting
    const calculatedWidth = Math.floor(chartWidth); // Include actual calculated width
    const timestamp = Date.now(); // Add timestamp for guaranteed uniqueness on dimension changes

    const baseKey = `${chartRefreshKey}-${screenDimensions.width}x${screenDimensions.height}-w${calculatedWidth}-${screenDimensions.isSmallScreen ? "small" : "large"}-${timestamp}`;

    return {
      combined: `combined-${baseKey}`,
      gravity: `gravity-${baseKey}`,
      temperature: `temperature-${baseKey}`,
    };
  }, [chartRefreshKey, screenDimensions, chartWidth]);

  // Convert to chart format without positioning first - positioning will be calculated later
  const baseChartData = React.useMemo(() => {
    if (processedData.length === 0) return { gravity: [], temperature: [] };

    // Create base data arrays without positioning
    const alignedData = processedData.map((point, index) => {
      const baseDataPoint = {
        label: `${point.rawDate.toLocaleDateString(undefined, {
          month: "numeric",
          day: "numeric",
        })}\nDay ${point.x}`, // Show date with day number underneath
        labelTextStyle: { color: theme.colors.textSecondary, fontSize: 9 },
      };

      return {
        gravity:
          point.gravity !== undefined
            ? {
                ...baseDataPoint,
                value: point.gravity,
                dataPointText: formatGravity(point.gravity), // Show actual gravity value
                textShiftX: -8, // No horizontal offset - directly above/below data point
                onPress: () =>
                  handleDataPointInteraction({ value: point.gravity }, index), // Add individual click handler
              }
            : {
                ...baseDataPoint,
                value: 0, // Use 0 for missing gravity data (will be hidden)
                hideDataPoint: true,
              },
        temperature:
          point.temperature !== undefined
            ? {
                ...baseDataPoint,
                value: point.temperature,
                dataPointText: formatSessionTemperature(point.temperature, 0), // Show actual temperature value
                textShiftX: -5, // No horizontal offset - directly above/below data point
                onPress: () =>
                  handleDataPointInteraction(
                    { value: point.temperature },
                    index
                  ), // Add individual click handler
              }
            : {
                ...baseDataPoint,
                value: 0, // Use 0 for missing temperature data (will be hidden)
                hideDataPoint: true,
              },
      };
    });

    return {
      gravity: alignedData.map(d => d.gravity),
      temperature: alignedData.map(d => d.temperature),
    };
  }, [
    processedData,
    theme.colors.textSecondary,
    formatSessionTemperature,
    handleDataPointInteraction,
  ]);

  // Get base chart data without positioning first (for axis calculations)
  const baseGravityData = baseChartData.gravity;
  const baseTemperatureData = baseChartData.temperature;
  // Calculate Y-axis scaling for charts
  const gravityAxisConfig = React.useMemo(() => {
    if (baseGravityData.length === 0) {
      return { minValue: 1.0, maxValue: 1.1 };
    }

    const gravityValues = baseGravityData.map(d => d.value);
    const maxGravity = actualOG || Math.max(...gravityValues);
    const allValues = [...gravityValues, maxGravity];

    return chartUtils.createAxisConfig(allValues, 0.01);
  }, [baseGravityData, actualOG]);

  // Create session-specific temperature axis configuration
  const getSessionTemperatureAxisConfig = React.useCallback(
    (
      temperatures: number[],
      bufferPercent: number = 10
    ): { minValue: number; maxValue: number } => {
      if (temperatures.length === 0) {
        // Default ranges based on session temperature unit
        if (temperatureUnit === "C") {
          return { minValue: 15, maxValue: 27 };
        } else {
          return { minValue: 60, maxValue: 80 };
        }
      }

      const min = Math.min(...temperatures);
      const max = Math.max(...temperatures);
      const range = max - min;

      // Calculate intelligent buffer based on data spread
      let buffer;
      if (range < (temperatureUnit === "C" ? 1 : 2)) {
        // Very tight range, use minimum buffer
        buffer = temperatureUnit === "C" ? 2 : 4;
      } else {
        // Use percentage-based buffer with minimum
        buffer = Math.max(
          range * (bufferPercent / 100),
          temperatureUnit === "C" ? 1 : 2
        );
      }

      // Ensure reasonable axis bounds
      const minValue = Math.max(
        Math.floor(min - buffer),
        temperatureUnit === "C" ? -5 : 20 // Reasonable lower bounds
      );
      const maxValue = Math.min(
        Math.ceil(max + buffer),
        temperatureUnit === "C" ? 50 : 120 // Reasonable upper bounds
      );

      return { minValue, maxValue };
    },
    [temperatureUnit]
  );

  const temperatureAxisConfig = React.useMemo(() => {
    if (baseTemperatureData.length === 0) {
      return getSessionTemperatureAxisConfig([]);
    }

    // Filter out hidden zero-value placeholder points
    const filteredTemperatures = baseTemperatureData
      .filter(
        item =>
          !(
            item.value === 0 &&
            "hideDataPoint" in item &&
            item.hideDataPoint === true
          )
      )
      .map(d => d.value);

    return getSessionTemperatureAxisConfig(filteredTemperatures, 8);
  }, [baseTemperatureData, getSessionTemperatureAxisConfig]);

  // Add positioning to chart data using actual axis configurations
  const combinedChartData = React.useMemo(() => {
    if (baseChartData.gravity.length === 0) return baseChartData;

    // Use chart utilities for visual height calculations

    // Apply positioning to each data point using actual axis configs
    const positionedGravityData = baseChartData.gravity.map(
      (gravityPoint, index) => {
        const temperaturePoint = baseChartData.temperature[index];

        // Skip positioning if this is a hidden placeholder point
        if (
          "hideDataPoint" in gravityPoint ||
          "hideDataPoint" in temperaturePoint
        ) {
          return gravityPoint;
        }

        const hasGravity =
          gravityPoint.value > 0 && !("hideDataPoint" in gravityPoint);
        const hasTemperature =
          temperaturePoint.value > 0 && !("hideDataPoint" in temperaturePoint);

        let gravityLabelShift = 0;

        if (hasGravity && hasTemperature) {
          // Calculate actual visual heights using real axis configurations
          const gravityVisualHeight = chartUtils.calculateVisualHeight(
            gravityPoint.value,
            gravityAxisConfig
          );
          const tempVisualHeight = chartUtils.calculateVisualHeight(
            temperaturePoint.value,
            temperatureAxisConfig
          );

          // Position based on actual visual height comparison
          // The HIGHER point gets label ABOVE (-15), the LOWER point gets label BELOW (+25)
          if (gravityVisualHeight > tempVisualHeight) {
            gravityLabelShift = -15; // Gravity is higher visually - label above the data point
          } else {
            gravityLabelShift = 25; // Gravity is lower visually - label below the data point
          }
        } else if (hasGravity) {
          // Only gravity - position based on chart position
          const gravityVisualHeight = chartUtils.calculateVisualHeight(
            gravityPoint.value,
            gravityAxisConfig
          );
          gravityLabelShift = gravityVisualHeight > 0.5 ? -25 : 25;
        }

        return {
          ...gravityPoint,
          textShiftY: gravityLabelShift,
        };
      }
    );

    const positionedTemperatureData = baseChartData.temperature.map(
      (temperaturePoint, index) => {
        const gravityPoint = baseChartData.gravity[index];

        // Skip positioning if this is a hidden placeholder point
        if (
          "hideDataPoint" in temperaturePoint ||
          "hideDataPoint" in gravityPoint
        ) {
          return temperaturePoint;
        }

        const hasGravity =
          gravityPoint.value > 0 && !("hideDataPoint" in gravityPoint);
        const hasTemperature =
          temperaturePoint.value > 0 && !("hideDataPoint" in temperaturePoint);

        let temperatureLabelShift = 0;

        if (hasGravity && hasTemperature) {
          // Calculate actual visual heights using real axis configurations
          const gravityVisualHeight = chartUtils.calculateVisualHeight(
            gravityPoint.value,
            gravityAxisConfig
          );
          const tempVisualHeight = chartUtils.calculateVisualHeight(
            temperaturePoint.value,
            temperatureAxisConfig
          );

          // Position based on actual visual height comparison
          // The HIGHER point gets label ABOVE (-15), the LOWER point gets label BELOW (+15)
          if (tempVisualHeight > gravityVisualHeight) {
            temperatureLabelShift = -15; // Temperature is higher visually - label above the data point
          } else {
            temperatureLabelShift = 25; // Temperature is lower visually - label below the data point
          }
        } else if (hasTemperature) {
          // Only temperature - position based on chart position
          const tempVisualHeight = chartUtils.calculateVisualHeight(
            temperaturePoint.value,
            temperatureAxisConfig
          );
          temperatureLabelShift = tempVisualHeight > 0.5 ? -25 : 25;
        }

        return {
          ...temperaturePoint,
          textShiftY: temperatureLabelShift,
        };
      }
    );

    return {
      gravity: positionedGravityData,
      temperature: positionedTemperatureData,
    };
  }, [baseChartData, gravityAxisConfig, temperatureAxisConfig]);

  // Final chart data with proper positioning
  const gravityChartData = combinedChartData.gravity;
  const temperatureChartData = combinedChartData.temperature;

  const gravityReferenceLines = React.useMemo(() => {
    // Use estimated_fg from recipe data first, then fall back to target_fg from session
    const finalExpectedFG = recipeData?.estimated_fg || expectedFG;

    if (!finalExpectedFG) {
      return [];
    }

    const referenceConfig = {
      value: finalExpectedFG,
      color: "#FF7300",
      thickness: 2,
      type: "dashed",
      dashWidth: 4,
      dashGap: 4,
      labelText: `Expected FG: ${formatGravity(finalExpectedFG)}`,
      labelTextStyle: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: "600",
      },
    };

    return [referenceConfig];
  }, [expectedFG, recipeData?.estimated_fg, theme.colors.textSecondary]);

  // Chart configuration objects
  const baseChartConfig = {
    width: chartWidth,
    textColor: theme.colors.textSecondary,
    yAxisTextStyle: { color: theme.colors.textSecondary },
    hideAxesAndRules: false,
    xAxisColor: theme.colors.border,
    yAxisColor: theme.colors.border,
    rulesColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    curved: true,
    animateOnDataChange: false, // Disable animations to prevent state corruption
    animationDuration: 0, // No animation duration
    isAnimated: false, // Explicitly disable animations
    xAxisLabelTextStyle: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      textAlign: "center" as const,
    },
    showXAxisIndices: true,
    xAxisIndicesHeight: 4,
    xAxisIndicesWidth: 1,
    xAxisIndicesColor: theme.colors.border,
    xAxisLabelsHeight: 45, // Extra height for day numbers
    xAxisLabelsVerticalShift: 15, // Push labels down to create space
    xAxisTextNumberOfLines: 2, // Allow multi-line labels
  };

  const gravityChartConfig = {
    ...baseChartConfig,
    height: 200,
    color: theme.colors.gravityLine,
    thickness: 3,
    spacing: chartWidth / Math.max(gravityChartData.length, 1),
    dataPointsColor: theme.colors.gravityLine,
    dataPointsRadius: 4, // Smaller to restrict touch area to data points only
    maxValue: gravityAxisConfig.maxValue - gravityAxisConfig.minValue, // Chart range, not absolute max
    yAxisOffset: gravityAxisConfig.minValue,
    noOfSections: 6,
    yAxisLabelSuffix: "",
    formatYLabel: (label: string) => formatGravity(parseFloat(label)),
    referenceLine1Config:
      gravityReferenceLines.length > 0 ? gravityReferenceLines[0] : undefined,
    pressEnabled: true,
    onPress: handleDataPointInteraction,
    focusEnabled: true, // Alternative focus approach
    onFocus: handleDataPointInteraction,
    focusProximity: 8, // Restrict click area to 8 pixels around data points
    showTextOnFocus: false, // Disable built-in focus text
  };

  const temperatureChartConfig = {
    ...baseChartConfig,
    height: 200,
    color: theme.colors.temperatureLine,
    thickness: 2,
    spacing: chartWidth / Math.max(temperatureChartData.length, 1),
    dataPointsColor: theme.colors.temperatureLine,
    dataPointsRadius: 4, // Smaller to restrict touch area to data points only
    maxValue: temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue,
    yAxisOffset: temperatureAxisConfig.minValue,
    yAxisLabelSuffix: getSessionTemperatureSymbol(),
    formatYLabel: (label: string) => Math.round(parseFloat(label)).toString(),
    noOfSections: 4, // Different from gravity charts to avoid overlap
    stepValue: Math.ceil(
      (temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue) / 4
    ),
    pressEnabled: true,
    onPress: handleDataPointInteraction,
    focusEnabled: true,
    onFocus: handleDataPointInteraction,
    focusProximity: 8, // Restrict click area to 8 pixels around data points
    showTextOnFocus: false,
  };

  const combinedChartConfig = {
    ...baseChartConfig,
    height: 250,
    color: theme.colors.gravityLine,
    thickness: 3,
    spacing: chartWidth / Math.max(gravityChartData.length, 1), // aligned arrays
    dataPointsColor: theme.colors.gravityLine,
    dataPointsRadius: 4, // Smaller to restrict touch area to data points only
    maxValue: gravityAxisConfig.maxValue - gravityAxisConfig.minValue, // Chart range, not absolute max
    yAxisOffset: gravityAxisConfig.minValue,
    noOfSections: 6,
    yAxisLabelSuffix: "",
    formatYLabel: (label: string) => formatGravity(parseFloat(label)),
    referenceLine1Config:
      gravityReferenceLines.length > 0 ? gravityReferenceLines[0] : undefined,
    showSecondaryYAxis: true,
    pressEnabled: true,
    onPress: handleDataPointInteraction,
    focusEnabled: true,
    onFocus: handleDataPointInteraction,
    focusProximity: 8, // Restrict click area to 8 pixels around data points
    showTextOnFocus: false,
    disableScroll: false, // Allow scrolling but maintain click functionality
    secondaryYAxis: {
      yAxisOffset: temperatureAxisConfig.minValue,
      maxValue: temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue,
      noOfSections: 4, // Different from primary axis (6) to prevent duplicate grid lines
      stepValue: Math.ceil(
        (temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue) / 4
      ),
      yAxisLabelSuffix: getSessionTemperatureSymbol(),
      formatYLabel: (label: string) => Math.round(parseFloat(label)).toString(),
      yAxisTextStyle: { color: theme.colors.textSecondary, fontSize: 10 },
      yAxisColor: theme.colors.border,
      showYAxisIndices: false, // Disable secondary axis grid lines to prevent duplicates
      hideRules: true, // Completely hide horizontal rules for secondary axis
      yAxisLabelWidth: 45, // Increased width for temperature labels
      hideYAxisText: false, // Explicitly show Y-axis text
      yAxisLabelContainerStyle: { width: 100 }, // Container width for labels
    },
    secondaryLineConfig: {
      color: theme.colors.temperatureLine,
      thickness: 3,
      dataPointsColor: theme.colors.temperatureLine,
      dataPointsRadius: 4, // Smaller to restrict touch area to data points only
      pressEnabled: true, // Enable press for secondary line
      onPress: handleDataPointInteraction, // Same handler for secondary data
      focusEnabled: true,
      onFocus: handleDataPointInteraction,
      focusProximity: 8, // Restrict click area to 8 pixels around data points
    },
  };

  if (processedData.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Fermentation Progress
        </Text>
        <View style={styles.emptyState}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            No fermentation data available
          </Text>
          <Text
            style={[styles.emptySubtext, { color: theme.colors.textMuted }]}
          >
            Start logging fermentation readings to see the progress chart
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Fermentation Progress
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.refreshButton,
              { backgroundColor: theme.colors.border },
            ]}
            onPress={() => {
              refreshDimensions();
              setChartRefreshKey(prev => prev + 1);
            }}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
              ↻
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: theme.colors.border },
            ]}
            onPress={handleViewToggle}
          >
            <Text style={[styles.toggleText, { color: theme.colors.text }]}>
              {combinedView ? "Separate" : "Combined"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart Stats */}
      <View style={styles.statsRow}>
        {gravityChartData.length > 0 ? (
          <View style={styles.stat}>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Latest Gravity
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {(() => {
                const last = [...gravityChartData]
                  .reverse()
                  .find(
                    d =>
                      !(
                        d.value === 0 &&
                        "hideDataPoint" in d &&
                        d.hideDataPoint
                      )
                  );
                return last ? formatGravity(last.value) : "—";
              })()}
            </Text>
          </View>
        ) : null}
        {temperatureChartData.length > 0 ? (
          <View style={styles.stat}>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Latest Temp
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {(() => {
                const last = [...temperatureChartData]
                  .reverse()
                  .find(
                    d =>
                      !(
                        d.value === 0 &&
                        "hideDataPoint" in d &&
                        d.hideDataPoint
                      )
                  );
                return last ? formatSessionTemperature(last.value) : "—";
              })()}
            </Text>
          </View>
        ) : null}
        {expectedFG ? (
          <View style={styles.stat}>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Expected FG
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {formatGravity(expectedFG)}
            </Text>
          </View>
        ) : null}
        <View style={styles.stat}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Duration
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {(() => {
              const days = Math.max(...processedData.map(d => d.x));
              return `${days} ${days === 1 ? "day" : "days"}`;
            })()}
          </Text>
        </View>
      </View>

      {/* Main Chart */}
      <View
        style={[
          styles.chartContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {combinedView ? (
          // Combined dual-axis chart
          gravityChartData.length > 0 && temperatureChartData.length > 0 ? (
            <ChartSection title="Combined View" theme={theme} styles={styles}>
              <ChartWrapper refreshKey={chartKeys.combined}>
                <LineChart
                  {...combinedChartConfig}
                  data={gravityChartData}
                  secondaryData={temperatureChartData}
                />
              </ChartWrapper>
            </ChartSection>
          ) : (
            // Show individual charts if only one type of data exists
            <>
              {gravityChartData.length > 0 ? (
                <ChartSection
                  title="Specific Gravity"
                  theme={theme}
                  styles={styles}
                >
                  <ChartWrapper refreshKey={chartKeys.gravity}>
                    <LineChart
                      {...gravityChartConfig}
                      data={gravityChartData}
                    />
                  </ChartWrapper>
                </ChartSection>
              ) : null}
              {temperatureChartData.length > 0 ? (
                <ChartSection title="Temperature" theme={theme} styles={styles}>
                  <ChartWrapper refreshKey={chartKeys.temperature}>
                    <LineChart
                      {...temperatureChartConfig}
                      data={temperatureChartData}
                    />
                  </ChartWrapper>
                </ChartSection>
              ) : null}
            </>
          )
        ) : (
          // Separate charts view
          <>
            {gravityChartData.length > 0 ? (
              <ChartSection
                title="Specific Gravity"
                theme={theme}
                styles={styles}
              >
                <ChartWrapper refreshKey={chartKeys.gravity}>
                  <LineChart {...gravityChartConfig} data={gravityChartData} />
                </ChartWrapper>
              </ChartSection>
            ) : null}

            {temperatureChartData.length > 0 ? (
              <ChartSection title="Temperature" theme={theme} styles={styles}>
                <ChartWrapper refreshKey={chartKeys.temperature}>
                  <LineChart
                    {...temperatureChartConfig}
                    data={temperatureChartData}
                  />
                </ChartWrapper>
              </ChartSection>
            ) : null}
          </>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {gravityChartData.length > 0 ? (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: theme.colors.gravityLine },
              ]}
            />
            <Text
              style={[styles.legendText, { color: theme.colors.textSecondary }]}
            >
              Specific Gravity
            </Text>
          </View>
        ) : null}
        {temperatureChartData.length > 0 ? (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: theme.colors.temperatureLine },
              ]}
            />
            <Text
              style={[styles.legendText, { color: theme.colors.textSecondary }]}
            >
              Temperature
            </Text>
          </View>
        ) : null}
      </View>

      {/* Themed Data Point Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            {modalData && (
              <>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {modalData.title}
                </Text>

                <View style={styles.modalBody}>
                  <ModalDataRow
                    label="Date"
                    value={modalData.date}
                    theme={theme}
                    styles={styles}
                  />

                  {modalData.gravity && (
                    <ModalDataRow
                      label="Gravity"
                      value={modalData.gravity}
                      valueColor={theme.colors.gravityLine}
                      theme={theme}
                      styles={styles}
                    />
                  )}

                  {modalData.temperature && (
                    <ModalDataRow
                      label="Temperature"
                      value={modalData.temperature}
                      valueColor={theme.colors.temperatureLine}
                      theme={theme}
                      styles={styles}
                    />
                  )}

                  {modalData.ph && (
                    <ModalDataRow
                      label="pH"
                      value={modalData.ph}
                      theme={theme}
                      styles={styles}
                    />
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalCloseButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    style={[
                      styles.modalCloseText,
                      { color: theme.colors.primaryText },
                    ]}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    minWidth: 32,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    marginBottom: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  stat: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chartContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    paddingRight: 20, // Extra padding on right for secondary Y-axis
    overflow: "visible", // Allow secondary axis to be visible
    alignItems: "center", // Center chart horizontally
  },
  chartSection: {
    marginBottom: 20,
    paddingHorizontal: 8, // Add horizontal padding to prevent title truncation
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12, // Increase bottom margin
    textAlign: "center",
    paddingHorizontal: 16, // Add padding to prevent text truncation
    lineHeight: 18, // Ensure proper line height
  },
  chart: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4, // Add small top margin for better spacing
    overflow: "visible", // Allow secondary axis to be visible
    paddingRight: 15, // Extra padding for secondary axis labels
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal styles for data point details
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: "90%",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalCloseButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
