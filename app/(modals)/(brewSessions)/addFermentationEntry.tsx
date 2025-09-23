import React, { useState } from "react";
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
import { CreateFermentationEntryRequest, BrewSession } from "@src/types";
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
  const queryClient = useQueryClient();

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
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Fetch brew session data to get temperature unit
  const { data: brewSession } = useQuery<BrewSession>({
    queryKey: ["brewSession", brewSessionId],
    queryFn: async () => {
      const response = await ApiService.brewSessions.getById(brewSessionId);
      return response.data;
    },
    enabled: !!brewSessionId,
  });

  const addEntryMutation = useMutation({
    mutationFn: async (entryData: CreateFermentationEntryRequest) => {
      return ApiService.brewSessions.addFermentationEntry(
        brewSessionId,
        entryData
      );
    },
    onSuccess: () => {
      // Invalidate and refetch brew session data
      queryClient.invalidateQueries({
        queryKey: ["brewSession", brewSessionId],
      });
      router.back();
    },
    onError: error => {
      console.error("Failed to add fermentation entry:", error);
      Alert.alert(
        "Save Failed",
        "Failed to add fermentation entry. Please check your data and try again.",
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

    // Block re-entrancy during auth check or in-flight mutation
    if (isAuthorizing || addEntryMutation.isPending) {
      return;
    }
    setIsAuthorizing(true);
    try {
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

      const entryData: CreateFermentationEntryRequest = {
        entry_date: entryDate.toISOString(),
        gravity: parseFloat(formData.gravity),
        ...(formData.temperature.trim() && {
          temperature: parseFloat(formData.temperature),
        }),
        ...(formData.ph.trim() && { ph: parseFloat(formData.ph) }),
        ...(formData.notes.trim() && { notes: formData.notes.trim() }),
      };

      // Log fermentation entry creation for security monitoring
      console.log("📊 Adding fermentation entry:", {
        brewSessionId,
        brewSessionName: brewSession?.name,
        hasBrewSessionUserId: !!brewSession?.user_id,
        entryDate: entryData.entry_date,
      });

      try {
        await addEntryMutation.mutateAsync(entryData);
      } catch {
        // Handled by onError in the mutation options
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ModalHeader
        title="Add Fermentation Entry"
        testID="add-fermentation-entry-header"
        rightActions={
          <TouchableOpacity
            style={[
              styles.saveButton,
              addEntryMutation.isPending && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={addEntryMutation.isPending || isAuthorizing}
            testID={TEST_IDS.buttons.saveButton}
          >
            {addEntryMutation.isPending ? (
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
