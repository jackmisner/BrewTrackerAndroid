import { lightColors, darkColors, colors } from "@src/styles/common/colors";

const validateHexColor = (colorValue: string): boolean => {
  // Allow #rgb, #rrggbb, or named colors like 'white', 'black'
  const isHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue);
  const isNamedColor = ["#fff", "#ffffff", "#000", "#000000"].includes(
    colorValue
  );
  return isHex || isNamedColor;
};

describe("Color Constants", () => {
  describe("lightColors", () => {
    it("should have all required color properties", () => {
      expect(lightColors).toHaveProperty("primary");
      expect(lightColors).toHaveProperty("primaryText");
      expect(lightColors).toHaveProperty("errorBackground");
      expect(lightColors).toHaveProperty("successBackground");
      expect(lightColors).toHaveProperty("background");
      expect(lightColors).toHaveProperty("backgroundSecondary");
      expect(lightColors).toHaveProperty("text");
      expect(lightColors).toHaveProperty("textSecondary");
      expect(lightColors).toHaveProperty("textMuted");
      expect(lightColors).toHaveProperty("border");
      expect(lightColors).toHaveProperty("borderLight");
      expect(lightColors).toHaveProperty("error");
      expect(lightColors).toHaveProperty("success");
      expect(lightColors).toHaveProperty("warning");
      expect(lightColors).toHaveProperty("info");
      expect(lightColors).toHaveProperty("inputBackground");
      expect(lightColors).toHaveProperty("shadow");
      expect(lightColors).toHaveProperty("gravityLine");
      expect(lightColors).toHaveProperty("temperatureLine");
    });

    it("should have valid hex color values", () => {
      Object.entries(lightColors).forEach(([key, color]) => {
        expect(validateHexColor(color)).toBe(true);
      });
    });

    it("should have consistent primary brand color", () => {
      expect(lightColors.primary).toBe("#f4511e");
    });

    it("should have light theme appropriate background colors", () => {
      expect(lightColors.background).toBe("#fff");
      expect(lightColors.backgroundSecondary).toBe("#f9f9f9");
      expect(lightColors.inputBackground).toBe("#f9f9f9");
    });

    it("should have light theme appropriate text colors", () => {
      expect(lightColors.text).toBe("#333");
      expect(lightColors.textSecondary).toBe("#666");
      expect(lightColors.textMuted).toBe("#999");
    });

    it("should have accessible border colors", () => {
      expect(lightColors.border).toBe("#ddd");
      expect(lightColors.borderLight).toBe("#e0e0e0");
    });

    it("should have meaningful status colors", () => {
      expect(lightColors.error).toBe("#ff4444");
      expect(lightColors.success).toBe("#4caf50");
      expect(lightColors.warning).toBe("#ff9800");
      expect(lightColors.info).toBe("#2196f3");
    });

    it("should have chart-specific colors", () => {
      expect(lightColors.gravityLine).toBe("#4A90E2");
      expect(lightColors.temperatureLine).toBe("#FF6B35");
    });
  });

  describe("darkColors", () => {
    it("should have all required color properties", () => {
      expect(darkColors).toHaveProperty("primary");
      expect(darkColors).toHaveProperty("primaryText");
      expect(darkColors).toHaveProperty("errorBackground");
      expect(darkColors).toHaveProperty("successBackground");
      expect(darkColors).toHaveProperty("background");
      expect(darkColors).toHaveProperty("backgroundSecondary");
      expect(darkColors).toHaveProperty("text");
      expect(darkColors).toHaveProperty("textSecondary");
      expect(darkColors).toHaveProperty("textMuted");
      expect(darkColors).toHaveProperty("border");
      expect(darkColors).toHaveProperty("borderLight");
      expect(darkColors).toHaveProperty("error");
      expect(darkColors).toHaveProperty("success");
      expect(darkColors).toHaveProperty("warning");
      expect(darkColors).toHaveProperty("info");
      expect(darkColors).toHaveProperty("inputBackground");
      expect(darkColors).toHaveProperty("shadow");
      expect(darkColors).toHaveProperty("gravityLine");
      expect(darkColors).toHaveProperty("temperatureLine");
    });

    it("should maintain consistent primary brand color with light theme", () => {
      expect(darkColors.primary).toBe("#f4511e");
      expect(darkColors.primary).toBe(lightColors.primary);
    });

    it("should have dark theme appropriate background colors", () => {
      expect(darkColors.background).toBe("#121212");
      expect(darkColors.backgroundSecondary).toBe("#1e1e1e");
      expect(darkColors.inputBackground).toBe("#242424");
    });

    it("should have dark theme appropriate text colors", () => {
      expect(darkColors.text).toBe("#ffffff");
      expect(darkColors.textSecondary).toBe("#cccccc");
      expect(darkColors.textMuted).toBe("#999999");
    });

    it("should have dark theme appropriate border colors", () => {
      expect(darkColors.border).toBe("#333333");
      expect(darkColors.borderLight).toBe("#444444");
    });

    it("should have adjusted status colors for dark theme", () => {
      expect(darkColors.error).toBe("#ff6b6b");
      expect(darkColors.success).toBe("#51cf66");
      expect(darkColors.warning).toBe("#ffa726");
      expect(darkColors.info).toBe("#42a5f5");
    });

    it("should maintain same chart colors across themes", () => {
      expect(darkColors.gravityLine).toBe("#4A90E2");
      expect(darkColors.temperatureLine).toBe("#FF6B35");
      expect(darkColors.gravityLine).toBe(lightColors.gravityLine);
      expect(darkColors.temperatureLine).toBe(lightColors.temperatureLine);
    });
  });

  describe("Color accessibility", () => {
    it("should have sufficient contrast between light theme text and background", () => {
      // These are basic contrast checks - in real apps you'd use a contrast ratio calculator
      expect(lightColors.text).not.toBe(lightColors.background);
      expect(lightColors.textSecondary).not.toBe(lightColors.background);
      expect(lightColors.textMuted).not.toBe(lightColors.background);
    });

    it("should have sufficient contrast between dark theme text and background", () => {
      expect(darkColors.text).not.toBe(darkColors.background);
      expect(darkColors.textSecondary).not.toBe(darkColors.background);
      expect(darkColors.textMuted).not.toBe(darkColors.background);
    });

    it("should have distinct error colors from success colors", () => {
      expect(lightColors.error).not.toBe(lightColors.success);
      expect(darkColors.error).not.toBe(darkColors.success);
    });

    it("should have distinct border colors from background colors", () => {
      expect(lightColors.border).not.toBe(lightColors.background);
      expect(lightColors.borderLight).not.toBe(lightColors.background);
      expect(darkColors.border).not.toBe(darkColors.background);
      expect(darkColors.borderLight).not.toBe(darkColors.background);
    });
  });

  describe("Theme consistency", () => {
    it("should have same structure between light and dark themes", () => {
      const lightKeys = Object.keys(lightColors);
      const darkKeys = Object.keys(darkColors);

      expect(lightKeys.sort()).toEqual(darkKeys.sort());
    });

    it("should maintain brand consistency across themes", () => {
      expect(lightColors.primary).toBe(darkColors.primary);
      expect(lightColors.primaryText).toBe(darkColors.primaryText);
    });

    it("should have functional chart colors across themes", () => {
      expect(lightColors.gravityLine).toBe(darkColors.gravityLine);
      expect(lightColors.temperatureLine).toBe(darkColors.temperatureLine);
    });
  });

  describe("Legacy export", () => {
    it("should export colors as lightColors for backward compatibility", () => {
      expect(colors).toBe(lightColors);
    });

    it("should have all properties from lightColors", () => {
      expect(Object.keys(colors)).toEqual(Object.keys(lightColors));
    });
  });

  describe("Color validation", () => {
    it("should have all colors as strings", () => {
      Object.values(lightColors).forEach(color => {
        expect(typeof color).toBe("string");
      });

      Object.values(darkColors).forEach(color => {
        expect(typeof color).toBe("string");
      });
    });

    it("should not have empty color values", () => {
      Object.values(lightColors).forEach(color => {
        expect(color).toBeTruthy();
        expect(color.length).toBeGreaterThan(0);
      });

      Object.values(darkColors).forEach(color => {
        expect(color).toBeTruthy();
        expect(color.length).toBeGreaterThan(0);
      });
    });

    it("should have properly formatted hex colors", () => {
      Object.entries(lightColors).forEach(([key, color]) => {
        expect(validateHexColor(color)).toBe(true);
      });

      Object.entries(darkColors).forEach(([key, color]) => {
        expect(validateHexColor(color)).toBe(true);
      });
    });
  });

  describe("Color semantics", () => {
    it("should have meaningful color names", () => {
      // Test that color names match their semantic purpose
      expect(lightColors.error).toMatch(/#ff/i); // Should be reddish
      expect(lightColors.success).toMatch(/#4c|#5/i); // Should be greenish
      expect(lightColors.warning).toMatch(/#ff9/i); // Should be orangish
      expect(lightColors.info).toMatch(/#21/i); // Should be blueish
    });

    it("should have consistent semantic colors across themes", () => {
      // Error colors should both be reddish but appropriate for their theme
      expect(lightColors.error).toMatch(/#ff/i);
      expect(darkColors.error).toMatch(/#ff/i);

      // Success colors should both be greenish
      expect(lightColors.success).toMatch(/#4c|#5/i);
      expect(darkColors.success).toMatch(/#51/i);
    });
  });
});
