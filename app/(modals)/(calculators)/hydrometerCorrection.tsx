import React, { useEffect, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { useCalculators } from "@contexts/CalculatorsContext";
import { HydrometerCorrectionCalculator } from "@services/calculators/HydrometerCorrectionCalculator";
import { CalculatorCard } from "@components/calculators/CalculatorCard";
import { ModalHeader } from "@src/components/ui/ModalHeader";
import { NumberInput } from "@components/calculators/NumberInput";
import { UnitToggle } from "@components/calculators/UnitToggle";
import { SingleResult } from "@components/calculators/ResultDisplay";
import { useTheme } from "@contexts/ThemeContext";
import { calculatorScreenStyles } from "@styles/modals/calculators/calculatorScreenStyles";

const TEMP_UNIT_OPTIONS = [
  { label: "°F", value: "f" as const, description: "Fahrenheit" },
  { label: "°C", value: "c" as const, description: "Celsius" },
];

export default function HydrometerCorrectionCalculatorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useCalculators();
  const { hydrometerCorrection } = state;

  const calculateCorrection = useCallback(() => {
    if (
      !hydrometerCorrection.measuredGravity ||
      !hydrometerCorrection.wortTemp ||
      !hydrometerCorrection.calibrationTemp
    ) {
      dispatch({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: null },
      });
      return;
    }

    const measured = parseFloat(hydrometerCorrection.measuredGravity);
    const measuredTemp = parseFloat(hydrometerCorrection.wortTemp);
    const calibrationTemp = parseFloat(hydrometerCorrection.calibrationTemp);

    if (isNaN(measured) || isNaN(measuredTemp) || isNaN(calibrationTemp)) {
      dispatch({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: null },
      });
      return;
    }

    try {
      const result = HydrometerCorrectionCalculator.calculateCorrection(
        measured,
        measuredTemp,
        calibrationTemp,
        hydrometerCorrection.tempUnit
      );

      dispatch({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: result.correctedGravity },
      });

      // Add to history
      dispatch({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "hydrometerCorrection",
          inputs: {
            measuredGravity: measured,
            wortTemp: measuredTemp,
            calibrationTemp,
            tempUnit: hydrometerCorrection.tempUnit,
          },
          result: {
            correctedGravity: result.correctedGravity,
            correction: result.correction,
          },
        },
      });
    } catch (error) {
      console.warn("Hydrometer correction error:", error);
      dispatch({
        type: "SET_HYDROMETER_CORRECTION",
        payload: { result: null },
      });
    }
  }, [
    hydrometerCorrection.measuredGravity,
    hydrometerCorrection.wortTemp,
    hydrometerCorrection.calibrationTemp,
    hydrometerCorrection.tempUnit,
    dispatch,
  ]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateCorrection();
  }, [calculateCorrection]);

  const handleMeasuredGravityChange = (value: string) => {
    dispatch({
      type: "SET_HYDROMETER_CORRECTION",
      payload: { measuredGravity: value },
    });
  };

  const handleMeasuredTempChange = (value: string) => {
    dispatch({
      type: "SET_HYDROMETER_CORRECTION",
      payload: { wortTemp: value },
    });
  };

  const handleCalibrationTempChange = (value: string) => {
    dispatch({
      type: "SET_HYDROMETER_CORRECTION",
      payload: { calibrationTemp: value },
    });
  };

  // Temperature conversion helper
  const convertTemperature = (
    value: string,
    fromUnit: string,
    toUnit: string
  ): string => {
    if (!value || fromUnit === toUnit) {
      return value;
    }

    const numValue = parseFloat(value);
    if (!isFinite(numValue)) {
      return value;
    }

    let converted: number;
    if (fromUnit === "f" && toUnit === "c") {
      // °F to °C: (°F - 32) * 5/9
      converted = (numValue - 32) * (5 / 9);
    } else if (fromUnit === "c" && toUnit === "f") {
      // °C to °F: °C * 9/5 + 32
      converted = numValue * (9 / 5) + 32;
    } else {
      return value;
    }

    return converted.toFixed(1);
  };

  const handleTempUnitChange = (tempUnit: string) => {
    const newTempUnit = tempUnit as typeof hydrometerCorrection.tempUnit;
    const currentTempUnit = hydrometerCorrection.tempUnit;

    // Convert existing temperature values
    const convertedWortTemp = convertTemperature(
      hydrometerCorrection.wortTemp,
      currentTempUnit,
      newTempUnit
    );

    const convertedCalibrationTemp = convertTemperature(
      hydrometerCorrection.calibrationTemp,
      currentTempUnit,
      newTempUnit
    );

    dispatch({
      type: "SET_HYDROMETER_CORRECTION",
      payload: {
        tempUnit: newTempUnit,
        wortTemp: convertedWortTemp,
        calibrationTemp: convertedCalibrationTemp,
      },
    });
  };

  const getTempPlaceholder = (isCalibration: boolean = false) => {
    if (hydrometerCorrection.tempUnit === "f") {
      return isCalibration ? "68" : "75";
    } else {
      return isCalibration ? "20" : "24";
    }
  };

  const tempUnit = hydrometerCorrection.tempUnit.toUpperCase();

  return (
    <View
      style={[
        calculatorScreenStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ModalHeader
        title="Hydrometer Correction"
        testID="hydrometer-correction-header"
      />

      <ScrollView style={calculatorScreenStyles.scrollContent}>
        <CalculatorCard title="Settings">
          <UnitToggle
            label="Temperature Unit"
            value={hydrometerCorrection.tempUnit}
            options={TEMP_UNIT_OPTIONS}
            onChange={handleTempUnitChange}
          />
        </CalculatorCard>

        <CalculatorCard title="Gravity Reading">
          <NumberInput
            label="Measured Specific Gravity"
            value={hydrometerCorrection.measuredGravity}
            onChangeText={handleMeasuredGravityChange}
            placeholder="e.g., 1.050"
            min={0.99}
            max={1.2}
            step={0.001}
            precision={3}
            testID="hydrometer-measured-gravity"
          />

          <NumberInput
            label="Sample Temperature"
            value={hydrometerCorrection.wortTemp}
            onChangeText={handleMeasuredTempChange}
            placeholder={getTempPlaceholder()}
            min={hydrometerCorrection.tempUnit === "c" ? 0 : 32}
            max={hydrometerCorrection.tempUnit === "c" ? 100 : 212}
            unit={`°${tempUnit}`}
            testID="hydrometer-sample-temp"
          />
        </CalculatorCard>

        <CalculatorCard title="Hydrometer Calibration">
          <NumberInput
            label="Calibration Temperature"
            value={hydrometerCorrection.calibrationTemp}
            onChangeText={handleCalibrationTempChange}
            placeholder={getTempPlaceholder(true)}
            min={hydrometerCorrection.tempUnit === "c" ? 0 : 32}
            max={hydrometerCorrection.tempUnit === "c" ? 100 : 212}
            unit={`°${tempUnit}`}
            helperText="Temperature your hydrometer was calibrated at"
            testID="hydrometer-calibration-temp"
          />
        </CalculatorCard>

        {hydrometerCorrection.result !== null && (
          <SingleResult
            label="Temperature Corrected Gravity"
            value={hydrometerCorrection.result}
            unit=""
            icon="tune"
            size="large"
            precision={3}
          />
        )}
      </ScrollView>
    </View>
  );
}
