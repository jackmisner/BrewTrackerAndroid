import { StyleSheet } from "react-native";
import { brewingMetricsStyles } from "../../../../src/styles/components/brewingMetricsStyles";

const mockTheme = {
  theme: "light" as const,
  isDark: false,
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  colors: {
    inputBackground: "#FFFFFF",
    shadow: "#000000",
    textSecondary: "#666666",
    text: "#000000",
    textMuted: "#999999",
    border: "#E0E0E0",
    error: "#F44336",
    background: "#FFFFFF",
  },
} as any;

describe("brewingMetricsStyles", () => {
  it("should create styles with default compact false", () => {
    const styles = brewingMetricsStyles(mockTheme);
    const container = StyleSheet.flatten(styles.container);
    const metricsGrid = StyleSheet.flatten(styles.metricsGrid);
    const metricCard = StyleSheet.flatten(styles.metricCard);

    expect(container.marginVertical).toBe(16);
    expect(metricsGrid.gap).toBe(12);
    expect(metricCard.borderRadius).toBe(8);
    expect(metricCard.padding).toBe(16);
  });

  it("should create compact styles when compact is true", () => {
    const styles = brewingMetricsStyles(mockTheme, true);
    const container = StyleSheet.flatten(styles.container);
    const metricsGrid = StyleSheet.flatten(styles.metricsGrid);
    const metricCard = StyleSheet.flatten(styles.metricCard);

    expect(container.marginVertical).toBe(8);
    expect(metricsGrid.gap).toBe(8);
    expect(metricCard.borderRadius).toBe(6);
    expect(metricCard.padding).toBe(12);
  });

  it("should apply theme colors correctly", () => {
    const styles = brewingMetricsStyles(mockTheme);
    const metricCard = StyleSheet.flatten(styles.metricCard);
    const metricLabel = StyleSheet.flatten(styles.metricLabel);
    const metricValue = StyleSheet.flatten(styles.metricValue);
    const errorText = StyleSheet.flatten(styles.errorText);

    expect(metricCard.backgroundColor).toBe(mockTheme.colors.inputBackground);
    expect(metricLabel.color).toBe(mockTheme.colors.textSecondary);
    expect(metricValue.color).toBe(mockTheme.colors.text);
    expect(errorText.color).toBe(mockTheme.colors.error);
  });

  it("should handle SRM color indicator sizing", () => {
    const normalStyles = brewingMetricsStyles(mockTheme, false);
    const compactStyles = brewingMetricsStyles(mockTheme, true);
    const normalIndicator = StyleSheet.flatten(normalStyles.srmColorIndicator);
    const compactIndicator = StyleSheet.flatten(
      compactStyles.srmColorIndicator
    );

    expect(normalIndicator.width).toBe(24);
    expect(normalIndicator.height).toBe(24);
    expect(compactIndicator.width).toBe(20);
    expect(compactIndicator.height).toBe(20);
  });
});
