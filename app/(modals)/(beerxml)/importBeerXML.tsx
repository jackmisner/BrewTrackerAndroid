/**
 * BeerXML Import Screen
 *
 * Mobile-optimized BeerXML import workflow with file selection,
 * parsing, recipe selection, and navigation to ingredient matching.
 *
 * Features:
 * - Touch-friendly file picker integration
 * - Real-time BeerXML parsing feedback
 * - Recipe preview with key metrics
 * - Multi-recipe import support
 * - Progressive disclosure for complex data
 * - Native loading states and error handling
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { createRecipeStyles } from "@styles/modals/createRecipeStyles";
import BeerXMLService from "@services/beerxml/BeerXMLService";

interface Recipe {
  name?: string;
  style?: string;
  batch_size?: number;
  batch_size_unit?: "l" | "gal";
  ingredients?: {
    type: "grain" | "hop" | "yeast" | "other";
    [key: string]: any;
  }[];
  [key: string]: any;
}

interface ImportState {
  step: "file_selection" | "parsing" | "recipe_selection";
  isLoading: boolean;
  error: string | null;
  selectedFile: {
    content: string;
    filename: string;
  } | null;
  parsedRecipes: Recipe[];
  selectedRecipe: Recipe | null;
}

export default function ImportBeerXMLScreen() {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);

  const [importState, setImportState] = useState<ImportState>({
    step: "file_selection",
    isLoading: false,
    error: null,
    selectedFile: null,
    parsedRecipes: [],
    selectedRecipe: null,
  });

  /**
   * Handle file selection and initial import
   */
  const handleFileSelection = async () => {
    setImportState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the mobile file picker
      const result = await BeerXMLService.importBeerXMLFile();

      if (!result.success) {
        throw new Error(result.error || "Failed to select file");
      }

      if (!result.content || !result.filename) {
        throw new Error("Invalid file data received");
      }

      setImportState(prev => ({
        ...prev,
        selectedFile:
          result.content && result.filename
            ? {
                content: result.content,
                filename: result.filename,
              }
            : null,
        step: "parsing",
      }));
      // Automatically proceed to parsing
      await parseBeerXML(result.content, result.filename);
    } catch (error) {
      console.error("🍺 BeerXML Import - File selection error:", error);
      setImportState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "File selection failed",
      }));
    }
  };

  /**
   * Parse the selected BeerXML content
   */
  const parseBeerXML = async (content: string, filename: string) => {
    try {
      // Parse using backend service
      const recipes = await BeerXMLService.parseBeerXML(content);

      if (recipes.length === 0) {
        throw new Error("No recipes found in the BeerXML file");
      }
      setImportState(prev => ({
        ...prev,
        isLoading: false,
        parsedRecipes: recipes,
        selectedRecipe: recipes[0],
        step: "recipe_selection",
      }));
    } catch (error) {
      console.error("🍺 BeerXML Import - Parsing error:", error);
      setImportState(prev => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to parse BeerXML",
      }));
    }
  };

  /**
   * Proceed to ingredient matching workflow
   */
  const proceedToIngredientMatching = () => {
    if (!importState.selectedRecipe) {
      Alert.alert("Error", "Please select a recipe to import");
      return;
    }

    // Navigate to ingredient matching screen with recipe data
    router.push({
      pathname: "/(modals)/(beerxml)/ingredientMatching" as any,
      params: {
        recipeData: JSON.stringify(importState.selectedRecipe),
        filename: importState.selectedFile?.filename || "imported_recipe",
      },
    });
  };

  /**
   * Reset import state
   */
  const resetImport = () => {
    setImportState({
      step: "file_selection",
      isLoading: false,
      error: null,
      selectedFile: null,
      parsedRecipes: [],
      selectedRecipe: null,
    });
  };

  /**
   * Navigate back
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Render file selection step
   */
  const renderFileSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select BeerXML File</Text>
      <Text style={styles.sectionDescription}>
        Choose a BeerXML file from your device to import recipes.
      </Text>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleFileSelection}
        disabled={importState.isLoading}
      >
        <MaterialIcons
          name="file-upload"
          size={24}
          color={theme.colors.background}
        />
        <Text style={[styles.buttonText, styles.primaryButtonText]}>
          {importState.isLoading ? "Selecting File..." : "Select BeerXML File"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render parsing step
   */
  const renderParsing = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Parsing BeerXML</Text>
      <Text style={styles.sectionDescription}>
        Analyzing your BeerXML file: {importState.selectedFile?.filename}
      </Text>

      <View style={styles.beerxmlLoadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.beerxmlLoadingText}>Parsing recipes...</Text>
      </View>
    </View>
  );

  /**
   * Render recipe selection step
   */
  const renderRecipeSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Found {importState.parsedRecipes.length} Recipe
        {importState.parsedRecipes.length !== 1 ? "s" : ""}
      </Text>

      {importState.parsedRecipes.length > 1 ? (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select recipe to import:</Text>
          <View style={styles.recipeOptionsContainer}>
            {importState.parsedRecipes.map((recipe, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.recipeOption,
                  importState.selectedRecipe === recipe &&
                    styles.selectedRecipeOption,
                ]}
                onPress={() =>
                  setImportState(prev => ({ ...prev, selectedRecipe: recipe }))
                }
              >
                <Text style={styles.recipeOptionName}>
                  {recipe.name || "Unnamed Recipe"}
                </Text>
                <Text style={styles.recipeOptionDetails}>
                  {recipe.ingredients?.length || 0} ingredients •{" "}
                  {recipe.style || "No style"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {importState.selectedRecipe ? (
        <View style={styles.recipePreview}>
          <Text style={styles.previewTitle}>Recipe Preview</Text>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Name:</Text>
            <Text style={styles.previewValue}>
              {importState.selectedRecipe.name || "Unnamed Recipe"}
            </Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Style:</Text>
            <Text style={styles.previewValue}>
              {importState.selectedRecipe.style || "Not specified"}
            </Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Batch Size:</Text>
            <Text style={styles.previewValue}>
              {importState.selectedRecipe.batch_size?.toFixed(1) || "N/A"}{" "}
              {importState.selectedRecipe.batch_size_unit === "l" ? "L" : "gal"}
            </Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Ingredients:</Text>
            <Text style={styles.previewValue}>
              {importState.selectedRecipe.ingredients?.length || 0}
            </Text>
          </View>

          {/* Ingredient summary */}
          <View style={styles.ingredientSummary}>
            <Text style={styles.previewLabel}>Ingredient Types:</Text>
            {["grain", "hop", "yeast", "other"].map(type => {
              const count =
                importState.selectedRecipe?.ingredients?.filter(
                  (ing: any) => ing.type === type
                ).length || 0;

              if (count === 0) return null;

              return (
                <Text key={type} style={styles.ingredientTypeCount}>
                  {count} {type}
                  {count !== 1 ? "s" : ""}
                </Text>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={proceedToIngredientMatching}
          >
            <MaterialIcons
              name="arrow-forward"
              size={24}
              color={theme.colors.background}
            />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              Import Recipe
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  /**
   * Render error state
   */
  const renderError = () => (
    <View style={styles.section}>
      <Text style={styles.errorTitle}>Import Error</Text>
      <Text style={styles.errorText}>{importState.error}</Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={resetImport}
        >
          <MaterialIcons
            name="refresh"
            size={24}
            color={theme.colors.background}
          />
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import BeerXML</Text>
        {importState.step !== "file_selection" && !importState.error ? (
          <TouchableOpacity style={styles.resetButton} onPress={resetImport}>
            <MaterialIcons name="refresh" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {importState.error && renderError()}
        {!importState.error &&
          importState.step === "file_selection" &&
          renderFileSelection()}
        {!importState.error &&
          importState.step === "parsing" &&
          renderParsing()}
        {!importState.error &&
          importState.step === "recipe_selection" &&
          renderRecipeSelection()}
      </ScrollView>
    </View>
  );
}
