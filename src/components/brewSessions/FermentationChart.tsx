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

interface FermentationChartProps {
  fermentationData: FermentationEntry[];
  expectedFG?: number;
  actualOG?: number;
  temperatureUnit?: "C" | "F"; // Session-specific temperature unit
}

interface ChartDataPoint {
  value: number; // Y-axis value
  label?: string; // X-axis label (day number)
  labelTextStyle?: object;
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
}) => {
  const theme = useTheme();
  const units = useUnits();
  const [combinedView, setCombinedView] = React.useState(true);

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

      console.log(
        "⚠️ [FermentationChart] No valid date found for entry:",
        entry
      );
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

  // Get screen dimensions for responsive chart sizing
  const screenWidth = Dimensions.get("window").width;

  // Calculate optimal chart width based on data points and screen size
  const calculateOptimalChartWidth = React.useMemo(() => {
    const containerPadding = 32; // Account for container padding
    return screenWidth - containerPadding; // Always use full available width
  }, [screenWidth]);

  const chartWidth = calculateOptimalChartWidth;

  // Convert to chart format for Gifted Charts with proper spacing
  const combinedChartData = React.useMemo(() => {
    const maxPoints = Math.max(
      processedData.filter(p => p.gravity !== undefined).length,
      processedData.filter(p => p.temperature !== undefined).length
    );

    if (maxPoints === 0) return { gravity: [], temperature: [] };

    // Create arrays for both gravity and temperature data with proper spacing
    const gravityData = processedData
      .filter(point => point.gravity !== undefined)
      .map((point, index) => ({
        value: point.gravity!,
        label: point.rawDate.toLocaleDateString(undefined, {
          month: "numeric",
          day: "numeric",
        }),
        labelTextStyle: { color: theme.colors.textSecondary, fontSize: 9 },
      }));

    const temperatureData = processedData
      .filter(point => point.temperature !== undefined)
      .map((point, index) => ({
        value: point.temperature!,
        label: point.rawDate.toLocaleDateString(undefined, {
          month: "numeric",
          day: "numeric",
        }),
        labelTextStyle: { color: theme.colors.textSecondary, fontSize: 9 },
      }));

    return { gravity: gravityData, temperature: temperatureData };
  }, [processedData, theme.colors.textSecondary]);

  const gravityChartData = combinedChartData.gravity;
  const temperatureChartData = combinedChartData.temperature;
  // Calculate Y-axis scaling for charts
  const gravityAxisConfig = React.useMemo(() => {
    if (gravityChartData.length === 0) {
      return { minValue: 1.0, maxValue: 1.1 };
    }

    const gravityValues = gravityChartData.map(d => d.value);
    const minGravity = Math.min(...gravityValues);
    const maxGravity = actualOG || Math.max(...gravityValues);

    const config = {
      minValue: 1.0,
      // minValue: Math.max(1.000, minGravity - 0.005), // Never go below 1.000
      maxValue: maxGravity + 0.01 - 1, // Add buffer above actual OG
    };

    return config;
  }, [gravityChartData, actualOG]);

  const temperatureAxisConfig = React.useMemo(() => {
    if (temperatureChartData.length === 0) {
      console.log(
        "🔍 [FermentationChart] No temperature data, using default range"
      );
      return { minValue: 60, maxValue: 80 };
    }

    const temperatures = temperatureChartData.map(d => d.value);
    const avgTemp =
      temperatures.reduce((a, b) => a + b, 0) / temperatures.length;

    // Use appropriate temperature range based on unit system
    const config = units.getTemperatureAxisConfig(temperatures, 8);

    return config;
  }, [temperatureChartData]);

  const gravityReferenceLines = React.useMemo(() => {
    console.log("🔍 [FermentationChart] Expected FG:", expectedFG);
    if (!expectedFG) {
      console.log("🔍 [FermentationChart] No expected FG, no reference line");
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

    console.log(
      "🔍 [FermentationChart] Reference line config:",
      referenceConfig
    );
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
    animateOnDataChange: true,
    animationDuration: 800,
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
    maxValue: temperatureAxisConfig.maxValue,
    yAxisLabelSuffix: units.getTemperatureSymbol(),
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
    secondaryYAxis: {
      yAxisOffset: temperatureAxisConfig.minValue,
      noOfSections: 6,
      yAxisLabelSuffix: units.getTemperatureSymbol(),
      formatYLabel: (label: string) => Math.round(parseFloat(label)).toString(),
      yAxisTextStyle: { color: theme.colors.textSecondary },
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
          onPress={() => setCombinedView(!combinedView)}
        >
          <Text style={[styles.toggleText, { color: theme.colors.text }]}>
            {combinedView ? "Separate" : "Combined"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart Stats */}
      <View style={styles.statsRow}>
        {gravityChartData.length > 0 && (
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
        )}
        {temperatureChartData.length > 0 && (
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
        )}
        {expectedFG && (
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
        )}
        <View style={styles.stat}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Duration
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {(() => {
              const days = Math.max(...processedData.map(d => d.x));
              return `${days} ${days === 1 ? 'day' : 'days'}`;
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
                <LineChart
                  {...combinedChartConfig}
                  data={gravityChartData}
                  secondaryData={temperatureChartData}
                />
              </View>
            </View>
          ) : (
            // Show individual charts if only one type of data exists
            <>
              {gravityChartData.length > 0 && (
                <View style={styles.chartSection}>
                  <Text
                    style={[styles.chartTitle, { color: theme.colors.text }]}
                  >
                    Specific Gravity
                  </Text>
                  <View style={styles.chart}>
                    <LineChart
                      {...gravityChartConfig}
                      data={gravityChartData}
                    />
                  </View>
                </View>
              )}
              {temperatureChartData.length > 0 && (
                <View style={styles.chartSection}>
                  <Text
                    style={[styles.chartTitle, { color: theme.colors.text }]}
                  >
                    Temperature
                  </Text>
                  <View style={styles.chart}>
                    <LineChart
                      {...temperatureChartConfig}
                      data={temperatureChartData}
                    />
                  </View>
                </View>
              )}
            </>
          )
        ) : (
          // Separate charts view
          <>
            {gravityChartData.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                  Specific Gravity
                </Text>
                <View style={styles.chart}>
                  <LineChart {...gravityChartConfig} data={gravityChartData} />
                </View>
              </View>
            )}

            {temperatureChartData.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                  Temperature
                </Text>
                <View style={styles.chart}>
                  <LineChart
                    {...temperatureChartConfig}
                    data={temperatureChartData}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {gravityChartData.length > 0 && (
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
        )}
        {temperatureChartData.length > 0 && (
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
        )}
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
  },
  chartSection: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  chart: {
    height: 200,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
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
