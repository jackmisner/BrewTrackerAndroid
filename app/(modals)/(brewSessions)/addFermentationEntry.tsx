/**
 * Add Fermentation Entry Screen
 *
 * Modal screen for adding fermentation data points to brew sessions.
 * Allows users to record gravity readings, temperature, and notes
 * to track fermentation progress over time.
 *
 * Features:
 * - Brew session context loading and display
 * - Date/time picker for entry timestamp
 * - Specific gravity input with validation
 * - Temperature recording with unit awareness
 * - Optional notes for observations
 * - Form validation with brewing-appropriate ranges
 * - Real-time API integration with React Query
 * - Loading states and error handling
 * - Navigation back to brew session details
 * - Keyboard-aware layout
 * - Test ID support for automated testing
 *
 * Data Validation:
 * - Gravity: 0.990-1.200 range (covers fermentation span)
 * - Temperature: Reasonable brewing temperature ranges
 * - Date: Cannot be in the future
 * - Required fields: gravity, date
 *
 * Flow:
 * 1. User navigates from brew session details
 * 2. Brew session context is loaded
 * 3. User enters fermentation data
 * 4. Form validation ensures data quality
 * 5. Submit creates fermentation entry via API
 * 6. Success navigates back with cache invalidation
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(brewSessions)/addFermentationEntry?brewSessionId=123');
 * ```
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useBrewSessions } from "@hooks/offlineV2/useUserData";
import { BrewSession } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useUserValidation } from "@utils/userValidation";
import { editBrewSessionStyles } from "@styles/modals/editBrewSessionStyles";
import { TEST_IDS } from "@src/constants/testIDs";
import { ModalHeader } from "@src/components/ui/ModalHeader";

export default function AddFermentationEntryScreen() {
  const theme = useTheme();
  const userValidation = useUserValidation();
  const styles = editBrewSessionStyles(theme);
  const params = useLocalSearchParams();
  const brewSessionsHook = useBrewSessions();

  const brewSessionId = params.brewSessionId as string;

  const [formData, setFormData] = useState({
    gravity: "",
    temperature: "",
    ph: "",
    notes: "",
  });

  const [entryDate, setEntryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [brewSession, setBrewSession] = useState<BrewSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load brew session data to get temperature unit
  useEffect(() => {
    const loadSession = async () => {
      if (!brewSessionId) {
        return;
      }

      try {
        setIsLoadingSession(true);
        const session = await brewSessionsHook.getById(brewSessionId);
        setBrewSession(session);
      } catch (error) {
        console.error("Failed to load brew session:", error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [brewSessionId, brewSessionsHook]);

  const validateForm = (): boolean => {
    const errors: string[] = [];
    // Date must not be in the future
    if (entryDate > new Date()) {
      errors.push("Entry date cannot be in the future");
    }
    // Gravity validation
    if (!formData.gravity.trim()) {
      errors.push("Gravity is required");
    } else {
      const gravity = parseFloat(formData.gravity);
      if (isNaN(gravity) || gravity < 0.99 || gravity > 1.2) {
        errors.push("Gravity must be between 0.990 and 1.200");
      }
    }

    // Temperature validation (optional but if provided must be valid)
    if (formData.temperature.trim()) {
      const temp = parseFloat(formData.temperature);
      const tempUnit = brewSession?.temperature_unit || "F";

      // Validation ranges based on temperature unit
      let minTemp, maxTemp, unitDisplay;
      if (tempUnit === "C") {
        minTemp = -23; // ~-10°F in Celsius
        maxTemp = 49; // ~120°F in Celsius
        unitDisplay = "°C";
      } else {
        minTemp = -10;
        maxTemp = 120;
        unitDisplay = "°F";
      }

      if (isNaN(temp) || temp < minTemp || temp > maxTemp) {
        errors.push(
          `Temperature must be between ${minTemp}${unitDisplay} and ${maxTemp}${unitDisplay}`
        );
      }
    }

    // pH validation (optional but if provided must be valid)
    if (formData.ph.trim()) {
      const ph = parseFloat(formData.ph);
      if (isNaN(ph) || ph < 0 || ph > 14) {
        errors.push("pH must be between 0 and 14");
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Block re-entrancy during save
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      // Validate user permissions for fermentation entry creation
      if (!brewSession?.user_id) {
        Alert.alert(
          "Access Denied",
          "You don't have permission to add fermentation entries to this brew session"
        );
        return;
      }

      try {
        const canModify = await userValidation.canUserModifyResource({
          user_id: brewSession.user_id,
        });

        if (!canModify) {
          Alert.alert(
            "Access Denied",
            "You don't have permission to add fermentation entries to this brew session"
          );
          return;
        }
      } catch (error) {
        console.error(
          "❌ User validation error during fermentation entry creation:",
          error
        );
        Alert.alert(
          "Validation Error",
          "Unable to verify permissions. Please try again."
        );
        return;
      }

      const entryData = {
        entry_date: entryDate.toISOString().split("T")[0], // Date only
        gravity: parseFloat(formData.gravity),
        ...(formData.temperature.trim() && {
          temperature: parseFloat(formData.temperature),
        }),
        ...(formData.ph.trim() && { ph: parseFloat(formData.ph) }),
        ...(formData.notes.trim() && { notes: formData.notes.trim() }),
      };

      // Dev-only diagnostics (avoid PII in production)
      if (__DEV__) {
        console.log("📊 Adding fermentation entry:", {
          brewSessionId,
          brewSessionName: brewSession?.name,
          hasBrewSessionUserId: !!brewSession?.user_id,
          entryDate: entryData.entry_date,
        });
      }

      try {
        await brewSessionsHook.addFermentationEntry!(brewSessionId, entryData);
        router.back();
      } catch (error) {
        console.error("Failed to add fermentation entry:", error);
        Alert.alert(
          "Save Failed",
          "Failed to add fermentation entry. Please check your data and try again.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
  };

  const fermentationEntryTemperaturePlaceholder =
    brewSession?.temperature_unit === "C" ? "20" : "68";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={"height"}>
      <ModalHeader
        title="Add Fermentation Entry"
        testID="add-fermentation-entry-header"
        rightActions={
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            testID={TEST_IDS.buttons.saveButton}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primaryText}
              />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        }
        showHomeButton={false}
      />

      {/* Validation Errors */}
      {validationErrors.length > 0 ? (
        <View style={styles.errorContainer}>
          {validationErrors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Form */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Loading state for brew session */}
        {isLoadingSession && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading brew session...</Text>
          </View>
        )}

        {/* Entry Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Entry Date *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
            testID={TEST_IDS.patterns.touchableOpacityAction("date-picker")}
          >
            <Text style={styles.datePickerText} testID="date-display-text">
              {formatDate(entryDate)}
            </Text>
            <MaterialIcons
              name="event"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          {showDatePicker ? (
            <DateTimePicker
              value={entryDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              testID="date-time-picker"
            />
          ) : null}
        </View>

        {/* Gravity */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Specific Gravity *</Text>
          <TextInput
            style={styles.textInput}
            value={formData.gravity}
            onChangeText={value => setFormData({ ...formData, gravity: value })}
            placeholder="e.g., 1.050"
            keyboardType="decimal-pad"
            returnKeyType="next"
            placeholderTextColor={theme.colors.textSecondary}
            testID={TEST_IDS.patterns.inputField("gravity")}
          />
          <Text
            style={[
              styles.label,
              { fontSize: 12, color: theme.colors.textSecondary },
            ]}
          >
            Enter the specific gravity reading (e.g., 1.050)
          </Text>
        </View>

        {/* Temperature */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Temperature (°{brewSession?.temperature_unit || "F"})
          </Text>
          <TextInput
            style={styles.textInput}
            value={formData.temperature}
            onChangeText={value =>
              setFormData({ ...formData, temperature: value })
            }
            placeholder={`e.g., ${fermentationEntryTemperaturePlaceholder}`}
            keyboardType="decimal-pad"
            returnKeyType="next"
            placeholderTextColor={theme.colors.textSecondary}
            testID={TEST_IDS.patterns.inputField("temperature")}
          />
          <Text
            style={[
              styles.label,
              { fontSize: 12, color: theme.colors.textSecondary },
            ]}
          >
            Optional temperature reading
          </Text>
        </View>

        {/* pH */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>pH</Text>
          <TextInput
            style={styles.textInput}
            value={formData.ph}
            onChangeText={value => setFormData({ ...formData, ph: value })}
            placeholder="e.g., 4.2"
            keyboardType="decimal-pad"
            returnKeyType="next"
            placeholderTextColor={theme.colors.textSecondary}
            testID={TEST_IDS.patterns.inputField("ph")}
          />
          <Text
            style={[
              styles.label,
              { fontSize: 12, color: theme.colors.textSecondary },
            ]}
          >
            Optional pH measurement
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.notes}
            onChangeText={value => setFormData({ ...formData, notes: value })}
            placeholder="Any observations about fermentation..."
            multiline
            numberOfLines={4}
            returnKeyType="done"
            placeholderTextColor={theme.colors.textSecondary}
            testID={TEST_IDS.patterns.inputField("notes")}
          />
          <Text
            style={[
              styles.label,
              { fontSize: 12, color: theme.colors.textSecondary },
            ]}
          >
            Optional notes about this reading or fermentation progress
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
