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

    expect(styles.container.backgroundColor).toBe(mockTheme.colors.background);
    expect(styles.header.backgroundColor).toBe(mockTheme.colors.background);
    expect(styles.headerTitle.color).toBe(mockTheme.colors.text);
    expect(styles.saveButton.backgroundColor).toBe(mockTheme.colors.primary);
  });

  it("should handle header styling with borders and shadows", () => {
    const styles = createBrewSessionStyles(mockTheme);

    expect(styles.header.borderBottomColor).toBe(mockTheme.colors.border);
    expect(styles.header.shadowColor).toBe(mockTheme.colors.shadow);
    expect(styles.header.elevation).toBe(2);
  });

  it("should create unit button styles with selection state", () => {
    const styles = createBrewSessionStyles(mockTheme);

    expect(styles.unitButton.backgroundColor).toBe(
      mockTheme.colors.backgroundSecondary
    );
    expect(styles.unitButtonSelected.backgroundColor).toBe(
      mockTheme.colors.primary
    );
    expect(styles.unitButtonText.color).toBe(mockTheme.colors.text);
    expect(styles.unitButtonTextSelected.color).toBe(
      mockTheme.colors.primaryText
    );
  });

  it("should handle error and loading states", () => {
    const styles = createBrewSessionStyles(mockTheme);

    expect(styles.errorText.color).toBe(mockTheme.colors.error);
    expect(styles.loadingText.color).toBe(mockTheme.colors.textSecondary);
    expect(styles.retryButton.backgroundColor).toBe(mockTheme.colors.primary);
  });
});
