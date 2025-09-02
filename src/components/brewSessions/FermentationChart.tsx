import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { FermentationEntry } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";

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

interface FermentationChartProps {
  fermentationData: FermentationEntry[];
  expectedFG?: number;
  actualOG?: number;
  temperatureUnit?: "C" | "F"; // Session-specific temperature unit
  forceRefresh?: number; // External refresh trigger
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
}) => {
  const theme = useTheme();
  const units = useUnits();
  const [combinedView, setCombinedView] = React.useState(true);
  const [chartRefreshKey, setChartRefreshKey] = React.useState(0);

  // Force chart refresh when fermentation data changes or external refresh is triggered
  React.useEffect(() => {
    setChartRefreshKey(prev => prev + 1);
  }, [fermentationData, forceRefresh]);

  // Force refresh when switching between combined/separate views
  const handleViewToggle = React.useCallback(() => {
    setCombinedView(prev => !prev);
    // Add small delay to ensure state change is processed before refresh
    setChartRefreshKey(prev => prev + 1);
  }, []);

  // Get temperature symbol based on session-specific unit, fallback to user preference
  const getSessionTemperatureSymbol = (): string => {
    if (temperatureUnit) {
      return temperatureUnit === "C" ? "°C" : "°F";
    }
    return units.getTemperatureSymbol(); // Fallback to user preference
  };

  // Format temperature using session-specific unit
  const formatSessionTemperature = (
    value: number,
    precision: number = 1
  ): string => {
    const symbol = getSessionTemperatureSymbol();

    return `${value.toFixed(precision)}${symbol}`;
  };

  // Transform fermentation data to chart format
  const processedData: ProcessedDataPoint[] = React.useMemo(() => {
    if (!fermentationData || fermentationData.length === 0) {
      return [];
    }

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
            return parsedDate;
          }
        }
      }

      return new Date(); // Fallback to current date
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

  // Responsive screen dimensions that update on device rotation/unfolding
  const [screenDimensions, setScreenDimensions] = React.useState(() =>
    Dimensions.get("window")
  );

  // Listen for dimension changes (device rotation, folding/unfolding)
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenDimensions(window);
      // Force chart refresh when dimensions change
      setChartRefreshKey(prev => prev + 1);
    });

    return () => subscription?.remove();
  }, []);

  // Calculate optimal chart width based on current screen dimensions
  const chartWidth = React.useMemo(() => {
    const containerPadding = 60; // Account for container padding
    const secondaryAxisPadding = 80; // Increased padding for secondary Y-axis labels
    const maxChartWidth = 600; // Reduced max width to ensure secondary axis fits

    const calculatedWidth =
      screenDimensions.width - containerPadding - secondaryAxisPadding;

    // Constrain width to prevent over-stretching on large screens
    return Math.min(calculatedWidth, maxChartWidth);
  }, [screenDimensions.width]);

  // Generate chart keys for force re-rendering when data changes
  const chartKeys = React.useMemo(() => {
    // Use chartRefreshKey as the primary key since it's incremented on all relevant changes
    const baseKey = `${chartRefreshKey}-${screenDimensions.width}x${screenDimensions.height}`;

    return {
      combined: `combined-${baseKey}`,
      gravity: `gravity-${baseKey}`,
      temperature: `temperature-${baseKey}`,
    };
  }, [chartRefreshKey, screenDimensions]);

  // Convert to chart format for Gifted Charts with proper spacing and alignment
  const combinedChartData = React.useMemo(() => {
    if (processedData.length === 0) return { gravity: [], temperature: [] };

    // Create aligned data arrays where each index corresponds to the same date
    // This ensures proper spacing and secondary axis alignment
    const alignedData = processedData.map((point, index) => {
      const baseDataPoint = {
        label: point.rawDate.toLocaleDateString(undefined, {
          month: "numeric",
          day: "numeric",
        }),
        labelTextStyle: { color: theme.colors.textSecondary, fontSize: 9 },
        dataPointText: `Day ${point.x}`, // Add day indicator
      };

      return {
        gravity:
          point.gravity !== undefined
            ? {
                ...baseDataPoint,
                value: point.gravity,
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
  }, [processedData, theme.colors.textSecondary]);

  const gravityChartData = combinedChartData.gravity;
  const temperatureChartData = combinedChartData.temperature;
  // Calculate Y-axis scaling for charts
  const gravityAxisConfig = React.useMemo(() => {
    if (gravityChartData.length === 0) {
      return { minValue: 1.0, maxValue: 1.1 };
    }

    const gravityValues = gravityChartData.map(d => d.value);
    const maxGravity = actualOG || Math.max(...gravityValues);

    const config = {
      minValue: 1.0,
      // minValue: Math.max(1.000, minGravity - 0.005), // Never go below 1.000
      maxValue: maxGravity + 0.01 - 1, // Add buffer above actual OG
    };

    return config;
  }, [gravityChartData, actualOG]);

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
    if (temperatureChartData.length === 0) {
      return getSessionTemperatureAxisConfig([]);
    }

    const temperatures = temperatureChartData.map(d => d.value);
    console.log("Temperatures for axis config:", temperatures);
    console.log(
      "Temperature Axis Config:",
      getSessionTemperatureAxisConfig(temperatures, 8)
    );
    return getSessionTemperatureAxisConfig(temperatures, 8);
  }, [temperatureChartData, getSessionTemperatureAxisConfig]);

  const gravityReferenceLines = React.useMemo(() => {
    if (!expectedFG) {
      return [];
    }

    const referenceConfig = {
      value: expectedFG,
      color: "#FF7300",
      thickness: 2,
      type: "dashed",
      dashWidth: 4,
      dashGap: 4,
      labelText: `Expected FG: ${expectedFG.toFixed(3)}`,
      labelTextStyle: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: "600",
      },
    };

    return [referenceConfig];
  }, [expectedFG, theme.colors.textSecondary]);

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
    spacing: chartWidth / Math.max(gravityChartData.length, 1), // Dynamic spacing for full width
    xAxisLabelTextStyle: { color: theme.colors.textSecondary, fontSize: 9 },
    showXAxisIndices: true,
    xAxisIndicesHeight: 4,
    xAxisIndicesWidth: 1,
    xAxisIndicesColor: theme.colors.border,
  };

  const gravityChartConfig = {
    ...baseChartConfig,
    height: 200,
    color: theme.colors.gravityLine,
    thickness: 3,
    dataPointsColor: theme.colors.gravityLine,
    dataPointsRadius: 4,
    maxValue: gravityAxisConfig.maxValue,
    yAxisOffset: gravityAxisConfig.minValue,
    noOfSections: 6,
    yAxisLabelSuffix: "",
    formatYLabel: (label: string) => parseFloat(label).toFixed(3),
    referenceLine1Config:
      gravityReferenceLines.length > 0 ? gravityReferenceLines[0] : undefined,
  };

  const temperatureChartConfig = {
    ...baseChartConfig,
    height: 200,
    color: theme.colors.temperatureLine,
    thickness: 2,
    dataPointsColor: theme.colors.temperatureLine,
    dataPointsRadius: 4,
    maxValue: temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue,
    yAxisOffset: temperatureAxisConfig.minValue,
    yAxisLabelSuffix: getSessionTemperatureSymbol(),
    formatYLabel: (label: string) => Math.round(parseFloat(label)).toString(),
  };

  const combinedChartConfig = {
    ...baseChartConfig,
    height: 250,
    color: theme.colors.gravityLine,
    thickness: 3,
    dataPointsColor: theme.colors.gravityLine,
    dataPointsRadius: 4,
    maxValue: gravityAxisConfig.maxValue,
    yAxisOffset: gravityAxisConfig.minValue,
    noOfSections: 6,
    yAxisLabelSuffix: "",
    formatYLabel: (label: string) => parseFloat(label).toFixed(3),
    referenceLine1Config:
      gravityReferenceLines.length > 0 ? gravityReferenceLines[0] : undefined,
    showSecondaryYAxis: true,
    secondaryYAxis: {
      yAxisOffset: temperatureAxisConfig.minValue,
      maxValue: temperatureAxisConfig.maxValue - temperatureAxisConfig.minValue,
      noOfSections: 6,
      yAxisLabelSuffix: getSessionTemperatureSymbol(),
      formatYLabel: (label: string) => Math.round(parseFloat(label)).toString(),
      yAxisTextStyle: { color: theme.colors.textSecondary, fontSize: 10 },
      yAxisColor: theme.colors.border,
      showYAxisIndices: true,
      yAxisLabelWidth: 45, // Increased width for temperature labels
      hideYAxisText: false, // Explicitly show Y-axis text
      yAxisLabelContainerStyle: { width: 100 }, // Container width for labels
    },
    secondaryLineConfig: {
      color: theme.colors.temperatureLine,
      thickness: 3,
      dataPointsColor: theme.colors.temperatureLine,
      dataPointsRadius: 4,
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
              {gravityChartData[gravityChartData.length - 1].value.toFixed(3)}
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
              {formatSessionTemperature(
                temperatureChartData[temperatureChartData.length - 1].value
              )}
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
              {expectedFG.toFixed(3)}
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
            <View style={styles.chartSection}>
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Combined View
              </Text>
              <View style={styles.chart}>
                <ChartWrapper refreshKey={chartKeys.combined}>
                  <LineChart
                    {...combinedChartConfig}
                    data={gravityChartData}
                    secondaryData={temperatureChartData}
                  />
                </ChartWrapper>
              </View>
            </View>
          ) : (
            // Show individual charts if only one type of data exists
            <>
              {gravityChartData.length > 0 ? (
                <View style={styles.chartSection}>
                  <Text
                    style={[styles.chartTitle, { color: theme.colors.text }]}
                  >
                    Specific Gravity
                  </Text>
                  <View style={styles.chart}>
                    <ChartWrapper refreshKey={chartKeys.gravity}>
                      <LineChart
                        {...gravityChartConfig}
                        data={gravityChartData}
                      />
                    </ChartWrapper>
                  </View>
                </View>
              ) : null}
              {temperatureChartData.length > 0 ? (
                <View style={styles.chartSection}>
                  <Text
                    style={[styles.chartTitle, { color: theme.colors.text }]}
                  >
                    Temperature
                  </Text>
                  <View style={styles.chart}>
                    <ChartWrapper refreshKey={chartKeys.temperature}>
                      <LineChart
                        {...temperatureChartConfig}
                        data={temperatureChartData}
                      />
                    </ChartWrapper>
                  </View>
                </View>
              ) : null}
            </>
          )
        ) : (
          // Separate charts view
          <>
            {gravityChartData.length > 0 ? (
              <View style={styles.chartSection}>
                <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                  Specific Gravity
                </Text>
                <View style={styles.chart}>
                  <ChartWrapper refreshKey={chartKeys.gravity}>
                    <LineChart
                      {...gravityChartConfig}
                      data={gravityChartData}
                    />
                  </ChartWrapper>
                </View>
              </View>
            ) : null}

            {temperatureChartData.length > 0 ? (
              <View style={styles.chartSection}>
                <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                  Temperature
                </Text>
                <View style={styles.chart}>
                  <ChartWrapper refreshKey={chartKeys.temperature}>
                    <LineChart
                      {...temperatureChartConfig}
                      data={temperatureChartData}
                    />
                  </ChartWrapper>
                </View>
              </View>
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
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
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
});
