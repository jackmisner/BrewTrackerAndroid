/**
 * FermentationChart Component
 *
 * Interactive chart component that visualizes fermentation progress over time.
 * Displays gravity readings and temperature data in line charts with
 * responsive design and modal enlargement capabilities.
 *
 * Features:
 * - Dual charts: Specific gravity and temperature over time
 * - Responsive chart sizing based on screen dimensions
 * - Modal view for enlarged chart display
 * - Unit-aware temperature display (°F/°C)
 * - Touch interactions for data point details
 * - Real-time data updates with forced chart remounting
 * - Target gravity reference lines
 * - Themed styling with color adaptation
 *
 * @example
 * Basic usage:
 * ```typescript
 * <FermentationChart
 *   entries={fermentationEntries}
 *   recipe={recipe}
 *   refreshKey={Date.now()}
 * />
 * ```
 */

import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { FermentationEntry, Recipe } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { useScreenDimensions } from "@contexts/ScreenDimensionsContext";
import { formatGravity } from "@utils/formatUtils";
import { fermentationChartStyles } from "@styles/components/charts/fermentationChartStyles";

/**
 * Chart wrapper component that forces complete remount for data updates
 * Addresses react-native-gifted-charts refresh issues
 */
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

/**
 * Reusable chart section component with title and content area
 * Provides consistent layout for individual chart displays
 */
const ChartSection: React.FC<{
  title: string;
  children: React.ReactNode;
  theme: any;
}> = ({ title, children, theme }) => {
  return (
    <View style={fermentationChartStyles.chartSection}>
      <Text
        style={[
          fermentationChartStyles.chartTitle,
          { color: theme.colors.text },
        ]}
      >
        {title}
      </Text>
      <View style={fermentationChartStyles.chart}>{children}</View>
    </View>
  );
};

// Reusable modal data row component to eliminate duplication
const ModalDataRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  theme: any;
}> = ({ label, value, valueColor, theme }) => {
  return (
    <View style={fermentationChartStyles.modalRow}>
      <Text
        style={[
          fermentationChartStyles.modalLabel,
          { color: theme.colors.textSecondary },
        ]}
      >
        {label}:
      </Text>
      <Text
        style={[
          fermentationChartStyles.modalValue,
          { color: valueColor || theme.colors.text },
        ]}
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
    if (!Number.isFinite(range) || range <= 0) {
      return 0.5; // center on flat/invalid ranges
    }
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
    if (values.length === 0) {
      return { minValue: 0, maxValue: 1 };
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Smart bounds for gravity values - anchor at 1.000 for data separation, but allow lower bounds for label space
    // This ensures gravity readings appear higher than temperature readings even with single data points
    let adjustedMinValue = 1.0;

    // If we have very low gravity readings, provide extra space below for label rendering
    if (minValue < 1.01) {
      adjustedMinValue = 0.995; // Provide space below for labels when readings are low
    }

    // Ensure minimum range for visualization
    const finalMaxValue = maxValue + padding;
    if (finalMaxValue - adjustedMinValue < 0.01) {
      return {
        minValue: adjustedMinValue,
        maxValue: adjustedMinValue + 0.01,
      };
    }
    return {
      minValue: adjustedMinValue,
      maxValue: finalMaxValue,
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
    const stepValue = (axisConfig.maxValue - axisConfig.minValue) / 6;

    const baseConfig = {
      width,
      height: 200,
      yAxisOffset: axisConfig.minValue,
      maxValue: axisConfig.maxValue - axisConfig.minValue,
      stepValue: stepValue,
      noOfSections: 6,
      spacing: 50,
      backgroundColor: "transparent",
      textColor: theme.colors.textSecondary,
      yAxisTextStyle: { color: theme.colors.textSecondary },
      hideAxesAndRules: false,
      xAxisColor: theme.colors.border,
      yAxisColor: theme.colors.border,
      rulesColor: theme.colors.border,
      curved: true,
      animateOnDataChange: false,
      animationDuration: 0,
      isAnimated: false,
      xAxisLabelTextStyle: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        textAlign: "center" as const,
      },
      showXAxisIndices: true,
      xAxisIndicesHeight: 4,
      xAxisIndicesWidth: 1,
      xAxisIndicesColor: theme.colors.border,
      xAxisLabelsHeight: 45,
      xAxisLabelsVerticalShift: 15,
      xAxisTextNumberOfLines: 2,
      showVerticalLines: false,
      verticalLinesColor: theme.colors.border,
      verticalLinesThickness: 0.5,
      hideRules: false,
      rulesThickness: 0.5,
      hideYAxisText: false,
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

      // Safety check for undefined/null/NaN values
      if (value === null || value === undefined || isNaN(value)) {
        return `0${symbol}`;
      }

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
    const getEntryDate = (entry: any): Date | null => {
      // Try different possible date field names
      const possibleDates = [
        entry.entry_date,
        entry.date,
        entry.created_at,
        entry.dateRecorded,
        entry.date_recorded,
      ].filter(Boolean);

      for (const candidate of possibleDates) {
        if (typeof candidate === "string" || typeof candidate === "number") {
          const parsed =
            typeof candidate === "number"
              ? new Date(
                  // accept seconds or milliseconds epoch
                  candidate > 1e12 ? candidate : candidate * 1000
                )
              : new Date(candidate);
          if (!isNaN(parsed.getTime())) {
            return normalizeDate(parsed);
          }
        }
      }
      return null; // explicit invalid
    };

    const sortedData = [...fermentationData].sort((a, b) => {
      // Sorting entries by date
      const dateA = getEntryDate(a);
      const dateB = getEntryDate(b);
      if (dateA === null && dateB === null) {
        return 0;
      }
      if (dateA === null) {
        return 1;
      }
      if (dateB === null) {
        return -1;
      }
      return dateA.getTime() - dateB.getTime();
    });

    const firstDate = getEntryDate(sortedData[0]);

    return sortedData
      .map((entry, _index) => {
        const entryDate = getEntryDate(entry);
        // Since dates are normalized to midnight, this calculation will work correctly
        // for consecutive calendar days, ensuring Day 1, Day 2, etc.
        if (entryDate !== null && firstDate !== null) {
          const dayNumber =
            Math.floor(
              (entryDate.getTime() - firstDate.getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1;

          const processedEntry: ProcessedDataPoint = {
            x: dayNumber,
            ...(typeof entry.gravity === "number" &&
              Number.isFinite(entry.gravity) && { gravity: entry.gravity }),
            ...(typeof entry.temperature === "number" &&
              Number.isFinite(entry.temperature) && {
                temperature: entry.temperature,
              }),
            ...(typeof entry.ph === "number" &&
              Number.isFinite(entry.ph) && { ph: entry.ph }),
            date: entryDate.toLocaleDateString(),
            rawDate: entryDate, // Keep the actual Date object for chart formatting
          };

          // Processed entry successfully
          return processedEntry;
        }
        return undefined;
      })
      .filter((entry): entry is ProcessedDataPoint => entry !== undefined);
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
    if (processedData.length === 0) {
      return { gravity: [], temperature: [] };
    }

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
                // Omit value property entirely for missing temperature data - chart library will skip these points
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

    const gravityValues = baseGravityData
      .filter(
        d =>
          !(d.value === 0 && "hideDataPoint" in d && d.hideDataPoint === true)
      )
      .map(d => d.value);
    if (
      gravityValues.length === 0 &&
      (actualOG == null || !Number.isFinite(actualOG))
    ) {
      return { minValue: 1.0, maxValue: 1.1 };
    }
    const maxGravity =
      actualOG != null && Number.isFinite(actualOG)
        ? (actualOG as number)
        : Math.max(...gravityValues);
    const allValues = [...gravityValues, maxGravity];

    return chartUtils.createAxisConfig(allValues, 0.01);
  }, [baseGravityData, actualOG]);

  // Create session-specific temperature axis configuration
  const getSessionTemperatureAxisConfig = React.useCallback(
    (
      temperatures: number[],
      bufferPercent: number = 10
    ): { minValue: number; maxValue: number } => {
      const effectiveUnit =
        temperatureUnit ?? (units.unitSystem === "metric" ? "C" : "F");
      if (temperatures.length === 0) {
        // Default ranges based on session temperature unit
        if (effectiveUnit === "C") {
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
      if (range < (effectiveUnit === "C" ? 1 : 2)) {
        // Very tight range, use minimum buffer
        buffer = effectiveUnit === "C" ? 2 : 4;
      } else {
        // Use percentage-based buffer with minimum
        buffer = Math.max(
          range * (bufferPercent / 100),
          effectiveUnit === "C" ? 1 : 2
        );
      }

      // Ensure reasonable axis bounds
      const minValue = Math.max(
        Math.floor(min - buffer),
        effectiveUnit === "C" ? -5 : 20 // Reasonable lower bounds
      );
      const maxValue = Math.min(
        Math.ceil(max + buffer),
        effectiveUnit === "C" ? 50 : 120 // Reasonable upper bounds
      );

      return { minValue, maxValue };
    },
    [temperatureUnit, units.unitSystem]
  );

  const temperatureAxisConfig = React.useMemo(() => {
    if (baseTemperatureData.length === 0) {
      return getSessionTemperatureAxisConfig([]);
    }

    // Filter out hidden placeholder points (those without value property or with null/0 values)
    const filteredTemperatures = baseTemperatureData
      .filter(
        item =>
          "value" in item &&
          item.value !== undefined &&
          item.value !== null &&
          item.value !== 0 &&
          !("hideDataPoint" in item && item.hideDataPoint === true)
      )
      .map(d => (d as any).value);

    return getSessionTemperatureAxisConfig(filteredTemperatures, 8);
  }, [baseTemperatureData, getSessionTemperatureAxisConfig]);

  // Add positioning to chart data using actual axis configurations
  const combinedChartData = React.useMemo(() => {
    if (baseChartData.gravity.length === 0) {
      return baseChartData;
    }

    // Use chart utilities for visual height calculations

    // Apply positioning to each data point using actual axis configs
    const positionedGravityData = baseChartData.gravity.map(
      (gravityPoint, index) => {
        const temperaturePoint = baseChartData.temperature[index];

        // Skip only if the current gravity point is hidden
        if ("hideDataPoint" in gravityPoint) {
          return gravityPoint;
        }

        const hasGravity =
          gravityPoint.value > 0 && !("hideDataPoint" in gravityPoint);
        const hasTemperature =
          temperaturePoint &&
          "value" in temperaturePoint &&
          temperaturePoint.value !== undefined &&
          temperaturePoint.value !== null &&
          temperaturePoint.value > 0 &&
          !("hideDataPoint" in temperaturePoint);

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

        // Skip only if the current temperature point is hidden
        if ("hideDataPoint" in temperaturePoint) {
          return temperaturePoint;
        }

        const hasGravity =
          gravityPoint &&
          gravityPoint.value > 0 &&
          !("hideDataPoint" in gravityPoint);
        const hasTemperature =
          "value" in temperaturePoint &&
          temperaturePoint.value !== undefined &&
          temperaturePoint.value !== null &&
          temperaturePoint.value > 0 &&
          !("hideDataPoint" in temperaturePoint);

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

  // Final chart data with proper positioning - keep arrays aligned for chart rendering
  const gravityChartData = combinedChartData.gravity;

  // Combined chart data: keep full array with startIndex for perfect alignment
  const combinedTemperatureData = React.useMemo(() => {
    if (
      !combinedChartData.temperature ||
      !Array.isArray(combinedChartData.temperature)
    ) {
      return { data: [], startIndex: 0 };
    }

    let tempData = [...combinedChartData.temperature];

    // Remove trailing entries that have no temperature value (this works perfectly)
    while (tempData.length > 0) {
      const lastEntry = tempData[tempData.length - 1];
      if (
        !("value" in lastEntry) ||
        (!lastEntry.value &&
          lastEntry.value !== 0 &&
          "hideDataPoint" in lastEntry &&
          lastEntry.hideDataPoint === true)
      ) {
        tempData.pop();
      } else {
        break;
      }
    }

    // Find first valid temperature entry index but DON'T remove leading entries
    let startIndex = 0;
    for (let i = 0; i < tempData.length; i++) {
      const entry = tempData[i];
      if (
        !("value" in entry) ||
        (!entry.value &&
          entry.value !== 0 &&
          "hideDataPoint" in entry &&
          entry.hideDataPoint === true)
      ) {
        startIndex++;
      } else {
        break; // Found first valid entry
      }
    }

    return { data: tempData, startIndex };
  }, [combinedChartData.temperature]);

  // Separate chart data: simple filtering of only valid temperature entries
  const separateTemperatureData = React.useMemo(() => {
    if (
      !combinedChartData.temperature ||
      !Array.isArray(combinedChartData.temperature)
    ) {
      return [];
    }

    return combinedChartData.temperature.filter(
      entry =>
        "value" in entry &&
        entry.value != null &&
        entry.value !== 0 &&
        (!("hideDataPoint" in entry) || !entry.hideDataPoint)
    );
  }, [combinedChartData.temperature]);

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

  const gravityChartConfig = {
    ...chartUtils.buildChartConfig(chartWidth, gravityAxisConfig, theme, {
      height: 200,
      noOfSections: 6,
      spacing: chartWidth / Math.max(gravityChartData.length, 1),
      focusProximity: 8,
      showTextOnFocus: false,
    }),
    color: theme.colors.gravityLine,
    thickness: 3,
    dataPointsColor: theme.colors.gravityLine,
    dataPointsRadius: 4,
    yAxisLabelSuffix: "",
    yAxisLabelTexts: (() => {
      const labels = [];
      for (let i = 0; i <= 6; i++) {
        const value =
          gravityAxisConfig.minValue +
          (i * (gravityAxisConfig.maxValue - gravityAxisConfig.minValue)) / 6;
        labels.push(formatGravity(value));
      }
      return labels;
    })(),
    referenceLine1Config:
      gravityReferenceLines.length > 0 ? gravityReferenceLines[0] : undefined,
    pressEnabled: true,
    onPress: handleDataPointInteraction,
    focusEnabled: true,
    onFocus: handleDataPointInteraction,
  };

  // Simple temperature chart config for separate charts - no startIndex complications
  const separateTemperatureChartConfig = {
    ...chartUtils.buildChartConfig(chartWidth, temperatureAxisConfig, theme, {
      height: 200,
      noOfSections: 4,
      spacing: chartWidth / Math.max(separateTemperatureData.length, 1),
      focusProximity: 8,
      showTextOnFocus: false,
      stepValue: Math.ceil(
        (temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue) / 4
      ),
    }),
    color: theme.colors.temperatureLine,
    thickness: 2,
    dataPointsColor: theme.colors.temperatureLine,
    dataPointsRadius: 4,
    yAxisLabelSuffix: getSessionTemperatureSymbol(),
    yAxisLabelTexts: (() => {
      const labels = [];
      for (let i = 0; i <= 4; i++) {
        const value =
          temperatureAxisConfig.minValue +
          (i *
            (temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue)) /
            4;
        if (typeof value === "number" && !isNaN(value)) {
          labels.push(formatSessionTemperature(value, 0));
        } else {
          labels.push("0°C"); // Fallback label
        }
      }
      return labels;
    })(),
    formatYLabel: (label: string) => Math.round(parseFloat(label)).toString(),
    pressEnabled: true,
    onPress: handleDataPointInteraction,
    focusEnabled: true,
    onFocus: handleDataPointInteraction,
  };

  const combinedChartConfig = {
    ...chartUtils.buildChartConfig(chartWidth, gravityAxisConfig, theme, {
      height: 250,
      noOfSections: 6,
      spacing: chartWidth / Math.max(gravityChartData.length, 1),
      focusProximity: 8,
      showTextOnFocus: false,
      disableScroll: false,
    }),
    color: theme.colors.gravityLine,
    thickness: 3,
    dataPointsColor: theme.colors.gravityLine,
    dataPointsRadius: 4,
    yAxisLabelSuffix: "",
    yAxisLabelTexts: (() => {
      const labels = [];
      for (let i = 0; i <= 6; i++) {
        const value =
          gravityAxisConfig.minValue +
          (i * (gravityAxisConfig.maxValue - gravityAxisConfig.minValue)) / 6;
        labels.push(formatGravity(value));
      }
      return labels;
    })(),
    referenceLine1Config:
      gravityReferenceLines.length > 0 ? gravityReferenceLines[0] : undefined,
    showSecondaryYAxis: true,
    pressEnabled: true,
    onPress: handleDataPointInteraction,
    focusEnabled: true,
    onFocus: handleDataPointInteraction,
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
      startIndex: combinedTemperatureData?.startIndex || 0, // Use combined data for perfect alignment
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
        style={[
          fermentationChartStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          style={[fermentationChartStyles.title, { color: theme.colors.text }]}
        >
          Fermentation Progress
        </Text>
        <View style={fermentationChartStyles.emptyState}>
          <Text
            style={[
              fermentationChartStyles.emptyText,
              { color: theme.colors.textSecondary },
            ]}
          >
            No fermentation data available
          </Text>
          <Text
            style={[
              fermentationChartStyles.emptySubtext,
              { color: theme.colors.textMuted },
            ]}
          >
            Start logging fermentation readings to see the progress chart
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        fermentationChartStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={fermentationChartStyles.titleContainer}>
        <Text
          style={[fermentationChartStyles.title, { color: theme.colors.text }]}
        >
          Fermentation Progress
        </Text>
        <View style={fermentationChartStyles.buttonContainer}>
          <TouchableOpacity
            style={[
              fermentationChartStyles.refreshButton,
              { backgroundColor: theme.colors.border },
            ]}
            onPress={() => {
              refreshDimensions();
              setChartRefreshKey(prev => prev + 1);
            }}
          >
            <Text
              style={[
                fermentationChartStyles.buttonText,
                { color: theme.colors.text },
              ]}
            >
              ↻
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              fermentationChartStyles.toggleButton,
              { backgroundColor: theme.colors.border },
            ]}
            onPress={handleViewToggle}
          >
            <Text
              style={[
                fermentationChartStyles.toggleText,
                { color: theme.colors.text },
              ]}
            >
              {combinedView ? "Separate" : "Combined"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart Stats */}
      <View style={fermentationChartStyles.statsRow}>
        {gravityChartData.length > 0 ? (
          <View style={fermentationChartStyles.stat}>
            <Text
              style={[
                fermentationChartStyles.statLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Latest Gravity
            </Text>
            <Text
              style={[
                fermentationChartStyles.statValue,
                { color: theme.colors.primary },
              ]}
            >
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
        {(combinedTemperatureData?.data?.length || 0) > 0 ? (
          <View style={fermentationChartStyles.stat}>
            <Text
              style={[
                fermentationChartStyles.statLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Latest Temp
            </Text>
            <Text
              style={[
                fermentationChartStyles.statValue,
                { color: theme.colors.primary },
              ]}
            >
              {(() => {
                const last = [...(combinedTemperatureData?.data || [])]
                  .reverse()
                  .find(
                    d =>
                      "value" in d &&
                      !(
                        d.value === 0 &&
                        "hideDataPoint" in d &&
                        d.hideDataPoint
                      )
                  );
                return last && "value" in last
                  ? formatSessionTemperature(last.value)
                  : "—";
              })()}
            </Text>
          </View>
        ) : null}
        {recipeData?.estimated_fg != null || expectedFG != null ? (
          <View style={fermentationChartStyles.stat}>
            <Text
              style={[
                fermentationChartStyles.statLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Expected FG
            </Text>
            <Text
              style={[
                fermentationChartStyles.statValue,
                { color: theme.colors.primary },
              ]}
            >
              {(() => {
                const finalFG = recipeData?.estimated_fg ?? expectedFG;
                return finalFG != null ? formatGravity(finalFG) : "—";
              })()}
            </Text>
          </View>
        ) : null}
        <View style={fermentationChartStyles.stat}>
          <Text
            style={[
              fermentationChartStyles.statLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Duration
          </Text>
          <Text
            style={[
              fermentationChartStyles.statValue,
              { color: theme.colors.primary },
            ]}
          >
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
          fermentationChartStyles.chartContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {combinedView ? (
          // Combined dual-axis chart
          gravityChartData.length > 0 &&
          (combinedTemperatureData?.data?.length || 0) > 0 ? (
            <ChartSection title="Combined View" theme={theme}>
              <ChartWrapper refreshKey={chartKeys.combined}>
                <LineChart
                  {...combinedChartConfig}
                  data={gravityChartData}
                  secondaryData={combinedTemperatureData?.data || []}
                />
              </ChartWrapper>
            </ChartSection>
          ) : (
            // Show individual charts if only one type of data exists
            <>
              {gravityChartData.length > 0 ? (
                <ChartSection title="Specific Gravity" theme={theme}>
                  <ChartWrapper refreshKey={chartKeys.gravity}>
                    <LineChart
                      {...gravityChartConfig}
                      data={gravityChartData}
                    />
                  </ChartWrapper>
                </ChartSection>
              ) : null}
              {separateTemperatureData.length > 0 ? (
                <ChartSection title="Temperature" theme={theme}>
                  <ChartWrapper refreshKey={chartKeys.temperature}>
                    <LineChart
                      {...separateTemperatureChartConfig}
                      data={separateTemperatureData}
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
              <ChartSection title="Specific Gravity" theme={theme}>
                <ChartWrapper refreshKey={chartKeys.gravity}>
                  <LineChart {...gravityChartConfig} data={gravityChartData} />
                </ChartWrapper>
              </ChartSection>
            ) : null}

            {separateTemperatureData.length > 0 ? (
              <ChartSection title="Temperature" theme={theme}>
                <ChartWrapper refreshKey={chartKeys.temperature}>
                  <LineChart
                    {...separateTemperatureChartConfig}
                    data={separateTemperatureData}
                  />
                </ChartWrapper>
              </ChartSection>
            ) : null}
          </>
        )}
      </View>

      {/* Legend */}
      <View style={fermentationChartStyles.legend}>
        {gravityChartData.length > 0 ? (
          <View style={fermentationChartStyles.legendItem}>
            <View
              style={[
                fermentationChartStyles.legendColor,
                { backgroundColor: theme.colors.gravityLine },
              ]}
            />
            <Text
              style={[
                fermentationChartStyles.legendText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Specific Gravity
            </Text>
          </View>
        ) : null}
        {separateTemperatureData.length > 0 ? (
          <View style={fermentationChartStyles.legendItem}>
            <View
              style={[
                fermentationChartStyles.legendColor,
                { backgroundColor: theme.colors.temperatureLine },
              ]}
            />
            <Text
              style={[
                fermentationChartStyles.legendText,
                { color: theme.colors.textSecondary },
              ]}
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
          style={fermentationChartStyles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              fermentationChartStyles.modalContent,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            {modalData && (
              <>
                <Text
                  style={[
                    fermentationChartStyles.modalTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {modalData.title}
                </Text>

                <View style={fermentationChartStyles.modalBody}>
                  <ModalDataRow
                    label="Date"
                    value={modalData.date}
                    theme={theme}
                  />

                  {modalData.gravity && (
                    <ModalDataRow
                      label="Gravity"
                      value={modalData.gravity}
                      valueColor={theme.colors.gravityLine}
                      theme={theme}
                    />
                  )}

                  {modalData.temperature && (
                    <ModalDataRow
                      label="Temperature"
                      value={modalData.temperature}
                      valueColor={theme.colors.temperatureLine}
                      theme={theme}
                    />
                  )}

                  {modalData.ph && (
                    <ModalDataRow
                      label="pH"
                      value={modalData.ph}
                      theme={theme}
                    />
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    fermentationChartStyles.modalCloseButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    style={[
                      fermentationChartStyles.modalCloseText,
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
