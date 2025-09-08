import React, { useEffect, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { useCalculators } from "@contexts/CalculatorsContext";
import { DilutionCalculator } from "@services/calculators/DilutionCalculator";
import { CalculatorCard } from "@components/calculators/CalculatorCard";
import { CalculatorHeader } from "@components/calculators/CalculatorHeader";
import { NumberInput } from "@components/calculators/NumberInput";
import { ResultDisplay } from "@components/calculators/ResultDisplay";
import { useTheme } from "@contexts/ThemeContext";
import { calculatorScreenStyles } from "@styles/modals/calculators/calculatorScreenStyles";

export default function DilutionCalculatorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useCalculators();
  const { dilution } = state;

  const calculateDilution = useCallback(() => {
    if (
      !dilution.currentGravity ||
      !dilution.targetGravity ||
      !dilution.currentVolume
    ) {
      dispatch({
        type: "SET_DILUTION",
        payload: { result: null },
      });
      return;
    }

    const og = parseFloat(dilution.currentGravity);
    const tg = parseFloat(dilution.targetGravity);
    const volume = parseFloat(dilution.currentVolume);

    if (isNaN(og) || isNaN(tg) || isNaN(volume)) {
      dispatch({
        type: "SET_DILUTION",
        payload: { result: null },
      });
      return;
    }

    try {
      const result = DilutionCalculator.calculateDilution(og, volume, tg);

      dispatch({
        type: "SET_DILUTION",
        payload: { result },
      });

      // Add to history
      dispatch({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "dilution",
          inputs: {
            currentGravity: og,
            targetGravity: tg,
            currentVolume: volume,
          },
          result: {
            waterToAdd: result.waterToAdd,
            finalVolume: result.finalVolume,
          },
        },
      });
    } catch (error) {
      console.warn("Dilution calculation error:", error);
      dispatch({
        type: "SET_DILUTION",
        payload: { result: null },
      });
    }
  }, [
    dilution.currentGravity,
    dilution.targetGravity,
    dilution.currentVolume,
    dispatch,
  ]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateDilution();
  }, [calculateDilution]);

  const handleOGChange = (value: string) => {
    dispatch({
      type: "SET_DILUTION",
      payload: { currentGravity: value },
    });
  };

  const handleTGChange = (value: string) => {
    dispatch({
      type: "SET_DILUTION",
      payload: { targetGravity: value },
    });
  };

  const handleVolumeChange = (value: string) => {
    dispatch({
      type: "SET_DILUTION",
      payload: { currentVolume: value },
    });
  };

  const getPlaceholderText = (isTarget: boolean = false) => {
    return isTarget ? "1.040" : "1.060";
  };

  return (
    <View
      style={[
        calculatorScreenStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <CalculatorHeader title="Dilution Calculator" />

      <ScrollView style={calculatorScreenStyles.scrollContent}>
        <CalculatorCard title="Current Beer">
          <NumberInput
            label="Original Gravity"
            value={dilution.currentGravity}
            onChangeText={handleOGChange}
            placeholder={`e.g., ${getPlaceholderText()}`}
            min={1.02}
            max={1.15}
            step={0.001}
            precision={3}
            testID="dilution-og-input"
          />

          <NumberInput
            label="Current Volume"
            value={dilution.currentVolume}
            onChangeText={handleVolumeChange}
            placeholder="e.g., 5.0"
            unit="gal"
            min={0.1}
            max={100}
            step={0.1}
            precision={1}
            testID="dilution-volume-input"
          />
        </CalculatorCard>

        <CalculatorCard title="Target">
          <NumberInput
            label="Target Gravity"
            value={dilution.targetGravity}
            onChangeText={handleTGChange}
            placeholder={`e.g., ${getPlaceholderText(true)}`}
            min={1.0}
            max={1.1}
            step={0.001}
            precision={3}
            testID="dilution-target-input"
          />
        </CalculatorCard>

        {dilution.result && (
          <ResultDisplay
            title="Dilution Results"
            results={[
              {
                label: "Water to Add",
                value: dilution.result.waterToAdd,
                unit: "gal",
                icon: "water-drop",
                precision: 2,
              },
              {
                label: "Final Volume",
                value: dilution.result.finalVolume,
                unit: "gal",
                icon: "local-drink",
                precision: 2,
              },
            ]}
          />
        )}
      </ScrollView>
    </View>
  );
}
