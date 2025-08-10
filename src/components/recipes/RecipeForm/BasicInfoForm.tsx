import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { RecipeFormData, BatchSizeUnit } from "@src/types";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import { useBeerStyles } from "@src/hooks/useBeerStyles";

interface BasicInfoFormProps {
  recipeData: RecipeFormData;
  onUpdateField: (field: keyof RecipeFormData, value: any) => void;
  isEditing?: boolean;
}

/**
 * Renders a form for entering and validating basic information about a beer recipe.
 *
 * The form includes fields for recipe name, beer style (with a selectable list of common styles), batch size with unit conversion between gallons and liters, an optional description, and a toggle for public visibility. Inline validation is performed for required fields and value constraints, with error messages displayed next to the relevant inputs. All changes are propagated to the parent component via the provided update callback.
 *
 * @param recipeData - The current values for the recipe form fields
 * @param onUpdateField - Callback to update a specific field in the recipe data
 *
 * @returns A React element representing the basic info form UI
 */
export function BasicInfoForm({
  recipeData,
  onUpdateField,
  isEditing = false,
}: BasicInfoFormProps) {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);

  const [showStylePicker, setShowStylePicker] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [styleSearchQuery, setStyleSearchQuery] = React.useState("");

  // Fetch beer styles from API with fallback to common styles
  const {
    data: beerStyles,
    isLoading: stylesLoading,
    error: stylesError,
  } = useBeerStyles();

  const validateField = (field: keyof RecipeFormData, value: any) => {
    const newErrors = { ...errors };

    switch (field) {
      case "name":
        if (!value || !value.toString().trim()) {
          newErrors.name = "Recipe name is required";
        } else if (value.toString().length > 100) {
          newErrors.name = "Recipe name must be less than 100 characters";
        } else {
          delete newErrors.name;
        }
        break;
      case "style":
        if (!value || !value.toString().trim()) {
          newErrors.style = "Beer style is required";
        } else {
          delete newErrors.style;
        }
        break;
      case "batch_size": {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          newErrors.batch_size = "Batch size must be greater than 0";
        } else if (numValue > 1000) {
          newErrors.batch_size = "Batch size seems too large";
        } else {
          delete newErrors.batch_size;
        }
        break;
      }
      case "description":
        if (value && value.toString().length > 500) {
          newErrors.description =
            "Description must be less than 500 characters";
        } else {
          delete newErrors.description;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleFieldChange = (field: keyof RecipeFormData, value: any) => {
    onUpdateField(field, value);
    validateField(field, value);
  };

  const handleBatchSizeUnitChange = (unit: BatchSizeUnit) => {
    // Convert batch size when changing units
    let newBatchSize = recipeData.batch_size;

    if (recipeData.batch_size_unit === "gal" && unit === "l") {
      newBatchSize = Math.round(recipeData.batch_size * 3.78541 * 10) / 10; // gal to L
    } else if (recipeData.batch_size_unit === "l" && unit === "gal") {
      newBatchSize = Math.round((recipeData.batch_size / 3.78541) * 10) / 10; // L to gal
    }

    onUpdateField("batch_size_unit", unit);
    onUpdateField("batch_size", newBatchSize);
  };

  const renderStylePicker = () => {
    if (!showStylePicker) return null;

    const displayStyles = beerStyles || [];

    // Filter styles based on search query
    const filteredStyles = displayStyles.filter(
      style =>
        style.name.toLowerCase().includes(styleSearchQuery.toLowerCase()) ||
        style.styleId.toLowerCase().includes(styleSearchQuery.toLowerCase())
    );

    return (
      <KeyboardAvoidingView
        style={styles.stylePickerContainer}
        behavior="height"
      >
        <View style={styles.stylePickerHeader}>
          <Text style={styles.stylePickerTitle}>
            Select Beer Style {stylesLoading && "(Loading...)"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setShowStylePicker(false);
              setStyleSearchQuery("");
            }}
          >
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.textMuted}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search beer styles or IDs..."
            value={styleSearchQuery}
            onChangeText={setStyleSearchQuery}
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="search"
          />
          {styleSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setStyleSearchQuery("")}>
              <MaterialIcons
                name="clear"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.stylePickerContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {!!stylesError && (
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                Unable to load beer styles from server.
              </Text>
            </View>
          )}
          {filteredStyles.map(style => (
            <TouchableOpacity
              key={`${style.styleId}-${style.name}`}
              style={styles.stylePickerItem}
              onPress={() => {
                handleFieldChange("style", style.name);
                setShowStylePicker(false);
                setStyleSearchQuery("");
              }}
            >
              <View style={styles.stylePickerItemRow}>
                <Text style={styles.stylePickerItemId}>{style.styleId}</Text>
                <Text style={styles.stylePickerItemText}>{style.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredStyles.length === 0 && !stylesLoading && (
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                {styleSearchQuery
                  ? "No beer styles match your search"
                  : "No beer styles available. Try again later."}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={styles.formContainer}>
      {/* Recipe Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Recipe Name <Text style={styles.inputRequired}>*</Text>
        </Text>
        <TextInput
          style={[styles.textInput, errors.name && styles.textInputError]}
          value={recipeData.name}
          onChangeText={text => handleFieldChange("name", text)}
          placeholder="Enter recipe name"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={100}
          returnKeyType="next"
        />
        {errors.name && <Text style={styles.inputError}>{errors.name}</Text>}
      </View>

      {/* Beer Style */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Beer Style <Text style={styles.inputRequired}>*</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerContainer,
            errors.style && styles.textInputError,
          ]}
          onPress={() => setShowStylePicker(true)}
        >
          <View style={styles.pickerButton}>
            <Text
              style={[
                styles.pickerButtonText,
                !recipeData.style && styles.pickerPlaceholder,
              ]}
            >
              {recipeData.style || "Select beer style"}
            </Text>
            <MaterialIcons
              name="arrow-drop-down"
              size={24}
              color={theme.colors.textMuted}
            />
          </View>
        </TouchableOpacity>
        {errors.style && <Text style={styles.inputError}>{errors.style}</Text>}
      </View>

      {/* Batch Size */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Batch Size <Text style={styles.inputRequired}>*</Text>
        </Text>
        <View style={styles.batchSizeContainer}>
          <TextInput
            style={[
              styles.textInput,
              styles.batchSizeInput,
              errors.batch_size && styles.textInputError,
            ]}
            value={recipeData.batch_size.toString()}
            onChangeText={text => {
              const numValue = parseFloat(text) || 0;
              handleFieldChange("batch_size", numValue);
            }}
            placeholder="5.0"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <View style={styles.unitPicker}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                recipeData.batch_size_unit === "gal" && styles.unitButtonActive,
              ]}
              onPress={() => handleBatchSizeUnitChange("gal")}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  recipeData.batch_size_unit === "gal" &&
                    styles.unitButtonTextActive,
                ]}
              >
                gal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                recipeData.batch_size_unit === "l" && styles.unitButtonActive,
              ]}
              onPress={() => handleBatchSizeUnitChange("l")}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  recipeData.batch_size_unit === "l" &&
                    styles.unitButtonTextActive,
                ]}
              >
                L
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {errors.batch_size && (
          <Text style={styles.inputError}>{errors.batch_size}</Text>
        )}
      </View>

      {/* Description */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textInputMultiline,
            errors.description && styles.textInputError,
          ]}
          value={recipeData.description}
          onChangeText={text => handleFieldChange("description", text)}
          placeholder="Describe your recipe (optional)"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.characterCount}>
          {recipeData.description.length}/500
        </Text>
        {errors.description && (
          <Text style={styles.inputError}>{errors.description}</Text>
        )}
      </View>

      {/* Public Recipe Toggle */}
      <View style={styles.switchContainer}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.switchLabel}>Make recipe public</Text>
          <Text style={styles.switchDescription}>
            Public recipes can be viewed and cloned by other users
          </Text>
        </View>
        <Switch
          value={recipeData.is_public}
          onValueChange={value => onUpdateField("is_public", value)}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + "40",
          }}
          thumbColor={
            recipeData.is_public ? theme.colors.primary : theme.colors.textMuted
          }
        />
      </View>

      {/* Style Picker Modal */}
      {renderStylePicker()}
    </View>
  );
}
