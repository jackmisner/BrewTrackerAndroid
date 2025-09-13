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

    expect(styles.container.backgroundColor).toBe(mockTheme.colors.background);
    expect(styles.header.backgroundColor).toBe(mockTheme.colors.background);
    expect(styles.searchInput.color).toBe(mockTheme.colors.text);
  });

  it("should handle category chip selection states", () => {
    const styles = ingredientPickerStyles(mockTheme);

    expect(styles.categoryChip.backgroundColor).toBe(
      mockTheme.colors.inputBackground
    );
    expect(styles.categoryChipActive.backgroundColor).toBe(
      mockTheme.colors.primary
    );
    expect(styles.categoryChipText.color).toBe(mockTheme.colors.text);
    expect(styles.categoryChipTextActive.color).toBe(
      mockTheme.colors.primaryText
    );
  });

  it("should create unit button states", () => {
    const styles = ingredientPickerStyles(mockTheme);

    expect(styles.unitButton.backgroundColor).toBe(
      mockTheme.colors.inputBackground
    );
    expect(styles.unitButtonActive.backgroundColor).toBe(
      mockTheme.colors.primary
    );
    expect(styles.unitButtonText.color).toBe(mockTheme.colors.text);
    expect(styles.unitButtonTextActive.color).toBe(
      mockTheme.colors.primaryText
    );
  });

  it("should handle ingredient item styling", () => {
    const styles = ingredientPickerStyles(mockTheme);

    expect(styles.ingredientItem.backgroundColor).toBe(
      mockTheme.colors.backgroundSecondary
    );
    expect(styles.ingredientName.color).toBe(mockTheme.colors.text);
    expect(styles.ingredientDescription.color).toBe(
      mockTheme.colors.textSecondary
    );
  });
});
