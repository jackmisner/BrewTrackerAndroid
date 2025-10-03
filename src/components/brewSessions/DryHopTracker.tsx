/**
 * DryHopTracker Component
 *
 * Displays dry-hop schedule from recipe and tracks their addition/removal
 * from the fermenter during brew sessions.
 *
 * Features:
 * - Parses recipe ingredients to extract dry-hop schedule using recipeUtils
 * - Matches recipe dry-hops with session dry_hop_additions
 * - Contextual actions: Add to fermenter / Remove from fermenter
 * - Offline-first with automatic sync via useBrewSessions hook
 * - Visual status indicators (Ready/Added/Removed)
 * - Calculates actual days in fermenter
 * - Theme-aware styling with 48dp touch targets
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Recipe,
  DryHopAddition,
  CreateDryHopFromRecipeRequest,
} from "@src/types";
import { getDryHopsFromRecipe } from "@utils/recipeUtils";
import { useTheme } from "@contexts/ThemeContext";
import { TEST_IDS } from "@src/constants/testIDs";
import { dryHopTrackerStyles } from "@styles/components/brewSessions/dryHopTrackerStyles";
import UnifiedLogger from "@services/logger/UnifiedLogger";

interface DryHopTrackerProps {
  recipe: Recipe | null | undefined;
  sessionDryHops: DryHopAddition[];
  onAddDryHop: (dryHopData: CreateDryHopFromRecipeRequest) => Promise<void>;
  onRemoveDryHop: (dryHopIndex: number) => Promise<void>;
}

interface RecipeDryHopWithStatus {
  recipeData: CreateDryHopFromRecipeRequest;
  sessionIndex: number | null; // Index in session.dry_hop_additions if exists
  sessionData: DryHopAddition | null;
  status: "ready" | "added" | "removed";
  daysInFermenter: number | null;
}

export function DryHopTracker({
  recipe,
  sessionDryHops,
  onAddDryHop,
  onRemoveDryHop,
}: DryHopTrackerProps) {
  const theme = useTheme();
  const styles = dryHopTrackerStyles(theme);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  // Extract and match dry-hops from recipe with session data
  const dryHopsWithStatus = useMemo((): RecipeDryHopWithStatus[] => {
    if (!recipe?.ingredients) {
      return [];
    }

    // First log RAW recipe ingredients to see what we're working with
    const dryHopIngredients = recipe.ingredients.filter(
      ing =>
        ing.type === "hop" && (ing.use === "dry-hop" || ing.use === "dry_hop")
    );

    if (__DEV__) {
      void UnifiedLogger.debug(
        "DryHopTracker.dryHopsWithStatus",
        `RAW recipe ingredients (dry-hops only)`,
        {
          recipeName: recipe.name,
          totalIngredients: recipe.ingredients.length,
          dryHopCount: dryHopIngredients.length,
          rawDryHopIngredients: dryHopIngredients.map(ing => ({
            id: ing.id,
            instance_id: ing.instance_id,
            name: ing.name,
            type: ing.type,
            use: ing.use,
            hasInstanceId: !!ing.instance_id,
          })),
        }
      );
    }

    const recipeDryHops = getDryHopsFromRecipe(recipe.ingredients);

    // Log all dry-hops extracted from recipe AFTER transformation
    if (__DEV__) {
      void UnifiedLogger.debug(
        "DryHopTracker.dryHopsWithStatus",
        `Extracted ${recipeDryHops.length} dry-hops from recipe (AFTER getDryHopsFromRecipe)`,
        {
          recipeName: recipe.name,
          recipeDryHops: recipeDryHops.map(dh => ({
            hop_name: dh.hop_name,
            recipe_instance_id: dh.recipe_instance_id,
            hasInstanceId: !!dh.recipe_instance_id,
          })),
        }
      );
    }
    return recipeDryHops.map(recipeDryHop => {
      // Find matching session dry-hop by hop name AND recipe_instance_id (for duplicate hops)
      const foundIndex = sessionDryHops.findIndex(
        sessionHop =>
          sessionHop.hop_name.toLowerCase() ===
            recipeDryHop.hop_name.toLowerCase() &&
          sessionHop.recipe_instance_id === recipeDryHop.recipe_instance_id
      );

      // Guard against -1 index: only use if valid
      const sessionIndex = foundIndex >= 0 ? foundIndex : null;
      const sessionData =
        sessionIndex !== null ? sessionDryHops[sessionIndex] : null;

      // Log matching result
      if (__DEV__) {
        void UnifiedLogger.debug(
          "DryHopTracker.dryHopsWithStatus",
          `Matching result for ${recipeDryHop.hop_name}`,
          {
            hop_name: recipeDryHop.hop_name,
            recipe_instance_id: recipeDryHop.recipe_instance_id,
            sessionIndex,
            matched: sessionIndex !== null,
            sessionHopInstanceId: sessionData?.recipe_instance_id,
          }
        );
      }

      // Determine status
      let status: "ready" | "added" | "removed" = "ready";
      if (sessionData) {
        status = sessionData.removal_date ? "removed" : "added";
      }

      // Calculate days in fermenter
      let daysInFermenter: number | null = null;
      if (sessionData?.addition_date) {
        const toUtcMidnight = (s: string): number => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
          if (m) {
            const [_, y, mo, d] = m;
            return Date.UTC(Number(y), Number(mo) - 1, Number(d));
          }
          return new Date(s).getTime();
        };
        const startMs = toUtcMidnight(sessionData.addition_date);
        const endMs = sessionData.removal_date
          ? toUtcMidnight(sessionData.removal_date)
          : Date.now();
        const diffDays = Math.max(0, Math.ceil((endMs - startMs) / 86400000));
        daysInFermenter = Number.isFinite(diffDays) ? diffDays : null;
      }

      return {
        recipeData: recipeDryHop,
        sessionIndex,
        sessionData,
        status,
        daysInFermenter,
      };
    });
  }, [recipe?.ingredients, recipe?.name, sessionDryHops]);

  const handleAddDryHop = async (dryHop: RecipeDryHopWithStatus) => {
    const hopName = dryHop.recipeData.hop_name;
    const key = dryHop.recipeData.recipe_instance_id ?? hopName;

    try {
      await UnifiedLogger.info(
        "DryHopTracker.handleAddDryHop",
        `Adding dry-hop: ${hopName}`,
        {
          hop_name: hopName,
          recipe_instance_id: dryHop.recipeData.recipe_instance_id,
          hasInstanceId: !!dryHop.recipeData.recipe_instance_id,
          fullDryHopData: dryHop.recipeData,
        }
      );
      setProcessingKey(key);

      await onAddDryHop(dryHop.recipeData);
      await UnifiedLogger.info(
        "DryHopTracker.handleAddDryHop",
        `Dry-hop added successfully: ${hopName}`,
        {
          hop_name: hopName,
          recipe_instance_id: dryHop.recipeData.recipe_instance_id,
        }
      );
    } catch (error) {
      await UnifiedLogger.error(
        "DryHopTracker.handleAddDryHop",
        `Failed to add dry-hop: ${hopName}`,
        { error, hop_name: hopName }
      );
      Alert.alert(
        "Error",
        `Failed to add ${hopName} to fermenter. Please try again.`
      );
    } finally {
      setProcessingKey(null);
    }
  };

  const handleRemoveDryHop = async (dryHop: RecipeDryHopWithStatus) => {
    // Recompute index at click time to avoid stale indices
    const idx = sessionDryHops.findIndex(
      s =>
        s.hop_name.toLowerCase() === dryHop.recipeData.hop_name.toLowerCase() &&
        s.recipe_instance_id === dryHop.recipeData.recipe_instance_id
    );
    if (idx < 0) {
      return;
    }

    const hopName = dryHop.recipeData.hop_name;
    const key = dryHop.recipeData.recipe_instance_id ?? hopName;
    try {
      setProcessingKey(key);
      await onRemoveDryHop(idx);
    } catch (error) {
      await UnifiedLogger.error(
        "DryHopTracker.handleRemoveDryHop",
        `Failed to remove dry-hop: ${hopName}`,
        { error, hop_name: hopName }
      );
      Alert.alert(
        "Error",
        `Failed to remove ${hopName} from fermenter. Please try again.`
      );
    } finally {
      setProcessingKey(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: "ready" | "added" | "removed") => {
    const statusConfig = {
      ready: {
        text: "Ready to Add",
        bgColor: theme.colors.background,
        textColor: theme.colors.textSecondary,
        icon: "schedule" as const,
      },
      added: {
        text: "In Fermenter",
        bgColor: theme.colors.success + "20",
        textColor: theme.colors.success,
        icon: "check-circle" as const,
      },
      removed: {
        text: "Removed",
        bgColor: theme.colors.textSecondary + "20",
        textColor: theme.colors.textSecondary,
        icon: "done" as const,
      },
    };

    const config = statusConfig[status];

    return (
      <View
        style={[styles.statusBadge, { backgroundColor: config.bgColor }]}
        testID={TEST_IDS.patterns.metricValue(`dry-hop-status-${status}`)}
      >
        <MaterialIcons
          name={config.icon}
          size={14}
          color={config.textColor}
          style={styles.statusIcon}
        />
        <Text style={[styles.statusText, { color: config.textColor }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  if (!recipe) {
    return null;
  }

  if (dryHopsWithStatus.length === 0) {
    return (
      <View
        style={styles.container}
        testID={TEST_IDS.patterns.sectionContainer("dry-hop-tracker")}
      >
        <View style={styles.header}>
          <MaterialIcons
            name="local-drink"
            size={24}
            color={theme.colors.primary}
            testID={TEST_IDS.patterns.iconElement("dry-hop")}
          />
          <Text style={styles.title}>Dry Hop Schedule</Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialIcons
            name="info-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyText}>No dry-hops found in this recipe</Text>
          <Text style={styles.emptySubtext}>
            Add dry-hop ingredients to your recipe to track them here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      testID={TEST_IDS.patterns.sectionContainer("dry-hop-tracker")}
    >
      <View style={styles.header}>
        <View testID={TEST_IDS.patterns.iconElement("dry-hop")}>
          <MaterialIcons
            name="local-drink"
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.title}>Dry Hop Schedule</Text>
      </View>

      <View
        style={styles.listContainer}
        testID={TEST_IDS.patterns.scrollAction("dry-hop-list")}
      >
        {dryHopsWithStatus.map((dryHop, index) => {
          const hopName = dryHop.recipeData.hop_name;
          const procKey = dryHop.recipeData.recipe_instance_id ?? hopName;
          const isProcessing = processingKey === procKey;

          return (
            <View
              key={
                dryHop.recipeData.recipe_instance_id ?? `${hopName}-${index}`
              }
              style={styles.dryHopItem}
            >
              {/* Hop Info */}
              <View style={styles.hopInfo}>
                <Text style={styles.hopName}>{hopName}</Text>
                <Text style={styles.hopDetails}>
                  {dryHop.recipeData.amount} {dryHop.recipeData.amount_unit}
                  {dryHop.recipeData.hop_type &&
                    ` • ${dryHop.recipeData.hop_type}`}
                </Text>
                {dryHop.recipeData.duration_days && (
                  <Text style={styles.hopDetails}>
                    Planned: {dryHop.recipeData.duration_days} days
                  </Text>
                )}
              </View>

              {/* Status Badge */}
              <View style={styles.statusContainer}>
                {getStatusBadge(dryHop.status)}

                {/* Timing Info */}
                {dryHop.sessionData && (
                  <View style={styles.timingInfo}>
                    {dryHop.sessionData.addition_date && (
                      <Text style={styles.timingText}>
                        Added: {formatDate(dryHop.sessionData.addition_date)}
                      </Text>
                    )}
                    {dryHop.sessionData.removal_date && (
                      <Text style={styles.timingText}>
                        Removed: {formatDate(dryHop.sessionData.removal_date)}
                      </Text>
                    )}
                    {dryHop.daysInFermenter !== null && (
                      <Text style={[styles.timingText, styles.daysText]}>
                        {dryHop.daysInFermenter} days in fermenter
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionContainer}>
                {dryHop.status === "ready" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.addButton]}
                    onPress={() => handleAddDryHop(dryHop)}
                    disabled={isProcessing}
                    testID={TEST_IDS.patterns.touchableOpacityAction(
                      `add-dry-hop-${hopName.toLowerCase().replace(/\s+/g, "-")}`
                    )}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="add-circle-outline"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.actionButtonText}>
                          Add to Fermenter
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {dryHop.status === "added" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => handleRemoveDryHop(dryHop)}
                    disabled={isProcessing}
                    testID={TEST_IDS.patterns.touchableOpacityAction(
                      `remove-dry-hop-${hopName.toLowerCase().replace(/\s+/g, "-")}`
                    )}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="remove-circle-outline"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.actionButtonText}>
                          Remove from Fermenter
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {dryHop.status === "removed" && (
                  <View style={styles.completeContainer}>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.completeText}>Complete</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
