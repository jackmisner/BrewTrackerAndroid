import { StyleSheet } from "react-native";
import { ingredientPickerStyles } from "../../../../src/styles/modals/ingredientPickerStyles";

const mockTheme = {
  theme: "light" as const,
  isDark: false,
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  colors: {
    background: "#FFFFFF",
    border: "#E0E0E0",
    text: "#000000",
    textSecondary: "#666666",
    textMuted: "#999999",
    primary: "#007AFF",
    primaryText: "#FFFFFF",
    inputBackground: "#F2F2F7",
    backgroundSecondary: "#F8F8F8",
    borderLight: "#E8E8E8",
  },
} as any;

describe("ingredientPickerStyles", () => {
  it("should create styles with theme colors", () => {
    const styles = ingredientPickerStyles(mockTheme);
    const container = StyleSheet.flatten(styles.container);
    const header = StyleSheet.flatten(styles.header);
    const searchInput = StyleSheet.flatten(styles.searchInput);

    expect(container.backgroundColor).toBe(mockTheme.colors.background);
    expect(header.backgroundColor).toBe(mockTheme.colors.background);
    expect(searchInput.color).toBe(mockTheme.colors.text);
  });

  it("should handle category chip selection states", () => {
    const styles = ingredientPickerStyles(mockTheme);
    const categoryChip = StyleSheet.flatten(styles.categoryChip);
    const categoryChipActive = StyleSheet.flatten(styles.categoryChipActive);
    const categoryChipText = StyleSheet.flatten(styles.categoryChipText);
    const categoryChipTextActive = StyleSheet.flatten(
      styles.categoryChipTextActive
    );

    expect(categoryChip.backgroundColor).toBe(mockTheme.colors.inputBackground);
    expect(categoryChipActive.backgroundColor).toBe(mockTheme.colors.primary);
    expect(categoryChipText.color).toBe(mockTheme.colors.text);
    expect(categoryChipTextActive.color).toBe(mockTheme.colors.primaryText);
  });

  it("should create unit button states", () => {
    const styles = ingredientPickerStyles(mockTheme);
    const unitButton = StyleSheet.flatten(styles.unitButton);
    const unitButtonActive = StyleSheet.flatten(styles.unitButtonActive);
    const unitButtonText = StyleSheet.flatten(styles.unitButtonText);
    const unitButtonTextActive = StyleSheet.flatten(
      styles.unitButtonTextActive
    );

    expect(unitButton.backgroundColor).toBe(mockTheme.colors.inputBackground);
    expect(unitButtonActive.backgroundColor).toBe(mockTheme.colors.primary);
    expect(unitButtonText.color).toBe(mockTheme.colors.text);
    expect(unitButtonTextActive.color).toBe(mockTheme.colors.primaryText);
  });

  it("should handle ingredient item styling", () => {
    const styles = ingredientPickerStyles(mockTheme);
    const ingredientItem = StyleSheet.flatten(styles.ingredientItem);
    const ingredientName = StyleSheet.flatten(styles.ingredientName);
    const ingredientDescription = StyleSheet.flatten(
      styles.ingredientDescription
    );

    expect(ingredientItem.backgroundColor).toBe(
      mockTheme.colors.backgroundSecondary
    );
    expect(ingredientName.color).toBe(mockTheme.colors.text);
    expect(ingredientDescription.color).toBe(mockTheme.colors.textSecondary);
  });
});
