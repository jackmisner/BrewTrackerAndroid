import { StyleSheet } from "react-native";
import { editBrewSessionStyles } from "../../../../src/styles/modals/editBrewSessionStyles";

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
    backgroundSecondary: "#F2F2F7",
    error: "#F44336",
  },
} as any;

describe("editBrewSessionStyles", () => {
  it("should create styles with theme colors", () => {
    const styles = editBrewSessionStyles(mockTheme);
    const container = StyleSheet.flatten(styles.container);
    const header = StyleSheet.flatten(styles.header);
    const saveButton = StyleSheet.flatten(styles.saveButton);

    expect(container.backgroundColor).toBe(mockTheme.colors.background);
    expect(header.backgroundColor).toBe(mockTheme.colors.background);
    expect(saveButton.backgroundColor).toBe(mockTheme.colors.primary);
  });

  it("should handle status option selection states", () => {
    const styles = editBrewSessionStyles(mockTheme);
    const statusOption = StyleSheet.flatten(styles.statusOption);
    const statusOptionSelected = StyleSheet.flatten(
      styles.statusOptionSelected
    );
    const statusOptionText = StyleSheet.flatten(styles.statusOptionText);
    const statusOptionTextSelected = StyleSheet.flatten(
      styles.statusOptionTextSelected
    );

    expect(statusOption.backgroundColor).toBe(
      mockTheme.colors.backgroundSecondary
    );
    expect(statusOptionSelected.backgroundColor).toBe(mockTheme.colors.primary);
    expect(statusOptionText.color).toBe(mockTheme.colors.text);
    expect(statusOptionTextSelected.color).toBe(mockTheme.colors.primaryText);
  });

  it("should create measurement row layout", () => {
    const styles = editBrewSessionStyles(mockTheme);
    const measurementRow = StyleSheet.flatten(styles.measurementRow);
    const measurementGroup = StyleSheet.flatten(styles.measurementGroup);

    expect(measurementRow.flexDirection).toBe("row");
    expect(measurementRow.gap).toBe(16);
    expect(measurementGroup.flex).toBe(1);
  });
});
