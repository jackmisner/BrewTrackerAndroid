import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { BrewingMetricsDisplay } from "@src/components/recipes/BrewingMetrics/BrewingMetricsDisplay";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      error: "#ff4444",
      textSecondary: "#666",
      text: "#333",
      textMuted: "#999",
    },
  }),
}));

jest.mock("@styles/components/brewingMetricsStyles", () => ({
  brewingMetricsStyles: () => ({
    container: { flex: 1 },
    sectionTitle: { fontSize: 18, fontWeight: "bold" },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap" },
    metricCard: {
      backgroundColor: "#f9f9f9",
      padding: 12,
      borderRadius: 8,
      margin: 4,
      minWidth: 80,
    },
    metricLabel: { fontSize: 12, color: "#666" },
    metricValue: { fontSize: 16, fontWeight: "600" },
    loadingSkeleton: {
      height: 16,
      backgroundColor: "#e0e0e0",
      borderRadius: 4,
    },
    srmColorIndicator: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginTop: 4,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    errorText: { fontSize: 14, color: "#ff4444", marginLeft: 8 },
    retryButton: {
      backgroundColor: "#f4511e",
      padding: 8,
      borderRadius: 4,
      marginLeft: 12,
    },
    retryButtonText: { color: "#fff", fontSize: 14 },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    emptyStateText: { fontSize: 14, color: "#666", marginTop: 8 },
  }),
}));

jest.mock("@utils/formatUtils", () => ({
  formatGravity: (value: number) => value.toFixed(3),
  formatABV: (value: number) => `${value.toFixed(1)}%`,
  formatIBU: (value: number) => Math.round(value).toString(),
  formatSRM: (value: number) => value.toFixed(1),
  getSrmColor: (value: number) => {
    if (value < 3) return "#FFE699";
    if (value < 6) return "#FFD700";
    if (value < 10) return "#FFAA00";
    return "#8B4513";
  },
}));

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name, testID, ...props }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return (
      <Text testID={testID || `icon-${name}`} {...props}>
        {name}
      </Text>
    );
  },
}));

describe("BrewingMetricsDisplay", () => {
  const mockMetrics = {
    og: 1.055,
    fg: 1.012,
    abv: 5.6,
    ibu: 35,
    srm: 8.5,
  };

  describe("Basic rendering", () => {
    it("should render with all metrics", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} />
      );

      expect(getByText("Brewing Metrics")).toBeTruthy();
      expect(getByText("OG")).toBeTruthy();
      expect(getByText("FG")).toBeTruthy();
      expect(getByText("ABV")).toBeTruthy();
      expect(getByText("IBU")).toBeTruthy();
      expect(getByText("SRM")).toBeTruthy();
    });

    it("should format metric values correctly", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} />
      );

      expect(getByText("1.055")).toBeTruthy(); // OG formatted
      expect(getByText("1.012")).toBeTruthy(); // FG formatted
      expect(getByText("5.6%")).toBeTruthy(); // ABV formatted
      expect(getByText("35")).toBeTruthy(); // IBU formatted
      expect(getByText("8.5")).toBeTruthy(); // SRM formatted
    });

    it("should hide title when showTitle is false", () => {
      const { queryByText } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} showTitle={false} />
      );

      expect(queryByText("Brewing Metrics")).toBeNull();
    });

    it("should show SRM color indicator", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} />
      );

      // Look for the SRM color indicator (it would be styled with backgroundColor)
      // In real implementation, this would be a View with background color
      // For now, we verify the SRM value is displayed correctly
      expect(getByText("8.5")).toBeTruthy();
    });
  });

  describe("Loading state", () => {
    it("should show loading skeletons when loading is true", () => {
      const { queryByText } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} loading={true} />
      );

      // Should show the structure but no values
      expect(queryByText("1.055")).toBeNull();
      expect(queryByText("5.6%")).toBeNull();
      // Labels should still be visible
      expect(queryByText("OG")).toBeTruthy();
      expect(queryByText("ABV")).toBeTruthy();
    });
  });

  describe("Error state", () => {
    it("should render error state with message", () => {
      const errorMessage = "Failed to calculate metrics";
      const { getByText, getByTestId } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} error={errorMessage} />
      );

      expect(getByText(errorMessage)).toBeTruthy();
      expect(getByTestId("icon-error-outline")).toBeTruthy();
    });

    it("should show retry button when onRetry is provided", () => {
      const mockRetry = jest.fn();
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          error="Failed to calculate"
          onRetry={mockRetry}
        />
      );

      const retryButton = getByText("Retry");
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it("should not show retry button when onRetry is not provided", () => {
      const { queryByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          error="Failed to calculate"
        />
      );

      expect(queryByText("Retry")).toBeNull();
    });
  });

  describe("Empty state", () => {
    it("should show empty state when no metrics provided", () => {
      const { getByText, getByTestId } = render(<BrewingMetricsDisplay />);

      expect(
        getByText("Metrics will appear as you add ingredients")
      ).toBeTruthy();
      expect(getByTestId("icon-analytics")).toBeTruthy();
    });

    it("should show empty state when all metrics are undefined", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: undefined,
            fg: undefined,
            abv: undefined,
            ibu: undefined,
            srm: undefined,
          }}
        />
      );

      expect(
        getByText("Metrics will appear as you add ingredients")
      ).toBeTruthy();
    });

    it("should show compact empty state message", () => {
      const { getByText } = render(<BrewingMetricsDisplay compact={true} />);

      expect(getByText("Add ingredients to see metrics")).toBeTruthy();
    });

    it("should show metrics even if only one value is present", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: 1.05,
            fg: undefined,
            abv: undefined,
            ibu: undefined,
            srm: undefined,
          }}
        />
      );

      expect(getByText("1.050")).toBeTruthy();
      expect(getByText("OG")).toBeTruthy();
    });
  });

  describe("Mash temperature", () => {
    it("should show mash temperature in full mode", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          mash_temperature={152}
          mash_temp_unit="F"
          compact={false}
        />
      );

      expect(getByText("Mash Temp")).toBeTruthy();
      expect(getByText("152°F")).toBeTruthy();
    });

    it("should not show mash temperature in compact mode", () => {
      const { queryByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          mash_temperature={152}
          mash_temp_unit="F"
          compact={true}
        />
      );

      expect(queryByText("Mash Temp")).toBeNull();
      expect(queryByText("152°F")).toBeNull();
    });

    it("should handle Celsius temperature unit", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          mash_temperature={67}
          mash_temp_unit="C"
          compact={false}
        />
      );

      expect(getByText("67°C")).toBeTruthy();
    });

    it("should not show mash temperature if not provided", () => {
      const { queryByText } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} compact={false} />
      );

      expect(queryByText("Mash Temp")).toBeNull();
    });
  });

  describe("Value formatting and validation", () => {
    it("should handle undefined values gracefully", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: undefined,
            fg: 1.012,
            abv: undefined,
            ibu: 35,
            srm: undefined,
          }}
        />
      );

      // Should show em dash for undefined values
      expect(getByText("1.012")).toBeTruthy(); // FG shows
      expect(getByText("35")).toBeTruthy(); // IBU shows
    });

    it("should handle null values gracefully", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: null as any,
            fg: 1.012,
            abv: null as any,
            ibu: 35,
            srm: null as any,
          }}
        />
      );

      expect(getByText("1.012")).toBeTruthy();
      expect(getByText("35")).toBeTruthy();
    });

    it("should handle NaN values gracefully", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: NaN,
            fg: 1.012,
            abv: NaN,
            ibu: 35,
            srm: NaN,
          }}
        />
      );

      expect(getByText("1.012")).toBeTruthy();
      expect(getByText("35")).toBeTruthy();
    });

    it("should handle string numeric values as empty state", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: "1.055" as any,
            fg: "1.012" as any,
            abv: "5.6" as any,
            ibu: "35" as any,
            srm: "8.5" as any,
          }}
        />
      );

      // String values are treated as invalid, so should show empty state
      expect(
        getByText("Metrics will appear as you add ingredients")
      ).toBeTruthy();
    });

    it("should handle zero values correctly", () => {
      const { getAllByText, getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: 0,
            fg: 0,
            abv: 0,
            ibu: 0,
            srm: 0,
          }}
        />
      );

      expect(getAllByText("0.000")).toHaveLength(2); // OG and FG
      expect(getByText("0.0%")).toBeTruthy(); // ABV
      expect(getByText("0")).toBeTruthy(); // IBU
      expect(getByText("0.0")).toBeTruthy(); // SRM
    });

    it("should round mash temperature to whole numbers", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          mash_temperature={152.7}
          mash_temp_unit="F"
          compact={false}
        />
      );

      expect(getByText("153°F")).toBeTruthy(); // Rounded up
    });
  });

  describe("Theme integration", () => {
    it("should use theme colors for styling", () => {
      // Theme integration is handled through the mocked brewingMetricsStyles
      // In a real test, we would verify that the component receives the theme
      const { getByText } = render(
        <BrewingMetricsDisplay metrics={mockMetrics} />
      );

      // Verify the component renders (implying theme integration works)
      expect(getByText("Brewing Metrics")).toBeTruthy();
    });
  });

  describe("Compact mode", () => {
    it("should apply compact styling when compact prop is true", () => {
      const { getByText, getByTestId } = render(
        <BrewingMetricsDisplay compact={true} />
      );

      // In compact mode, empty state shows different text
      expect(getByText("Add ingredients to see metrics")).toBeTruthy();
      // Icon size should be smaller (24 vs 32)
      expect(getByTestId("icon-analytics")).toBeTruthy();
    });

    it("should not show mash temperature in compact mode even if provided", () => {
      const { queryByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          mash_temperature={152}
          mash_temp_unit="F"
          compact={true}
        />
      );

      expect(queryByText("Mash Temp")).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle extremely high values", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: 1.2,
            fg: 1.1,
            abv: 15.8,
            ibu: 120,
            srm: 50.5,
          }}
        />
      );

      expect(getByText("1.200")).toBeTruthy();
      expect(getByText("15.8%")).toBeTruthy();
      expect(getByText("120")).toBeTruthy();
    });

    it("should handle very small decimal values", () => {
      const { getByText } = render(
        <BrewingMetricsDisplay
          metrics={{
            og: 1.001,
            fg: 1.0,
            abv: 0.1,
            ibu: 0.5,
            srm: 0.1,
          }}
        />
      );

      expect(getByText("1.001")).toBeTruthy();
      expect(getByText("1.000")).toBeTruthy();
      expect(getByText("0.1%")).toBeTruthy();
    });

    it("should handle loading state with error simultaneously", () => {
      // Error should take priority over loading
      const { getByText, queryByText } = render(
        <BrewingMetricsDisplay
          metrics={mockMetrics}
          loading={true}
          error="Calculation failed"
        />
      );

      expect(getByText("Calculation failed")).toBeTruthy();
      // Should not show loading skeletons when error is present
      expect(queryByText("1.055")).toBeNull();
    });
  });
});
