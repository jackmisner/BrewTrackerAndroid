import React, { useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useCalculators } from "@contexts/CalculatorsContext";
import { ABVCalculator } from "@services/calculators/ABVCalculator";
import { CalculatorCard } from "@components/calculators/CalculatorCard";
import { CalculatorHeader } from "@components/calculators/CalculatorHeader";
import { NumberInput } from "@components/calculators/NumberInput";
import { UnitToggle, DropdownToggle } from "@components/calculators/UnitToggle";
import {
  ResultDisplay,
  SingleResult,
} from "@components/calculators/ResultDisplay";
import { useTheme } from "@contexts/ThemeContext";

const FORMULA_OPTIONS = [
  {
    label: "Simple",
    value: "simple" as const,
    description: "Standard formula (OG - FG) × 131.25",
  },
  {
    label: "Advanced",
    value: "advanced" as const,
    description: "More accurate formula for higher gravities",
  },
];

const UNIT_TYPE_OPTIONS = [
  {
    label: "SG",
    value: "sg" as const,
    description: "Specific Gravity (1.050)",
  },
  { label: "°P", value: "plato" as const, description: "Degrees Plato" },
  { label: "°Bx", value: "brix" as const, description: "Degrees Brix" },
];

export default function ABVCalculatorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useCalculators();
  const { abv } = state;

  const calculateABV = useCallback(() => {
    if (
      !abv.originalGravity ||
      !abv.finalGravity ||
      abv.originalGravity === "" ||
      abv.finalGravity === ""
    ) {
      dispatch({
        type: "SET_ABV",
        payload: { result: null },
      });
      return;
    }

    const og = parseFloat(abv.originalGravity);
    const fg = parseFloat(abv.finalGravity);

    if (isNaN(og) || isNaN(fg)) {
      dispatch({
        type: "SET_ABV",
        payload: { result: null },
      });
      return;
    }

    try {
      const result = ABVCalculator.calculate(
        og,
        fg,
        abv.unitType,
        abv.unitType,
        abv.formula
      );

      dispatch({
        type: "SET_ABV",
        payload: { result: result.abv },
      });

      // Add to history
      dispatch({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "abv",
          inputs: {
            originalGravity: og,
            finalGravity: fg,
            formula: abv.formula,
            unitType: abv.unitType,
          },
          result: {
            abv: result.abv,
            attenuation: result.attenuation,
            calories: result.calories,
          },
        },
      });
    } catch (error) {
      console.warn("ABV calculation error:", error);
      dispatch({
        type: "SET_ABV",
        payload: { result: null },
      });
    }
  }, [
    abv.originalGravity,
    abv.finalGravity,
    abv.formula,
    abv.unitType,
    dispatch,
  ]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateABV();
  }, [calculateABV]);

  const handleOGChange = (value: string) => {
    dispatch({
      type: "SET_ABV",
      payload: { originalGravity: value },
    });
  };

  const handleFGChange = (value: string) => {
    dispatch({
      type: "SET_ABV",
      payload: { finalGravity: value },
    });
  };

  const handleFormulaChange = (formula: string) => {
    dispatch({
      type: "SET_ABV",
      payload: { formula: formula as typeof abv.formula },
    });
  };

  const handleUnitTypeChange = (unitType: string) => {
    dispatch({
      type: "SET_ABV",
      payload: { unitType: unitType as typeof abv.unitType },
    });
  };

  const getPlaceholderText = () => {
    switch (abv.unitType) {
      case "sg":
        return "1.050";
      case "plato":
        return "12.5";
      case "brix":
        return "12.5";
      default:
        return "1.050";
    }
  };

  const getUnitLabel = () => {
    switch (abv.unitType) {
      case "sg":
        return "";
      case "plato":
        return "°P";
      case "brix":
        return "°Bx";
      default:
        return "";
    }
  };

  // Calculate additional metrics if we have a result
  const additionalResults = React.useMemo(() => {
    if (abv.result === null || !abv.originalGravity || !abv.finalGravity) {
      return null;
    }

    const og = parseFloat(abv.originalGravity);
    const fg = parseFloat(abv.finalGravity);

    if (isNaN(og) || isNaN(fg)) return null;

    try {
      const fullResult = ABVCalculator.calculate(
        og,
        fg,
        abv.unitType,
        abv.unitType,
        abv.formula
      );

      return [
        {
          label: "Attenuation",
          value: fullResult.attenuation,
          unit: "%",
          icon: "trending-down" as const,
          precision: 1,
        },
        {
          label: "Calories (12oz)",
          value: fullResult.calories,
          unit: "cal",
          icon: "local-fire-department" as const,
          precision: 0,
        },
      ];
    } catch {
      return null;
    }
  }, [
    abv.result,
    abv.originalGravity,
    abv.finalGravity,
    abv.unitType,
    abv.formula,
  ]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <CalculatorHeader title="ABV Calculator" />

      <ScrollView style={styles.scrollContent}>
        <CalculatorCard title="Settings">
          <DropdownToggle
            label="Formula"
            value={abv.formula}
            options={FORMULA_OPTIONS}
            onChange={handleFormulaChange}
          />

          <UnitToggle
            label="Unit Type"
            value={abv.unitType}
            options={UNIT_TYPE_OPTIONS}
            onChange={handleUnitTypeChange}
          />
        </CalculatorCard>

        <CalculatorCard title="Gravity Readings">
          <NumberInput
            label="Original Gravity"
            value={abv.originalGravity}
            onChangeText={handleOGChange}
            placeholder={`e.g., ${getPlaceholderText()}`}
            unit={getUnitLabel()}
            min={abv.unitType === "sg" ? 1.02 : 5}
            max={abv.unitType === "sg" ? 1.15 : 35}
            step={abv.unitType === "sg" ? 0.001 : 0.1}
            precision={abv.unitType === "sg" ? 3 : 1}
            testID="abv-og-input"
          />

          <NumberInput
            label="Final Gravity"
            value={abv.finalGravity}
            onChangeText={handleFGChange}
            placeholder={`e.g., ${abv.unitType === "sg" ? "1.010" : "2.5"}`}
            unit={getUnitLabel()}
            min={abv.unitType === "sg" ? 1.0 : 0}
            max={abv.unitType === "sg" ? 1.05 : 15}
            step={abv.unitType === "sg" ? 0.001 : 0.1}
            precision={abv.unitType === "sg" ? 3 : 1}
            testID="abv-fg-input"
          />
        </CalculatorCard>

        {abv.result !== null && (
          <>
            <SingleResult
              label="Alcohol By Volume"
              value={abv.result}
              unit="% ABV"
              icon="local-bar"
              size="large"
              precision={1}
            />

            {additionalResults && (
              <ResultDisplay
                title="Additional Metrics"
                results={additionalResults}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
});
