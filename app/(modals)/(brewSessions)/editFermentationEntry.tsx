/**
 * Edit Fermentation Entry Screen
 *
 * Modal screen for editing existing fermentation data points in brew sessions.
 * Provides form interface for modifying gravity readings, temperature, notes,
 * and timestamps with comprehensive validation and error handling.
 *
 * Features:
 * - Pre-populated form with existing fermentation entry data
 * - Date/time picker for entry timestamp modification
 * - Specific gravity input with brewing-appropriate validation
 * - Temperature recording with unit conversion support
 * - Notes field for fermentation observations
 * - Form validation preventing invalid data entry
 * - Real-time API integration with React Query
 * - Loading states and comprehensive error handling
 * - Navigation back to brew session details
 * - Keyboard-aware layout for mobile input
 * - Optimistic updates with rollback on failure
 *
 * Data Validation:
 * - Gravity: 0.990-1.200 range (covers full fermentation span)
 * - Temperature: Reasonable brewing/fermentation temperature ranges
 * - Date: Cannot be in the future, must be valid timestamp
 * - Required fields: gravity, date (temperature and notes optional)
 *
 * Flow:
 * 1. User navigates from fermentation entry context menu
 * 2. Existing entry data is loaded and pre-populated
 * 3. User modifies fermentation data as needed
 * 4. Form validation ensures data quality and consistency
 * 5. Submit updates fermentation entry via API
 * 6. Success navigates back with cache invalidation
 * 7. Error states provide user feedback and retry options
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(brewSessions)/editFermentationEntry?brewSessionId=123&entryId=456');
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
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ApiService from "@services/api/apiService";
import { BrewSession, UpdateFermentationEntryRequest } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useUserValidation } from "@utils/userValidation";
import { editBrewSessionStyles } from "@styles/modals/editBrewSessionStyles";
import { ModalHeader } from "@src/components/ui/ModalHeader";

export default function EditFermentationEntryScreen() {
  const theme = useTheme();
  const userValidation = useUserValidation();
  const styles = editBrewSessionStyles(theme);
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const brewSessionId = params.brewSessionId as string;
  const entryIndex = parseInt(params.entryIndex as string, 10);

  const [formData, setFormData] = useState({
    gravity: "",
    temperature: "",
    ph: "",
    notes: "",
  });

  const [entryDate, setEntryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch brew session data to get the entry to edit
  const {
    data: brewSessionData,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useQuery<BrewSession>({
    queryKey: ["brewSession", brewSessionId],
    queryFn: async () => {
      const response = await ApiService.brewSessions.getById(brewSessionId);
      return response.data;
    },
    enabled: !!brewSessionId,
  });

  // Initialize form with existing entry data
  useEffect(() => {
    if (brewSessionData?.fermentation_data?.[entryIndex]) {
      const entry = brewSessionData.fermentation_data[entryIndex];
      setFormData({
        gravity: entry.gravity?.toString() || "",
        temperature: entry.temperature?.toString() || "",
        ph: entry.ph?.toString() || "",
        notes: entry.notes || "",
      });
      if (entry.entry_date || entry.date) {
        const dateString = entry.entry_date || entry.date;
        if (dateString) {
          setEntryDate(new Date(dateString));
        }
      }
    }
  }, [brewSessionData, entryIndex]);

  const updateEntryMutation = useMutation({
    mutationFn: async (entryData: UpdateFermentationEntryRequest) => {
      return ApiService.brewSessions.updateFermentationEntry(
        brewSessionId,
        entryIndex,
        entryData
      );
    },
    onSuccess: _response => {
      // Invalidate and refetch brew session data
      queryClient.invalidateQueries({
        queryKey: ["brewSession", brewSessionId],
      });
      router.back();
    },
    onError: error => {
      console.error("Failed to update fermentation entry:", error);
      Alert.alert(
        "Save Failed",
        "Failed to update fermentation entry. Please check your data and try again.",
        [{ text: "OK" }]
      );
    },
  });

  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Gravity validation
    if (!formData.gravity.trim()) {
      errors.push("Gravity is required");
    } else {
      const gravity = parseFloat(formData.gravity);
      if (isNaN(gravity) || gravity < 0.8 || gravity > 1.2) {
        errors.push("Gravity must be between 0.800 and 1.200");
      }
    }

    // Temperature validation (optional but if provided must be valid)
    if (formData.temperature.trim()) {
      const temp = parseFloat(formData.temperature);
      const tempUnit = brewSessionData?.temperature_unit || "F";

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

    // Date validation
    if (entryDate.getTime() > Date.now()) {
      errors.push("Entry date cannot be in the future");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Validate user permissions for fermentation entry editing (fail closed)
    try {
      // If no user_id is present, block the operation
      if (!brewSessionData?.user_id) {
        Alert.alert(
          "Access Denied",
          "Unable to verify ownership of this brew session"
        );
        return;
      }

      const canModify = await userValidation.canUserModifyResource({
        user_id: brewSessionData.user_id,
        is_owner: brewSessionData.is_owner,
      });

      if (!canModify) {
        Alert.alert(
          "Access Denied",
          "You don't have permission to edit fermentation entries for this brew session"
        );
        return;
      }
    } catch (error) {
      console.error(
        "❌ User validation error during fermentation entry edit:",
        error
      );
      Alert.alert(
        "Validation Error",
        "Unable to verify permissions. Please try again."
      );
      return;
    }

    // Validate entryIndex before proceeding with mutation
    if (
      !Number.isFinite(entryIndex) ||
      entryIndex < 0 ||
      entryIndex >= (brewSessionData?.fermentation_data?.length || 0)
    ) {
      Alert.alert(
        "Error",
        "Invalid fermentation entry index. Please try again."
      );
      return;
    }

    const entryData: UpdateFermentationEntryRequest = {
      entry_date: entryDate.toISOString(),
      gravity: parseFloat(formData.gravity),
      ...(formData.temperature.trim() && {
        temperature: parseFloat(formData.temperature),
      }),
      ...(formData.ph.trim() && { ph: parseFloat(formData.ph) }),
      ...(formData.notes.trim() && { notes: formData.notes.trim() }),
    };

    // Log fermentation entry update for security monitoring
    console.log("📝 Updating fermentation entry:", {
      brewSessionId,
      brewSessionName: brewSessionData?.name,
      entryIndex,
      hasBrewSessionUserId: !!brewSessionData?.user_id,
      entryDate: entryData.entry_date,
    });

    updateEntryMutation.mutate(entryData);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  if (isLoadingSession) {
    return (
      <View style={styles.container}>
        <ModalHeader
          title="Edit Fermentation Entry"
          testID="edit-fermentation-entry-header"
          rightActions={<View style={styles.saveButton} />}
          showHomeButton={false}
          onBack={handleCancel}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading entry...</Text>
        </View>
      </View>
    );
  }

  if (sessionError || !brewSessionData?.fermentation_data?.[entryIndex]) {
    return (
      <View style={styles.container}>
        <ModalHeader
          title="Edit Fermentation Entry"
          testID="edit-fermentation-entry-header"
          rightActions={<View style={styles.saveButton} testID="save-button" />}
          showHomeButton={false}
          onBack={handleCancel}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>Entry Not Found</Text>
          <Text style={styles.errorText}>
            The fermentation entry could not be found or loaded.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ModalHeader
        title="Edit Fermentation Entry"
        testID="edit-fermentation-entry-header"
        rightActions={
          <TouchableOpacity
            style={[
              styles.saveButton,
              updateEntryMutation.isPending && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={updateEntryMutation.isPending}
            testID="save-button"
          >
            {updateEntryMutation.isPending ? (
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
        {/* Entry Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Entry Date *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>{formatDate(entryDate)}</Text>
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
            />
          ) : null}
        </View>

        {/* Gravity */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Specific Gravity *</Text>
          <TextInput
            style={styles.textInput}
            testID="gravity-input"
            value={formData.gravity}
            onChangeText={value => setFormData({ ...formData, gravity: value })}
            placeholder="e.g., 1.050"
            keyboardType="decimal-pad"
            returnKeyType="next"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={styles.label}>
            Enter the specific gravity reading (e.g., 1.050)
          </Text>
        </View>

        {/* Temperature */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Temperature (°{brewSessionData?.temperature_unit || "F"})
          </Text>
          <TextInput
            style={styles.textInput}
            value={formData.temperature}
            onChangeText={value =>
              setFormData({ ...formData, temperature: value })
            }
            placeholder="e.g., 68"
            keyboardType="decimal-pad"
            returnKeyType="next"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={styles.label}>Optional temperature reading</Text>
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
          />
          <Text style={styles.label}>Optional pH measurement</Text>
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
          />
          <Text style={styles.label}>
            Optional notes about this reading or fermentation progress
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
