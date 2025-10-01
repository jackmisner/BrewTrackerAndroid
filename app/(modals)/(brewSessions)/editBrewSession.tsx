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
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useBrewSessions } from "@hooks/offlineV2/useUserData";
import { UpdateBrewSessionRequest, BrewSessionStatus } from "@src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useUserValidation } from "@utils/userValidation";
import { editBrewSessionStyles } from "@styles/modals/editBrewSessionStyles";

/**
 * Screen for editing an existing brew session.
 *
 * Allows users to update session details, brewing measurements, status,
 * and notes for an existing brew session.
 */
export default function EditBrewSessionScreen() {
  const theme = useTheme();
  const userValidation = useUserValidation();
  const styles = editBrewSessionStyles(theme);
  const params = useLocalSearchParams();
  const { data: brewSessions, update: updateBrewSession } = useBrewSessions();

  const brewSessionId = params.brewSessionId as string;

  // Loading state for update operation
  const [isUpdating, setIsUpdating] = useState(false);

  // Form state - initialize with empty values, will be populated when session loads
  const [formData, setFormData] = useState({
    name: "",
    status: "planned" as BrewSessionStatus,
    notes: "",
    tasting_notes: "",
    mash_temp: "",
    actual_og: "",
    actual_fg: "",
    actual_abv: "",
    actual_efficiency: "",
    fermentation_start_date: "",
    fermentation_end_date: "",
    packaging_date: "",
    batch_rating: "",
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState<{
    field: string;
    visible: boolean;
  }>({ field: "", visible: false });

  // Get brew session from offline cache
  const brewSession = brewSessions?.find(
    session => session.id === brewSessionId
  );
  const isLoadingSession = !brewSessions; // Still loading if data not available
  const sessionError =
    brewSessions && !brewSession ? "Brew session not found" : null;

  // Populate form data when brew session loads
  useEffect(() => {
    if (brewSession) {
      setFormData({
        name: brewSession.name || "",
        status: brewSession.status || "planned",
        notes: brewSession.notes || "",
        tasting_notes: brewSession.tasting_notes || "",
        mash_temp: brewSession.mash_temp?.toString() || "",
        actual_og: brewSession.actual_og?.toString() || "",
        actual_fg: brewSession.actual_fg?.toString() || "",
        actual_abv: brewSession.actual_abv?.toString() || "",
        actual_efficiency: brewSession.actual_efficiency?.toString() || "",
        fermentation_start_date: brewSession.fermentation_start_date || "",
        fermentation_end_date: brewSession.fermentation_end_date || "",
        packaging_date: brewSession.packaging_date || "",
        batch_rating: brewSession.batch_rating?.toString() || "",
      });
    }
  }, [brewSession]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDatePress = (field: string) => {
    setShowDatePicker({ field, visible: true });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const { field } = showDatePicker;
    setShowDatePicker({ field: "", visible: false });
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD format
      handleInputChange(field, dateString);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) {
      return "Select date";
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const validateNumericField = (field: keyof typeof formData) => {
    const value = parseFloat(formData[field]);
    return !isNaN(value) && isFinite(value);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Session name is required");
      return;
    }

    // Validate user permissions for brew session editing
    if (!brewSession || !brewSession.user_id) {
      Alert.alert(
        "Access Denied",
        "You don't have permission to edit this brew session"
      );
      return;
    }

    try {
      const canModify = await userValidation.canUserModifyResource({
        user_id: brewSession.user_id,
        is_owner: brewSession.is_owner,
      });

      if (!canModify) {
        Alert.alert(
          "Access Denied",
          "You don't have permission to edit this brew session"
        );
        return;
      }
    } catch (error) {
      console.error(
        "❌ User validation error during brew session edit:",
        error
      );
      Alert.alert(
        "Validation Error",
        "Unable to verify permissions. Please try again."
      );
      return;
    }

    // Prepare update data, converting string numbers back to numbers where needed
    const updateData: UpdateBrewSessionRequest = {
      name: formData.name.trim(),
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      brew_notes: formData.notes.trim() || undefined, // Map notes to brew_notes since no separate field exists
      tasting_notes: formData.tasting_notes.trim() || undefined,
      efficiency: formData.actual_efficiency
        ? parseFloat(formData.actual_efficiency)
        : undefined,
    };

    // Add optional date fields
    if (formData.fermentation_start_date) {
      updateData.fermentation_start_date = formData.fermentation_start_date;
    }
    if (formData.fermentation_end_date) {
      updateData.fermentation_end_date = formData.fermentation_end_date;
    }
    if (formData.packaging_date) {
      updateData.packaging_date = formData.packaging_date;
    }

    // Add optional numeric fields - convert strings to numbers

    if (validateNumericField("actual_og")) {
      updateData.actual_og = parseFloat(formData.actual_og);
    }
    if (validateNumericField("actual_fg")) {
      updateData.actual_fg = parseFloat(formData.actual_fg);
    }
    if (validateNumericField("actual_abv")) {
      updateData.actual_abv = parseFloat(formData.actual_abv);
    }
    if (validateNumericField("mash_temp")) {
      updateData.mash_temp = parseFloat(formData.mash_temp);
    }
    if (validateNumericField("batch_rating")) {
      updateData.batch_rating = parseFloat(formData.batch_rating);
    }

    try {
      setIsUpdating(true);
      await updateBrewSession(brewSessionId, updateData);

      // Navigate back to session details
      router.back();
    } catch (error) {
      console.error("❌ Failed to update brew session:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", `Failed to update brew session: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const statusOptions: {
    value: BrewSessionStatus;
    label: string;
    description: string;
  }[] = [
    { value: "planned", label: "Planned", description: "Ready to brew" },
    {
      value: "in-progress",
      label: "In Progress",
      description: "Brew day in progress",
    },
    {
      value: "fermenting",
      label: "Fermenting",
      description: "Primary fermentation",
    },
    {
      value: "conditioning",
      label: "Conditioning",
      description: "Secondary/conditioning",
    },
    { value: "completed", label: "Completed", description: "Ready to drink" },
    { value: "archived", label: "Archived", description: "Archived session" },
  ];

  // Loading state
  if (isLoadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading brew session...</Text>
      </View>
    );
  }

  // Error state
  if (sessionError || !brewSession) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to Load Session</Text>
        <Text style={styles.errorSubtext}>
          {sessionError
            ? "Could not load brew session details"
            : "Brew session not found"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={"height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCancel}
          testID="close-button"
        >
          <MaterialIcons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Brew Session</Text>
        <TouchableOpacity
          style={[
            styles.headerButton,
            styles.saveButton,
            isUpdating && styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size={20} color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Session Info */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Session Details</Text>

          {/* Session Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Session Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={text => handleInputChange("name", text)}
              placeholder="Enter session name"
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="next"
            />
          </View>

          {/* Status */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              {statusOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    formData.status === option.value &&
                      styles.statusOptionSelected,
                  ]}
                  onPress={() => handleInputChange("status", option.value)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === option.value &&
                        styles.statusOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.statusOptionDescription,
                      formData.status === option.value &&
                        styles.statusOptionDescriptionSelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Brewing Measurements */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Brewing Measurements</Text>

          <View style={styles.measurementRow}>
            <View style={styles.measurementGroup}>
              <Text style={styles.label}>Mash Temp</Text>
              <TextInput
                style={styles.textInput}
                value={formData.mash_temp}
                onChangeText={text => handleInputChange("mash_temp", text)}
                placeholder="°F"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.measurementGroup}>
              <Text style={styles.label}>Efficiency</Text>
              <TextInput
                style={styles.textInput}
                value={formData.actual_efficiency}
                onChangeText={text =>
                  handleInputChange("actual_efficiency", text)
                }
                placeholder="%"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.measurementRow}>
            <View style={styles.measurementGroup}>
              <Text style={styles.label}>Actual OG</Text>
              <TextInput
                style={styles.textInput}
                value={formData.actual_og}
                onChangeText={text => handleInputChange("actual_og", text)}
                placeholder="1.050"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.measurementGroup}>
              <Text style={styles.label}>Actual FG</Text>
              <TextInput
                style={styles.textInput}
                value={formData.actual_fg}
                onChangeText={text => handleInputChange("actual_fg", text)}
                placeholder="1.010"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.measurementRow}>
            <View style={styles.measurementGroup}>
              <Text style={styles.label}>Actual ABV</Text>
              <TextInput
                style={styles.textInput}
                value={formData.actual_abv}
                onChangeText={text => handleInputChange("actual_abv", text)}
                placeholder="5.2%"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.measurementGroup}>
              <Text style={styles.label}>Rating (1-5)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.batch_rating}
                onChangeText={text => {
                  // Only allow numbers 1-5
                  const num = parseInt(text);
                  if (text === "" || (num >= 1 && num <= 5)) {
                    handleInputChange("batch_rating", text);
                  }
                }}
                placeholder="5"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
                maxLength={1}
              />
            </View>
          </View>
        </View>

        {/* Important Dates */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Important Dates</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fermentation Start</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => handleDatePress("fermentation_start_date")}
            >
              <Text
                style={[
                  styles.datePickerText,
                  !formData.fermentation_start_date &&
                    styles.datePickerPlaceholder,
                ]}
              >
                {formatDateForDisplay(formData.fermentation_start_date)}
              </Text>
              <MaterialIcons
                name="date-range"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fermentation End</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => handleDatePress("fermentation_end_date")}
            >
              <Text
                style={[
                  styles.datePickerText,
                  !formData.fermentation_end_date &&
                    styles.datePickerPlaceholder,
                ]}
              >
                {formatDateForDisplay(formData.fermentation_end_date)}
              </Text>
              <MaterialIcons
                name="date-range"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Packaging Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => handleDatePress("packaging_date")}
            >
              <Text
                style={[
                  styles.datePickerText,
                  !formData.packaging_date && styles.datePickerPlaceholder,
                ]}
              >
                {formatDateForDisplay(formData.packaging_date)}
              </Text>
              <MaterialIcons
                name="date-range"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Notes</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Brew Day Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.notes}
              onChangeText={text => handleInputChange("notes", text)}
              placeholder="Add notes about the brewing process..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tasting Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.tasting_notes}
              onChangeText={text => handleInputChange("tasting_notes", text)}
              placeholder="Add tasting notes and impressions..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Bottom spacing for keyboard */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker.visible ? (
        <DateTimePicker
          value={
            formData[showDatePicker.field as keyof typeof formData]
              ? new Date(
                  formData[showDatePicker.field as keyof typeof formData]
                )
              : new Date()
          }
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
