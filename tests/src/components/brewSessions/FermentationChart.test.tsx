import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FermentationChart } from "../../../../src/components/brewSessions/FermentationChart";
import { FermentationEntry } from "../../../../src/types";

// Comprehensive React Native mocking
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  TouchableOpacity: "TouchableOpacity",
}));

// Mock react-native-gifted-charts
jest.mock("react-native-gifted-charts", () => ({
  LineChart: "LineChart",
}));

// Mock theme context
const mockTheme = {
  colors: {
    background: "#ffffff",
    text: "#000000",
    textSecondary: "#666666",
    textMuted: "#999999",
    primary: "#f4511e",
    border: "#e0e0e0",
    gravityLine: "#2196f3",
    temperatureLine: "#ff9800",
  },
};

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => mockTheme,
}));

// Mock unit context
const mockUnits = {
  getTemperatureSymbol: jest.fn(() => "°F"),
  getTemperatureAxisConfig: jest.fn((temps, buffer) => ({
    minValue: Math.min(...temps) - buffer,
    maxValue: Math.max(...temps) + buffer,
  })),
};

jest.mock("@contexts/UnitContext", () => ({
  useUnits: () => mockUnits,
}));

describe("FermentationChart", () => {
  const defaultFermentationData: FermentationEntry[] = [
    {
      id: "1",
      entry_date: "2024-01-01T12:00:00Z",
      gravity: 1.050,
      temperature: 68,
      ph: 4.2,
    },
    {
      id: "2", 
      entry_date: "2024-01-03T12:00:00Z",
      gravity: 1.030,
      temperature: 70,
      ph: 4.0,
    },
    {
      id: "3",
      entry_date: "2024-01-05T12:00:00Z", 
      gravity: 1.015,
      temperature: 69,
      ph: 3.8,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnits.getTemperatureSymbol.mockReturnValue("°F");
  });

  describe("Empty state", () => {
    it("should render empty state when no fermentation data", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={[]} />
      );

      expect(getByText("Fermentation Progress")).toBeTruthy();
      expect(getByText("No fermentation data available")).toBeTruthy();
      expect(getByText("Start logging fermentation readings to see the progress chart")).toBeTruthy();
    });

    it("should render empty state when fermentation data is undefined", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={undefined as any} />
      );

      expect(getByText("No fermentation data available")).toBeTruthy();
    });
  });

  describe("Basic rendering with data", () => {
    it("should render chart title and toggle button", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("Fermentation Progress")).toBeTruthy();
      expect(getByText("Separate")).toBeTruthy(); // Default is combined view
    });

    it("should render stats when data is available", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("Latest Gravity")).toBeTruthy();
      expect(getByText("Latest Temp")).toBeTruthy();
      expect(getByText("Duration")).toBeTruthy();
    });

    it("should display correct latest gravity value", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("1.015")).toBeTruthy(); // Latest gravity from last entry
    });

    it("should display correct duration", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("5 days")).toBeTruthy(); // 5 days from first to last entry
    });

    it("should render legend", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("Specific Gravity")).toBeTruthy();
      expect(getByText("Temperature")).toBeTruthy();
    });
  });

  describe("Chart view toggle", () => {
    it("should toggle from combined to separate view", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      const toggleButton = getByText("Separate");
      fireEvent.press(toggleButton);

      expect(getByText("Combined")).toBeTruthy(); // Button text changes
    });

    it("should show combined view by default", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("Combined View")).toBeTruthy();
      expect(getByText("Separate")).toBeTruthy(); // Toggle button shows "Separate"
    });
  });

  describe("Expected FG integration", () => {
    it("should display expected FG stat when provided", () => {
      const { getByText } = render(
        <FermentationChart
          fermentationData={defaultFermentationData}
          expectedFG={1.012}
        />
      );

      expect(getByText("Expected FG")).toBeTruthy();
      expect(getByText("1.012")).toBeTruthy();
    });

    it("should not display expected FG stat when not provided", () => {
      const { queryByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(queryByText("Expected FG")).toBeFalsy();
    });
  });

  describe("Temperature unit handling", () => {
    it("should use session temperature unit when provided", () => {
      mockUnits.getTemperatureSymbol.mockReturnValue("°C");
      
      const { getByText } = render(
        <FermentationChart
          fermentationData={defaultFermentationData}
          temperatureUnit="C"
        />
      );

      expect(getByText("69.0°C")).toBeTruthy(); // Latest temp with Celsius (includes decimal)
    });

    it("should fallback to user preference when no session unit", () => {
      mockUnits.getTemperatureSymbol.mockReturnValue("°F");
      
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(mockUnits.getTemperatureSymbol).toHaveBeenCalled();
      expect(getByText("69.0°F")).toBeTruthy(); // Latest temp with Fahrenheit (includes decimal)
    });

    it("should handle Fahrenheit session unit", () => {
      const { getByText } = render(
        <FermentationChart
          fermentationData={defaultFermentationData}
          temperatureUnit="F"
        />
      );

      expect(getByText("69.0°F")).toBeTruthy();
    });
  });

  describe("Data processing and sorting", () => {
    it("should handle unsorted fermentation data", () => {
      const unsortedData: FermentationEntry[] = [
        {
          id: "3",
          entry_date: "2024-01-05T12:00:00Z",
          gravity: 1.015,
          temperature: 69,
        },
        {
          id: "1", 
          entry_date: "2024-01-01T12:00:00Z",
          gravity: 1.050,
          temperature: 68,
        },
        {
          id: "2",
          entry_date: "2024-01-03T12:00:00Z",
          gravity: 1.030,
          temperature: 70,
        },
      ];

      const { getByText } = render(
        <FermentationChart fermentationData={unsortedData} />
      );

      // Should still work correctly with sorted data
      expect(getByText("1.015")).toBeTruthy(); // Latest gravity
      expect(getByText("5 days")).toBeTruthy(); // Correct duration
    });

    it("should handle different date field names", () => {
      const dataWithDifferentDateFields: FermentationEntry[] = [
        {
          id: "1",
          date: "2024-01-01T12:00:00Z", // Using 'date' instead of 'entry_date'
          gravity: 1.050,
          temperature: 68,
        },
        {
          id: "2",
          created_at: "2024-01-03T12:00:00Z", // Using 'created_at'
          gravity: 1.030,
          temperature: 70,
        },
      ];

      const { getByText } = render(
        <FermentationChart fermentationData={dataWithDifferentDateFields} />
      );

      expect(getByText("3 days")).toBeTruthy(); // Should calculate duration correctly
    });

    it("should handle missing gravity data", () => {
      const dataWithMissingGravity: FermentationEntry[] = [
        {
          id: "1",
          entry_date: "2024-01-01T12:00:00Z",
          temperature: 68,
        },
        {
          id: "2",
          entry_date: "2024-01-03T12:00:00Z", 
          gravity: 1.030,
          temperature: 70,
        },
      ];

      const { getByText, queryByText } = render(
        <FermentationChart fermentationData={dataWithMissingGravity} />
      );

      expect(getByText("Latest Temp")).toBeTruthy();
      expect(queryByText("Latest Gravity")).toBeTruthy(); // Should still show if some entries have gravity
    });

    it("should handle missing temperature data", () => {
      const dataWithMissingTemp: FermentationEntry[] = [
        {
          id: "1",
          entry_date: "2024-01-01T12:00:00Z",
          gravity: 1.050,
        },
        {
          id: "2",
          entry_date: "2024-01-03T12:00:00Z",
          gravity: 1.030,
          temperature: 70,
        },
      ];

      const { getByText } = render(
        <FermentationChart fermentationData={dataWithMissingTemp} />
      );

      expect(getByText("Latest Gravity")).toBeTruthy();
      expect(getByText("Latest Temp")).toBeTruthy(); // Should show if some entries have temperature
    });
  });

  describe("Chart configuration", () => {
    it("should configure gravity axis correctly", () => {
      const { root } = render(
        <FermentationChart
          fermentationData={defaultFermentationData}
          actualOG={1.055}
        />
      );

      // Component should render without errors with OG provided
      expect(root).toBeTruthy();
    });

    it("should handle temperature axis configuration", () => {
      mockUnits.getTemperatureAxisConfig.mockReturnValue({
        minValue: 60,
        maxValue: 80,
      });

      const { root } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(mockUnits.getTemperatureAxisConfig).toHaveBeenCalledWith([68, 70, 69], 8);
      expect(root).toBeTruthy();
    });
  });

  describe("Chart types and rendering", () => {
    it("should render combined view when both data types exist", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("Combined View")).toBeTruthy();
    });

    it("should render separate charts when in separate view", () => {
      const { getByText, getAllByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      // Switch to separate view
      const toggleButton = getByText("Separate");
      fireEvent.press(toggleButton);

      // In separate view, we still have the legend showing "Specific Gravity" and "Temperature"
      // but also individual chart sections
      const specificGravityTexts = getAllByText("Specific Gravity");
      expect(specificGravityTexts.length).toBeGreaterThan(0); // Should appear in both legend and chart title
      
      const temperatureTexts = getAllByText("Temperature");
      expect(temperatureTexts.length).toBeGreaterThan(0); // Should appear in both legend and chart title
    });

    it("should handle gravity-only data", () => {
      const gravityOnlyData: FermentationEntry[] = [
        {
          id: "1",
          entry_date: "2024-01-01T12:00:00Z",
          gravity: 1.050,
        },
        {
          id: "2", 
          entry_date: "2024-01-03T12:00:00Z",
          gravity: 1.030,
        },
      ];

      const { getByText, queryByText } = render(
        <FermentationChart fermentationData={gravityOnlyData} />
      );

      expect(getByText("Latest Gravity")).toBeTruthy();
      expect(queryByText("Latest Temp")).toBeFalsy();
    });

    it("should handle temperature-only data", () => {
      const tempOnlyData: FermentationEntry[] = [
        {
          id: "1",
          entry_date: "2024-01-01T12:00:00Z",
          temperature: 68,
        },
        {
          id: "2",
          entry_date: "2024-01-03T12:00:00Z", 
          temperature: 70,
        },
      ];

      const { getByText, queryByText } = render(
        <FermentationChart fermentationData={tempOnlyData} />
      );

      expect(getByText("Latest Temp")).toBeTruthy();
      expect(queryByText("Latest Gravity")).toBeFalsy();
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle invalid date strings gracefully", () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const dataWithInvalidDates: FermentationEntry[] = [
        {
          id: "1",
          entry_date: "invalid-date",
          gravity: 1.050,
          temperature: 68,
        },
      ];

      const { getByText } = render(
        <FermentationChart fermentationData={dataWithInvalidDates} />
      );

      // Should still render, using fallback date
      expect(getByText("Latest Gravity")).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ [FermentationChart] No valid date found for entry:",
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it("should handle entries without any date fields", () => {
      const dataWithoutDates: FermentationEntry[] = [
        {
          id: "1",
          gravity: 1.050,
          temperature: 68,
        } as any, // Missing date fields
      ];

      const { getByText } = render(
        <FermentationChart fermentationData={dataWithoutDates} />
      );

      // Should still render with fallback behavior
      expect(getByText("Latest Gravity")).toBeTruthy();
    });

    it("should handle single data point", () => {
      const singlePoint: FermentationEntry[] = [
        {
          id: "1",
          entry_date: "2024-01-01T12:00:00Z",
          gravity: 1.050,
          temperature: 68,
        },
      ];

      const { getByText } = render(
        <FermentationChart fermentationData={singlePoint} />
      );

      expect(getByText("1 day")).toBeTruthy(); // Single day duration
      expect(getByText("1.050")).toBeTruthy(); // Gravity value
    });

    it("should handle very large datasets", () => {
      const largeDataset: FermentationEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `entry-${i}`,
        entry_date: new Date(2024, 0, i + 1).toISOString(),
        gravity: 1.050 - (i * 0.001),
        temperature: 68 + (i % 5),
      }));

      const { getByText } = render(
        <FermentationChart fermentationData={largeDataset} />
      );

      expect(getByText("Latest Gravity")).toBeTruthy();
      expect(getByText("50 days")).toBeTruthy();
    });
  });

  describe("Responsive behavior", () => {
    it("should handle different screen widths", () => {
      const mockDimensions = require("react-native").Dimensions;
      mockDimensions.get.mockReturnValue({ width: 320, height: 568 }); // Smaller screen

      const { root } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(root).toBeTruthy();
    });

    it("should handle larger screen sizes", () => {
      const mockDimensions = require("react-native").Dimensions;
      mockDimensions.get.mockReturnValue({ width: 768, height: 1024 }); // Tablet size

      const { root } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(root).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should provide meaningful labels and titles", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("Fermentation Progress")).toBeTruthy();
      expect(getByText("Latest Gravity")).toBeTruthy();
      expect(getByText("Latest Temp")).toBeTruthy();
      expect(getByText("Duration")).toBeTruthy();
    });

    it("should have accessible toggle button", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      const toggleButton = getByText("Separate");
      expect(toggleButton).toBeTruthy();
      
      // Should be pressable
      fireEvent.press(toggleButton);
      expect(getByText("Combined")).toBeTruthy();
    });
  });

  describe("Integration with external props", () => {
    it("should handle all optional props", () => {
      const { getByText } = render(
        <FermentationChart
          fermentationData={defaultFermentationData}
          expectedFG={1.012}
          actualOG={1.055}
          temperatureUnit="C"
        />
      );

      expect(getByText("Expected FG")).toBeTruthy();
      expect(getByText("1.012")).toBeTruthy();
      expect(getByText("69.0°C")).toBeTruthy(); // Temperature in Celsius (includes decimal)
    });

    it("should work with minimal props", () => {
      const { getByText } = render(
        <FermentationChart fermentationData={defaultFermentationData} />
      );

      expect(getByText("Fermentation Progress")).toBeTruthy();
      expect(getByText("Latest Gravity")).toBeTruthy();
    });
  });
});