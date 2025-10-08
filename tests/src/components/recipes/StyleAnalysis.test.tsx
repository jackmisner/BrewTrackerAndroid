/**
 * Tests for StyleAnalysis Component
 *
 * Tests beer style adherence display with real-time metrics comparison,
 * range formatting, and match status visualization.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { StyleAnalysis } from "@src/components/recipes/StyleAnalysis";
import { TEST_IDS } from "@src/constants/testIDs";

// Mock ThemeContext
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      border: "#E0E0E0",
      text: "#000000",
      textMuted: "#999999",
      primary: "#007AFF",
      primaryLight40: "#66AAFF",
      success: "#4CAF50",
      warning: "#FF9800",
      error: "#F44336",
    },
  }),
}));

// Mock useBeerStyles hook
const mockUseBeerStyles = jest.fn();
jest.mock("@src/hooks/offlineV2", () => ({
  useBeerStyles: () => mockUseBeerStyles(),
}));

// Mock UnifiedLogger
jest.mock("@services/logger/UnifiedLogger", () => ({
  UnifiedLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
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

describe("StyleAnalysis", () => {
  const mockAmericanIPA = {
    id: "1",
    style_id: "21A",
    name: "American IPA",
    category: "IPA",
    description:
      "A decidedly hoppy and bitter, moderately strong American pale ale.",
    overall_impression:
      "A decidedly hoppy and bitter, moderately strong American pale ale.",
    original_gravity: {
      minimum: { unit: "sg", value: 1.056 },
      maximum: { unit: "sg", value: 1.07 },
    },
    final_gravity: {
      minimum: { unit: "sg", value: 1.01 },
      maximum: { unit: "sg", value: 1.015 },
    },
    alcohol_by_volume: {
      minimum: { unit: "%", value: 5.5 },
      maximum: { unit: "%", value: 7.5 },
    },
    international_bitterness_units: {
      minimum: { unit: "IBUs", value: 40 },
      maximum: { unit: "IBUs", value: 70 },
    },
    color: {
      minimum: { unit: "SRM", value: 6 },
      maximum: { unit: "SRM", value: 14 },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock: return American IPA style
    mockUseBeerStyles.mockReturnValue({
      data: [mockAmericanIPA],
      isLoading: false,
      error: null,
    });
  });

  describe("Ranges mode (BasicInfo/Parameters forms)", () => {
    it("should render style guidelines without current values in ranges mode", () => {
      const { getByTestId, queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="ranges"
          variant="compact"
          testID={TEST_IDS.recipes.styleAnalysisCompact}
        />
      );

      // Verify component renders
      const component = getByTestId(TEST_IDS.recipes.styleAnalysisCompact);
      expect(component).toBeTruthy();

      // Should show "Target Ranges" text
      expect(queryByText("Target Ranges")).toBeTruthy();
    });

    it("should display all metric ranges in ranges mode", () => {
      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="ranges"
          variant="detailed"
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      // Should show all metric ranges formatted correctly
      expect(queryByText("1.056 - 1.070")).toBeTruthy(); // OG range (3 decimals)
      expect(queryByText("1.010 - 1.015")).toBeTruthy(); // FG range (3 decimals)
      expect(queryByText("5.5 - 7.5")).toBeTruthy(); // ABV range (1 decimal)
      expect(queryByText("40 - 70")).toBeTruthy(); // IBU range (0 decimals)
      expect(queryByText("6.0 - 14.0")).toBeTruthy(); // SRM range (1 decimal)
    });

    it("should not show current metric values in ranges mode", () => {
      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="ranges"
          variant="detailed"
          metrics={{ og: 1.06, fg: 1.012, abv: 6.5, ibu: 55, srm: 10 }}
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      // Should NOT show percentage or adherence info in ranges mode
      expect(queryByText("100%")).toBeNull();
      expect(queryByText("Style Adherence")).toBeNull();
    });
  });

  describe("Adherence mode (IngredientsForm)", () => {
    it("should show default values when no metrics provided", () => {
      const { getByTestId, queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="adherence"
          variant="detailed"
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      // Should show default values (not N/A)
      const ogSpec = getByTestId(
        `${TEST_IDS.recipes.styleAnalysisDetailed}-spec-og`
      );
      const fgSpec = getByTestId(
        `${TEST_IDS.recipes.styleAnalysisDetailed}-spec-fg`
      );
      const abvSpec = getByTestId(
        `${TEST_IDS.recipes.styleAnalysisDetailed}-spec-abv`
      );
      const ibuSpec = getByTestId(
        `${TEST_IDS.recipes.styleAnalysisDetailed}-spec-ibu`
      );
      const srmSpec = getByTestId(
        `${TEST_IDS.recipes.styleAnalysisDetailed}-spec-srm`
      );

      expect(ogSpec).toBeTruthy();
      expect(fgSpec).toBeTruthy();
      expect(abvSpec).toBeTruthy();
      expect(ibuSpec).toBeTruthy();
      expect(srmSpec).toBeTruthy();

      // Check that we're showing default values, not N/A
      expect(queryByText("N/A")).toBeNull();
    });

    it("should calculate and display 100% match for perfect recipe", () => {
      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="adherence"
          variant="detailed"
          metrics={{ og: 1.06, fg: 1.012, abv: 6.5, ibu: 55, srm: 10 }}
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      // Should show 100% match
      expect(queryByText("100%")).toBeTruthy();
      expect(queryByText("Excellent Match")).toBeTruthy();

      // Should show actual metric values
      expect(queryByText("1.060")).toBeTruthy(); // OG
      expect(queryByText("1.012")).toBeTruthy(); // FG
      expect(queryByText("6.5%")).toBeTruthy(); // ABV
      expect(queryByText("55")).toBeTruthy(); // IBU
      expect(queryByText("10.0")).toBeTruthy(); // SRM
    });

    it("should calculate and display 80% match for partial adherence", () => {
      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="adherence"
          variant="detailed"
          metrics={{ og: 1.06, fg: 1.012, abv: 6.5, ibu: 55, srm: 20 }} // SRM out of range
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      // Should show 80% match (4 out of 5)
      expect(queryByText("80%")).toBeTruthy();
      expect(queryByText("Excellent Match")).toBeTruthy();
    });

    it("should display Good Match for 60-79% adherence", () => {
      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="adherence"
          variant="detailed"
          metrics={{ og: 1.08, fg: 1.02, abv: 6.5, ibu: 55, srm: 10 }} // OG & FG out of range
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      // Should show 60% match (3 out of 5)
      expect(queryByText("60%")).toBeTruthy();
      expect(queryByText("Good Match")).toBeTruthy();
    });

    it("should display Needs Adjustment for <60% adherence", () => {
      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="adherence"
          variant="detailed"
          metrics={{ og: 1.08, fg: 1.02, abv: 9.0, ibu: 100, srm: 20 }} // All out of range
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      // Should show 0% match
      expect(queryByText("0%")).toBeTruthy();
      expect(queryByText("Needs Adjustment")).toBeTruthy();
    });
  });

  describe("Error and edge cases", () => {
    it("should show loading state when beer styles are loading", () => {
      mockUseBeerStyles.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="ranges"
          variant="detailed"
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      expect(queryByText("Loading style data...")).toBeTruthy();
    });

    it("should show error when style not found", () => {
      mockUseBeerStyles.mockReturnValue({
        data: [mockAmericanIPA],
        isLoading: false,
        error: null,
      });

      const { queryByText } = render(
        <StyleAnalysis
          styleName="Non-existent Style"
          mode="ranges"
          variant="detailed"
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      expect(
        queryByText('Style "Non-existent Style" not found in database')
      ).toBeTruthy();
    });

    it("should handle compact variant correctly", () => {
      const { getByTestId, queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="ranges"
          variant="compact"
          testID={TEST_IDS.recipes.styleAnalysisCompact}
        />
      );

      const component = getByTestId(TEST_IDS.recipes.styleAnalysisCompact);
      expect(component).toBeTruthy();
      expect(queryByText("American IPA")).toBeTruthy();
      expect(queryByText("Target Ranges")).toBeTruthy();
    });

    it("should display style name correctly", () => {
      const { queryByText } = render(
        <StyleAnalysis
          styleName="American IPA"
          mode="adherence"
          variant="detailed"
          metrics={{ og: 1.06, fg: 1.012, abv: 6.5, ibu: 55, srm: 10 }}
          testID={TEST_IDS.recipes.styleAnalysisDetailed}
        />
      );

      expect(queryByText("American IPA")).toBeTruthy();
    });
  });
});
