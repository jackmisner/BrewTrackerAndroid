/**
 * AI Analysis Button Component
 *
 * Trigger button for AI recipe analysis and optimisation.
 * Displays loading state during analysis and shows results modal on completion.
 *
 * Features:
 * - Theme-aware styling
 * - Loading state with activity indicator
 * - Disabled state when network unavailable or recipe incomplete
 * - Online-only feature with connectivity check
 * - Accessible touch targets (48dp minimum)
 *
 * @example
 * ```typescript
 * <AIAnalysisButton
 *   recipe={completeRecipe}
 *   onAnalysisComplete={(result) => setAnalysisResult(result)}
 *   disabled={!isOnline}
 * />
 * ```
 */

import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@contexts/ThemeContext";
import { createAIStyles } from "@styles/ai/aiStyles";
import { TEST_IDS } from "@src/constants/testIDs";
import { useNetwork } from "@/src/contexts/NetworkContext";

interface AIAnalysisButtonProps {
  /**
   * Whether the button is in loading state (analysis in progress)
   */
  loading?: boolean;

  /**
   * Whether the button is disabled (no network, incomplete recipe, etc.)
   */
  disabled?: boolean;

  /**
   * Callback when button is pressed
   */
  onPress: () => void;

  /**
   * Optional button text override (defaults to "Analyse with AI")
   */
  label?: string;

  /**
   * Optional loading text override (defaults to "Analysing...")
   */
  loadingLabel?: string;

  /**
   * Test ID for automated testing (defaults to TEST_IDS.ai.analysisButton)
   */
  testID?: string;
}

/**
 * Button component that triggers AI recipe analysis
 * Shows loading state during analysis and handles disabled states
 */
export function AIAnalysisButton({
  loading = false,
  disabled = false,
  onPress,
  label = "Analyse with AI",
  loadingLabel = "Analysing...",
  testID = TEST_IDS.ai.analysisButton,
}: AIAnalysisButtonProps) {
  const theme = useTheme();
  const styles = createAIStyles(theme);
  const { isOffline } = useNetwork();
  const isDisabled = disabled || isOffline || loading;
  const displayLabel = loading
    ? loadingLabel
    : isOffline
      ? "Go Online to Analyse with AI"
      : label;

  return (
    <TouchableOpacity
      style={[
        styles.analysisButton,
        isDisabled && styles.analysisButtonDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size="small"
            color={theme.colors.primaryText}
            style={styles.analysisButtonIcon}
          />
          <Text style={styles.analysisButtonText}>{displayLabel}</Text>
        </>
      ) : (
        <>
          <MaterialIcons
            name="auto-fix-high"
            size={20}
            color={theme.colors.primaryText}
            style={styles.analysisButtonIcon}
          />
          <Text style={styles.analysisButtonText}>{displayLabel}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/**
 * Compact variant with icon only (for limited space scenarios)
 */
export function AIAnalysisIconButton({
  loading = false,
  disabled = false,
  onPress,
  testID = TEST_IDS.ai.analysisIconButton,
}: Pick<AIAnalysisButtonProps, "loading" | "disabled" | "onPress" | "testID">) {
  const theme = useTheme();
  const styles = createAIStyles(theme);
  const { isOffline } = useNetwork();
  const isDisabled = disabled || isOffline || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[styles.iconButton, isDisabled && styles.iconButtonDisabled]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <MaterialIcons
          name="auto-fix-high"
          size={24}
          color={isDisabled ? theme.colors.textMuted : theme.colors.primary}
        />
      )}
    </TouchableOpacity>
  );
}

/**
 * Online requirement banner that shows when feature is unavailable offline
 */
export function AIOnlineRequirement({
  testID = TEST_IDS.ai.onlineRequirement,
}: {
  testID?: string;
}) {
  const theme = useTheme();
  const styles = createAIStyles(theme);

  return (
    <View style={styles.onlineRequired} testID={testID}>
      <MaterialIcons
        name="cloud-off"
        size={16}
        color={theme.colors.textSecondary}
      />
      <Text style={styles.onlineRequiredText}>
        AI analysis requires an internet connection
      </Text>
    </View>
  );
}

export default AIAnalysisButton;
