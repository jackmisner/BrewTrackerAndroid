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

    expect(styles.container.marginVertical).toBe(16);
    expect(styles.metricsGrid.gap).toBe(12);
    expect(styles.metricCard.borderRadius).toBe(8);
    expect(styles.metricCard.padding).toBe(16);
  });

  it("should create compact styles when compact is true", () => {
    const styles = brewingMetricsStyles(mockTheme, true);

    expect(styles.container.marginVertical).toBe(8);
    expect(styles.metricsGrid.gap).toBe(8);
    expect(styles.metricCard.borderRadius).toBe(6);
    expect(styles.metricCard.padding).toBe(12);
  });

  it("should apply theme colors correctly", () => {
    const styles = brewingMetricsStyles(mockTheme);

    expect(styles.metricCard.backgroundColor).toBe(
      mockTheme.colors.inputBackground
    );
    expect(styles.metricLabel.color).toBe(mockTheme.colors.textSecondary);
    expect(styles.metricValue.color).toBe(mockTheme.colors.text);
    expect(styles.errorText.color).toBe(mockTheme.colors.error);
  });

  it("should handle SRM color indicator sizing", () => {
    const normalStyles = brewingMetricsStyles(mockTheme, false);
    const compactStyles = brewingMetricsStyles(mockTheme, true);

    expect(normalStyles.srmColorIndicator.width).toBe(24);
    expect(normalStyles.srmColorIndicator.height).toBe(24);
    expect(compactStyles.srmColorIndicator.width).toBe(20);
    expect(compactStyles.srmColorIndicator.height).toBe(20);
  });
});
