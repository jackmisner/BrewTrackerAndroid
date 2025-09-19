import { StyleSheet } from "react-native";
import { createBrewSessionStyles } from "../../../../src/styles/modals/createBrewSessionStyles";

const mockTheme = {
  theme: "light" as const,
  isDark: false,
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  colors: {
    background: "#FFFFFF",
    border: "#E0E0E0",
    shadow: "#000000",
    text: "#000000",
    textSecondary: "#666666",
    primary: "#007AFF",
    primaryText: "#FFFFFF",
    warning: "#FF9500",
    backgroundSecondary: "#F2F2F7",
    error: "#F44336",
  },
} as any;

describe("createBrewSessionStyles", () => {
  it("should create styles with theme colors", () => {
    const styles = createBrewSessionStyles(mockTheme);
    const container = StyleSheet.flatten(styles.container);
    const header = StyleSheet.flatten(styles.header);
    const headerTitle = StyleSheet.flatten(styles.headerTitle);
    const saveButton = StyleSheet.flatten(styles.saveButton);

    expect(container.backgroundColor).toBe(mockTheme.colors.background);
    expect(header.backgroundColor).toBe(mockTheme.colors.background);
    expect(headerTitle.color).toBe(mockTheme.colors.text);
    expect(saveButton.backgroundColor).toBe(mockTheme.colors.primary);
  });

  it("should handle header styling with borders and shadows", () => {
    const styles = createBrewSessionStyles(mockTheme);
    const header = StyleSheet.flatten(styles.header);

    expect(header.borderBottomColor).toBe(mockTheme.colors.border);
    expect(header.shadowColor).toBe(mockTheme.colors.shadow);
    expect(header.elevation).toBe(2);
  });

  it("should create unit button styles with selection state", () => {
    const styles = createBrewSessionStyles(mockTheme);
    const unitButton = StyleSheet.flatten(styles.unitButton);
    const unitButtonSelected = StyleSheet.flatten(styles.unitButtonSelected);
    const unitButtonText = StyleSheet.flatten(styles.unitButtonText);
    const unitButtonTextSelected = StyleSheet.flatten(
      styles.unitButtonTextSelected
    );

    expect(unitButton.backgroundColor).toBe(
      mockTheme.colors.backgroundSecondary
    );
    expect(unitButtonSelected.backgroundColor).toBe(mockTheme.colors.primary);
    expect(unitButtonText.color).toBe(mockTheme.colors.text);
    expect(unitButtonTextSelected.color).toBe(mockTheme.colors.primaryText);
  });

  it("should handle error and loading states", () => {
    const styles = createBrewSessionStyles(mockTheme);
    const errorText = StyleSheet.flatten(styles.errorText);
    const loadingText = StyleSheet.flatten(styles.loadingText);
    const retryButton = StyleSheet.flatten(styles.retryButton);

    expect(errorText.color).toBe(mockTheme.colors.error);
    expect(loadingText.color).toBe(mockTheme.colors.textSecondary);
    expect(retryButton.backgroundColor).toBe(mockTheme.colors.primary);
  });
});
