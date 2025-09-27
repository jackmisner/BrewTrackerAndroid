/**
 * Utilities Tab Screen
 *
 * Central hub for brewing calculators and tools that provides quick access to
 * essential brewing utilities. Displays a grid of calculator cards with icons,
 * descriptions, and navigation to dedicated calculator screens.
 *
 * Features:
 * - Grid layout of brewing calculators and tools
 * - Visual cards with icons and descriptions
 * - Direct navigation to calculator screens
 * - Themed styling with color adaptation
 * - Touch-friendly card design (72px minimum height)
 * - Test ID support for automated testing
 *
 * Available Calculators:
 * - Unit Converter: Metric/imperial conversions
 * - ABV Calculator: Alcohol by volume calculations
 * - Strike Water: Mash water temperature calculation
 * - Hydrometer Correction: Temperature-adjusted gravity readings
 * - Dilution Calculator: Gravity and volume adjustments
 * - Boil Timer: Recipe-aware countdown with hop alarms
 *
 * @example
 * Navigation usage:
 * ```typescript
 * // Accessed via tab navigation
 * <Tabs.Screen name="utilities" component={UtilitiesScreen} />
 * ```
 */

import React from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { useRouter } from "expo-router";

/**
 * Calculator item configuration interface
 * @interface CalculatorItem
 * @property {string} id - Unique identifier for the calculator
 * @property {string} title - Display name of the calculator
 * @property {string} description - Brief description of calculator functionality
 * @property {keyof typeof MaterialIcons.glyphMap} icon - Material icon name
 * @property {string} route - Navigation route to the calculator screen
 */
interface CalculatorItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: string;
}

const calculators: CalculatorItem[] = [
  {
    id: "unit-converter",
    title: "Unit Converter",
    description: "Convert between metric and imperial units",
    icon: "swap-horiz",
    route: "/(modals)/(calculators)/unitConverter",
  },
  {
    id: "abv-calculator",
    title: "ABV Calculator",
    description: "Calculate alcohol by volume with simple/advanced formulas",
    icon: "local-bar",
    route: "/(modals)/(calculators)/abv",
  },
  {
    id: "strike-water",
    title: "Strike Water Calculator",
    description: "Calculate mash strike water temperature",
    icon: "thermostat",
    route: "/(modals)/(calculators)/strikeWater",
  },
  {
    id: "hydrometer-correction",
    title: "Hydrometer Correction",
    description: "Adjust gravity readings for temperature",
    icon: "tune",
    route: "/(modals)/(calculators)/hydrometerCorrection",
  },
  {
    id: "dilution",
    title: "Dilution Calculator",
    description: "Adjust gravity and volume calculations",
    icon: "water-drop",
    route: "/(modals)/(calculators)/dilution",
  },
  {
    id: "boil-timer",
    title: "Boil Timer",
    description: "Recipe-aware countdown with hop addition alarms",
    icon: "timer",
    route: "/(modals)/(calculators)/boilTimer",
  },
];

/**
 * Applies alpha transparency to color values
 * Supports both hex (#RRGGBB / #RRGGBBAA) and rgb()/rgba() color formats
 *
 * @param color - Color value in hex or rgb format
 * @param alpha - Alpha value between 0 and 1
 * @returns Color string with applied alpha transparency
 *
 * @example
 * ```typescript
 * withAlpha('#FF0000', 0.5) // Returns '#FF000080'
 * withAlpha('rgb(255, 0, 0)', 0.5) // Returns 'rgba(255, 0, 0, 0.5)'
 * ```
 */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    let rgb: string | null = null;

    if (hex.length === 3) {
      rgb = hex
        .split("")
        .map(ch => ch.repeat(2))
        .join("");
    } else if (hex.length === 4) {
      rgb = hex
        .slice(0, 3)
        .split("")
        .map(ch => ch.repeat(2))
        .join("");
    } else if (hex.length === 6 || hex.length === 8) {
      rgb = hex.slice(0, 6);
    }

    if (!rgb) {
      return color;
    }

    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${rgb}${a}`;
  }
  const m = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i
  );
  if (m) {
    return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  }
  return color; // fallback
}

export default function UtilitiesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const handleCalculatorPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Brewing Calculators
        </Text>
        <Text
          style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
        >
          Essential tools for brew day and recipe development
        </Text>
      </View>

      <View style={styles.calculatorGrid}>
        {calculators.map(calculator => (
          <TouchableOpacity
            key={calculator.id}
            style={[
              styles.calculatorCard,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.borderLight,
              },
            ]}
            onPress={() => handleCalculatorPress(calculator.route)}
            testID={`calculator-${calculator.id}`}
          >
            <View style={styles.calculatorContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: withAlpha(theme.colors.primary, 0.12) },
                ]}
              >
                <MaterialIcons
                  name={calculator.icon}
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[styles.calculatorTitle, { color: theme.colors.text }]}
                >
                  {calculator.title}
                </Text>
                <Text
                  style={[
                    styles.calculatorDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {calculator.description}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  calculatorGrid: {
    padding: 10,
  },
  calculatorCard: {
    margin: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  calculatorContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 72,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  calculatorDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
});
