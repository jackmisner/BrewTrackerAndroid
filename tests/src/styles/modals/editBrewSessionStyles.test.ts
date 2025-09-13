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

    expect(styles.container.backgroundColor).toBe(mockTheme.colors.background);
    expect(styles.header.backgroundColor).toBe(mockTheme.colors.background);
    expect(styles.saveButton.backgroundColor).toBe(mockTheme.colors.primary);
  });

  it("should handle status option selection states", () => {
    const styles = editBrewSessionStyles(mockTheme);

    expect(styles.statusOption.backgroundColor).toBe(
      mockTheme.colors.backgroundSecondary
    );
    expect(styles.statusOptionSelected.backgroundColor).toBe(
      mockTheme.colors.primary
    );
    expect(styles.statusOptionText.color).toBe(mockTheme.colors.text);
    expect(styles.statusOptionTextSelected.color).toBe(
      mockTheme.colors.primaryText
    );
  });

  it("should create measurement row layout", () => {
    const styles = editBrewSessionStyles(mockTheme);

    expect(styles.measurementRow.flexDirection).toBe("row");
    expect(styles.measurementRow.gap).toBe(16);
    expect(styles.measurementGroup.flex).toBe(1);
  });
});
