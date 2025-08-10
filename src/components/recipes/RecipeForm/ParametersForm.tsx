import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { RecipeFormData } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";

interface ParametersFormProps {
  recipeData: RecipeFormData;
  onUpdateField: (field: keyof RecipeFormData, value: any) => void;
}

/**
 * Renders a form for entering and validating brewing recipe parameters, including boil time, brewhouse efficiency, mash temperature (with unit selection), and optional mash time.
 *
 * Displays validation errors and helper text for each field, provides quick-select efficiency presets, and converts mash temperature when the unit is changed. Calls the provided callback to update recipe data on field changes.
 *
 * @param recipeData - The current values for the recipe parameters to display and edit
 * @param onUpdateField - Callback invoked with updated field values when any parameter changes
 *
 * @returns A React element containing the brewing parameters form UI
 */
export function ParametersForm({
  recipeData,
  onUpdateField,
}: ParametersFormProps) {
  const theme = useTheme();
  const { unitSystem } = useUnits();
  const styles = createRecipeStyles(theme);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateField = (field: keyof RecipeFormData, value: any) => {
    const newErrors = { ...errors };

    switch (field) {
      case "boil_time":
        const boilTime = parseFloat(value);
        if (isNaN(boilTime) || boilTime < 0) {
          newErrors.boil_time = "Boil time must be 0 or greater";
        } else if (boilTime > 300) {
          newErrors.boil_time = "Boil time seems too long (>5 hours)";
        } else {
          delete newErrors.boil_time;
        }
        break;
      case "efficiency":
        const efficiency = parseFloat(value);
        if (isNaN(efficiency) || efficiency <= 0) {
          newErrors.efficiency = "Efficiency must be greater than 0";
        } else if (efficiency > 100) {
          newErrors.efficiency = "Efficiency cannot exceed 100%";
        } else {
          delete newErrors.efficiency;
        }
        break;
      case "mash_temperature":
        const mashTemp = parseFloat(value);
        const tempUnit = recipeData.mash_temp_unit;
        const minTemp = tempUnit === "F" ? 140 : 60;
        const maxTemp = tempUnit === "F" ? 170 : 77;

        if (isNaN(mashTemp)) {
          newErrors.mash_temperature = "Mash temperature is required";
        } else if (mashTemp < minTemp) {
          newErrors.mash_temperature = `Mash temperature too low (min ${minTemp}°${tempUnit})`;
        } else if (mashTemp > maxTemp) {
          newErrors.mash_temperature = `Mash temperature too high (max ${maxTemp}°${tempUnit})`;
        } else {
          delete newErrors.mash_temperature;
        }
        break;
      case "mash_time":
        if (value !== undefined && value !== null && value !== "") {
          const mashTime = parseFloat(value);
          if (isNaN(mashTime) || mashTime < 0) {
            newErrors.mash_time = "Mash time must be 0 or greater";
          } else if (mashTime > 480) {
            newErrors.mash_time = "Mash time seems too long (>8 hours)";
          } else {
            delete newErrors.mash_time;
          }
        } else {
          delete newErrors.mash_time;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleFieldChange = (field: keyof RecipeFormData, value: any) => {
    onUpdateField(field, value);
    validateField(field, value);
  };

  const handleMashTempUnitChange = (unit: "F" | "C") => {
    // Convert temperature when changing units
    let newTemp = recipeData.mash_temperature;

    if (recipeData.mash_temp_unit === "F" && unit === "C") {
      newTemp =
        Math.round((((recipeData.mash_temperature - 32) * 5) / 9) * 10) / 10;
    } else if (recipeData.mash_temp_unit === "C" && unit === "F") {
      newTemp =
        Math.round(((recipeData.mash_temperature * 9) / 5 + 32) * 10) / 10;
    }

    onUpdateField("mash_temp_unit", unit);
    onUpdateField("mash_temperature", newTemp);
  };

  // Preset efficiency values based on brewing method
  const efficiencyPresets = [
    { label: "All Grain (Beginner)", value: 65 },
    { label: "All Grain (Intermediate)", value: 75 },
    { label: "All Grain (Advanced)", value: 85 },
    { label: "Partial Mash", value: 60 },
    { label: "Extract", value: 80 },
  ];

  return (
    <View style={styles.formContainer}>
      {/* Boil Time */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Boil Time (minutes) <Text style={styles.inputRequired}>*</Text>
        </Text>
        <TextInput
          style={[styles.textInput, errors.boil_time && styles.textInputError]}
          value={recipeData.boil_time.toString()}
          onChangeText={text => {
            const numValue = parseFloat(text) || 0;
            handleFieldChange("boil_time", numValue);
          }}
          placeholder="60"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="numeric"
          returnKeyType="next"
        />
        {errors.boil_time && (
          <Text style={styles.inputError}>{errors.boil_time}</Text>
        )}
        <Text style={styles.inputHelper}>
          Typical: 60-90 minutes for ales, 90+ for lagers
        </Text>
      </View>

      {/* Efficiency */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Brewhouse Efficiency (%) <Text style={styles.inputRequired}>*</Text>
        </Text>
        <TextInput
          style={[styles.textInput, errors.efficiency && styles.textInputError]}
          value={recipeData.efficiency.toString()}
          onChangeText={text => {
            const numValue = parseFloat(text) || 0;
            handleFieldChange("efficiency", numValue);
          }}
          placeholder="75"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
        {errors.efficiency && (
          <Text style={styles.inputError}>{errors.efficiency}</Text>
        )}

        {/* Efficiency Presets */}
        <View style={styles.presetsContainer}>
          <Text style={styles.presetsLabel}>Quick Select:</Text>
          <View style={styles.presetsRow}>
            {efficiencyPresets.map(preset => (
              <TouchableOpacity
                key={preset.value}
                style={[
                  styles.presetButton,
                  recipeData.efficiency === preset.value &&
                    styles.presetButtonActive,
                ]}
                onPress={() => handleFieldChange("efficiency", preset.value)}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    recipeData.efficiency === preset.value &&
                      styles.presetButtonTextActive,
                  ]}
                >
                  {preset.value}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Mash Temperature */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Mash Temperature <Text style={styles.inputRequired}>*</Text>
        </Text>
        <View style={styles.batchSizeContainer}>
          <TextInput
            style={[
              styles.textInput,
              styles.batchSizeInput,
              errors.mash_temperature && styles.textInputError,
            ]}
            value={recipeData.mash_temperature.toString()}
            onChangeText={text => {
              const numValue = parseFloat(text) || 0;
              handleFieldChange("mash_temperature", numValue);
            }}
            placeholder={unitSystem === "imperial" ? "152" : "67"}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
          <View style={styles.unitPicker}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                recipeData.mash_temp_unit === "F" && styles.unitButtonActive,
              ]}
              onPress={() => handleMashTempUnitChange("F")}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  recipeData.mash_temp_unit === "F" &&
                    styles.unitButtonTextActive,
                ]}
              >
                °F
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                recipeData.mash_temp_unit === "C" && styles.unitButtonActive,
              ]}
              onPress={() => handleMashTempUnitChange("C")}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  recipeData.mash_temp_unit === "C" &&
                    styles.unitButtonTextActive,
                ]}
              >
                °C
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {errors.mash_temperature && (
          <Text style={styles.inputError}>{errors.mash_temperature}</Text>
        )}
        <Text style={styles.inputHelper}>
          Single infusion temperature for enzyme activity
        </Text>
      </View>

      {/* Mash Time */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Mash Time (minutes)</Text>
        <TextInput
          style={[styles.textInput, errors.mash_time && styles.textInputError]}
          value={recipeData.mash_time?.toString() || ""}
          onChangeText={text => {
            const numValue = text ? parseFloat(text) || undefined : undefined;
            handleFieldChange("mash_time", numValue);
          }}
          placeholder="60"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="numeric"
          returnKeyType="done"
        />
        {errors.mash_time && (
          <Text style={styles.inputError}>{errors.mash_time}</Text>
        )}
        <Text style={styles.inputHelper}>
          Optional - leave blank for default (60 minutes)
        </Text>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <MaterialIcons
            name="info-outline"
            size={20}
            color={theme.colors.info}
          />
          <Text style={styles.infoTitle}>Brewing Parameters</Text>
        </View>
        <Text style={styles.infoText}>
          These parameters affect the final recipe calculations. Efficiency is
          the percentage of potential sugars extracted from grains. Mash
          temperature affects fermentability and body of the finished beer.
        </Text>
      </View>
    </View>
  );
}
