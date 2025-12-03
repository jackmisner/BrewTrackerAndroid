/**
 * Strike Water Calculator Screen
 *
 * Mash strike water temperature calculator that determines the correct
 * water temperature needed to achieve target mash temperature when
 * combined with grain. Essential for all-grain brewing processes.
 *
 * Features:
 * - Grain weight input with multiple unit support (lb, kg, oz)
 * - Target mash temperature with °F/°C conversion
 * - Grain temperature input for accuracy
 * - Water-to-grain ratio selection with presets
 * - Real-time strike temperature calculation
 * - Mash thermal mass calculations
 * - Input validation with brewing-appropriate ranges
 * - Themed calculator card layout
 * - Modal header with navigation
 * - Auto-calculation on input changes
 * - State management via CalculatorsContext
 *
 * Calculations:
 * - Strike temp = (Target temp - (Grain temp × 0.4)) / (1 - 0.4)
 * - Accounts for thermal mass of grain and mash tun
 * - Water ratio affects heat transfer efficiency
 * - Typical ranges: Strike temp 165-212°F, target mash 148-158°F
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(calculators)/strikeWater');
 * ```
 */

import React, { useEffect, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { useCalculators } from "@contexts/CalculatorsContext";
import { StrikeWaterCalculator } from "@services/calculators/StrikeWaterCalculator";
import { CalculatorCard } from "@components/calculators/CalculatorCard";
import { ModalHeader } from "@src/components/ui/ModalHeader";
import { NumberInput } from "@components/calculators/NumberInput";
import { UnitToggle, DropdownToggle } from "@components/calculators/UnitToggle";
import {
  ResultDisplay,
  SingleResult,
} from "@components/calculators/ResultDisplay";
import { useTheme } from "@contexts/ThemeContext";
import { UnitConverter } from "@/src/services/calculators/UnitConverter";
import { calculatorScreenStyles } from "@styles/modals/calculators/calculatorScreenStyles";
import { TemperatureUnit } from "@/src/types/common";

/**
 * Temperature unit options for the calculator
 */
const TEMP_UNIT_OPTIONS = [
  { label: "°F", value: "F" as const, description: "Fahrenheit" },
  { label: "°C", value: "C" as const, description: "Celsius" },
];

/**
 * Weight unit options for grain measurement
 */
const WEIGHT_UNIT_OPTIONS = [
  { label: "lb", value: "lb", description: "Pounds" },
  { label: "kg", value: "kg", description: "Kilograms" },
  { label: "oz", value: "oz", description: "Ounces" },
];

/**
 * Common water-to-grain ratio presets for mashing
 */
const WATER_RATIOS = [
  { label: "1.0 qt/lb", value: "1.0", description: "Thick mash" },
  {
    label: "1.25 qt/lb",
    value: "1.25",
    description: "Medium mash (recommended)",
  },
  { label: "1.5 qt/lb", value: "1.5", description: "Thin mash" },
  { label: "2.0 qt/lb", value: "2.0", description: "Very thin mash" },
];

export default function StrikeWaterCalculatorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useCalculators();
  const { strikeWater } = state;

  const calculateStrikeWater = useCallback(() => {
    if (
      !strikeWater.grainWeight ||
      !strikeWater.grainTemp ||
      !strikeWater.targetMashTemp ||
      !strikeWater.waterToGrainRatio
    ) {
      dispatch({
        type: "SET_STRIKE_WATER",
        payload: { result: null },
      });
      return;
    }

    const grainWeight = parseFloat(strikeWater.grainWeight);
    const grainTemp = parseFloat(strikeWater.grainTemp);
    const targetTemp = parseFloat(strikeWater.targetMashTemp);
    const ratio = parseFloat(strikeWater.waterToGrainRatio);

    if (
      isNaN(grainWeight) ||
      isNaN(grainTemp) ||
      isNaN(targetTemp) ||
      isNaN(ratio) ||
      grainWeight <= 0 ||
      grainTemp <= 0 ||
      targetTemp <= 0 ||
      ratio <= 0
    ) {
      dispatch({
        type: "SET_STRIKE_WATER",
        payload: { result: null },
      });
      return;
    }

    try {
      // Validate inputs
      StrikeWaterCalculator.validateInputs(
        grainWeight,
        grainTemp,
        targetTemp,
        ratio,
        strikeWater.tempUnit
      );

      const result = StrikeWaterCalculator.calculateStrikeWater(
        grainWeight,
        strikeWater.grainWeightUnit,
        grainTemp,
        targetTemp,
        ratio,
        strikeWater.tempUnit
      );

      dispatch({
        type: "SET_STRIKE_WATER",
        payload: { result },
      });

      // Add to history
      dispatch({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "strikeWater",
          inputs: {
            grainWeight,
            grainWeightUnit: strikeWater.grainWeightUnit,
            grainTemp,
            targetMashTemp: targetTemp,
            tempUnit: strikeWater.tempUnit,
            waterToGrainRatio: ratio,
          },
          result: {
            strikeTemp: result.strikeTemp,
            waterVolume: result.waterVolume,
          },
        },
      });
    } catch (error) {
      console.warn("Strike water calculation error:", error);
      dispatch({
        type: "SET_STRIKE_WATER",
        payload: { result: null },
      });
    }
  }, [
    strikeWater.grainWeight,
    strikeWater.grainTemp,
    strikeWater.targetMashTemp,
    strikeWater.waterToGrainRatio,
    strikeWater.tempUnit,
    strikeWater.grainWeightUnit,
    dispatch,
  ]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateStrikeWater();
  }, [calculateStrikeWater]);

  const handleGrainWeightChange = (value: string) => {
    dispatch({
      type: "SET_STRIKE_WATER",
      payload: { grainWeight: value },
    });
  };

  const handleGrainTempChange = (value: string) => {
    dispatch({
      type: "SET_STRIKE_WATER",
      payload: { grainTemp: value },
    });
  };

  const handleTargetTempChange = (value: string) => {
    dispatch({
      type: "SET_STRIKE_WATER",
      payload: { targetMashTemp: value },
    });
  };

  const handleRatioChange = (ratio: string) => {
    dispatch({
      type: "SET_STRIKE_WATER",
      payload: { waterToGrainRatio: ratio },
    });
  };

  const handleTempUnitChange = (tempUnit: string) => {
    const fromUnit = strikeWater.tempUnit as TemperatureUnit;
    const toUnit = tempUnit as TemperatureUnit;

    const convert = (v?: string) => {
      const n = parseFloat(v ?? "");
      return isNaN(n)
        ? (v ?? "")
        : UnitConverter.convertTemperature(n, fromUnit, toUnit).toFixed(0);
    };

    dispatch({
      type: "SET_STRIKE_WATER",
      payload: {
        tempUnit: toUnit,
        grainTemp: convert(strikeWater.grainTemp),
        targetMashTemp: convert(strikeWater.targetMashTemp),
      },
    });
  };

  const handleWeightUnitChange = (grainWeightUnit: string) => {
    const from = strikeWater.grainWeightUnit;
    const to = grainWeightUnit;
    const n = parseFloat(strikeWater.grainWeight ?? "");
    const converted = isNaN(n)
      ? strikeWater.grainWeight
      : UnitConverter.convertWeight(n, from, to);
    dispatch({
      type: "SET_STRIKE_WATER",
      payload: {
        grainWeightUnit: to,
        grainWeight:
          typeof converted === "number"
            ? to === "oz"
              ? converted.toFixed(1)
              : converted.toFixed(2)
            : converted,
      },
    });
  };

  const getTempPlaceholder = (isTarget: boolean = false) => {
    if (strikeWater.tempUnit === "F") {
      return isTarget ? "152" : "70";
    } else {
      return isTarget ? "67" : "21";
    }
  };

  const getTempRange = () => {
    if (strikeWater.tempUnit === "F") {
      return { grain: "32-120°F", mash: "140-170°F" };
    } else {
      return { grain: "0-50°C", mash: "60-77°C" };
    }
  };

  const tempRange = getTempRange();
  const tempUnit = strikeWater.tempUnit.toUpperCase();

  return (
    <View
      style={[
        calculatorScreenStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ModalHeader
        title="Strike Water Calculator"
        testID="strike-water-header"
      />

      <ScrollView style={{ flex: 1 }}>
        <CalculatorCard title="Settings">
          <UnitToggle
            label="Temperature Unit"
            value={strikeWater.tempUnit}
            options={TEMP_UNIT_OPTIONS}
            onChange={handleTempUnitChange}
          />

          <DropdownToggle
            label="Grain Weight Unit"
            value={strikeWater.grainWeightUnit}
            options={WEIGHT_UNIT_OPTIONS}
            onChange={handleWeightUnitChange}
          />
        </CalculatorCard>

        <CalculatorCard title="Grain Bill">
          <NumberInput
            label="Grain Weight"
            value={strikeWater.grainWeight}
            onChangeText={handleGrainWeightChange}
            placeholder="e.g., 10"
            unit={strikeWater.grainWeightUnit}
            min={0.1}
            max={100}
            step={0.1}
            precision={1}
            testID="strike-water-grain-weight"
          />

          <NumberInput
            label="Grain Temperature"
            value={strikeWater.grainTemp}
            onChangeText={handleGrainTempChange}
            placeholder={getTempPlaceholder()}
            unit={`°${tempUnit}`}
            helperText={`Typical range: ${tempRange.grain}`}
            testID="strike-water-grain-temp"
          />
        </CalculatorCard>

        <CalculatorCard title="Mash Parameters">
          <NumberInput
            label="Target Mash Temperature"
            value={strikeWater.targetMashTemp}
            onChangeText={handleTargetTempChange}
            placeholder={getTempPlaceholder(true)}
            unit={`°${tempUnit}`}
            helperText={`Typical range: ${tempRange.mash}`}
            testID="strike-water-target-temp"
          />

          <DropdownToggle
            label="Water to Grain Ratio"
            value={strikeWater.waterToGrainRatio}
            options={WATER_RATIOS}
            onChange={handleRatioChange}
            placeholder="Select ratio"
          />
        </CalculatorCard>

        {strikeWater.result && (
          <>
            <SingleResult
              label="Strike Water Temperature"
              value={strikeWater.result.strikeTemp}
              unit={`°${tempUnit}`}
              icon="thermostat"
              size="large"
              precision={1}
            />

            <ResultDisplay
              title="Water Volume & Details"
              results={[
                {
                  label: "Water Volume",
                  value: strikeWater.result.waterVolume,
                  unit: "qt",
                  icon: "water-drop",
                  precision: 1,
                },
                {
                  label: "Water-to-Grain Ratio",
                  value: strikeWater.waterToGrainRatio,
                  unit: "qt/lb",
                  icon: "science",
                  precision: 2,
                },
              ]}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
