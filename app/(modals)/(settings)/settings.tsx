/**
 * Settings Screen
 *
 * Comprehensive app settings and preferences management screen. Provides
 * centralized control over app behavior, appearance, units, caching, and
 * developer features. Includes data management capabilities and cache controls.
 *
 * Features:
 * - Theme selection (light, dark, system)
 * - Unit system preferences (metric, imperial)
 * - Cache management and data clearing
 * - Static data cache statistics and controls
 * - Developer mode features and network simulation
 * - App version and build information
 * - Settings persistence across app restarts
 * - Loading states and error handling
 * - Confirmation dialogs for destructive actions
 *
 * Settings Categories:
 * - **Appearance**: Theme mode selection with system preference detection
 * - **Units**: Measurement system preferences for recipes and calculations
 * - **Data**: Cache management, static data refresh, and storage clearing
 * - **Developer**: Advanced features for testing and debugging
 * - **About**: App version, build info, and system information
 *
 * State Management:
 * - Theme: ThemeContext with AsyncStorage persistence
 * - Units: UnitContext with preference synchronization
 * - Developer: DeveloperContext with feature flags
 * - Cache: StaticDataService for offline data management
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(settings)/settings');
 * ```
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, ThemeMode } from "@contexts/ThemeContext";
import { useUnits } from "@contexts/UnitContext";
import { useDeveloper } from "@contexts/DeveloperContext";
import { useAuth } from "@contexts/AuthContext";
import { UnitSystem, STORAGE_KEYS_V2 } from "@src/types";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import {
  BiometricService,
  BiometricErrorCode,
} from "@services/BiometricService";
import { settingsStyles } from "@styles/modals/settingsStyles";
import { TEST_IDS } from "@src/constants/testIDs";

export default function SettingsScreen() {
  const themeContext = useTheme();
  const { theme, setTheme } = themeContext;
  const { unitSystem, updateUnitSystem, loading: unitsLoading } = useUnits();
  const { isDeveloperMode, networkSimulationMode, setNetworkSimulationMode } =
    useDeveloper();
  const {
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometrics,
    disableBiometrics,
    checkBiometricAvailability,
    user,
  } = useAuth();
  const styles = settingsStyles(themeContext);

  const [biometricType, setBiometricType] = useState<string>("Biometric");
  const [isTogglingBiometric, setIsTogglingBiometric] = useState(false);

  // Load biometric type name on mount
  React.useEffect(() => {
    const loadBiometricType = async () => {
      try {
        const typeName = await BiometricService.getBiometricTypeName();
        setBiometricType(typeName);
      } catch (error) {
        console.warn("Failed to load biometric type:", error);
        setBiometricType("Biometric");
      }
    };
    loadBiometricType();
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleThemeChange = async (selectedTheme: ThemeMode) => {
    await setTheme(selectedTheme);
  };

  const handleUnitSystemChange = async (selectedUnitSystem: UnitSystem) => {
    try {
      await updateUnitSystem(selectedUnitSystem);
    } catch {
      Alert.alert(
        "Error",
        "Failed to update unit preferences. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handlePlaceholderAction = (feature: string) => {
    Alert.alert(
      "Coming Soon",
      `${feature} will be available in a future update.`,
      [{ text: "OK" }]
    );
  };

  const handleClearStaticData = async () => {
    Alert.alert(
      "Clear Static Data",
      "This will clear cached ingredients and beer styles. They will be re-downloaded when needed. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await StaticDataService.clearCache();

              Alert.alert(
                "Static Data Cleared",
                "Cached ingredients and beer styles have been cleared.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("Error clearing static data:", error);
              Alert.alert(
                "Error",
                "Failed to clear static data. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleClearUserData = async () => {
    Alert.alert(
      "Clear User Data",
      "This will clear offline recipes and pending sync operations. Any unsynced changes will be lost. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear user data cache (offline recipes)
              await AsyncStorage.removeItem(STORAGE_KEYS_V2.USER_RECIPES);
              await AsyncStorage.removeItem(STORAGE_KEYS_V2.PENDING_OPERATIONS);
              await AsyncStorage.removeItem(STORAGE_KEYS_V2.SYNC_METADATA);

              Alert.alert(
                "User Data Cleared",
                "Offline recipes and sync data have been cleared.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("Error clearing user data:", error);
              Alert.alert(
                "Error",
                "Failed to clear user data. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleEnableBiometrics = async () => {
    if (!user?.username) {
      Alert.alert("Error", "Unable to retrieve username");
      return;
    }

    try {
      setIsTogglingBiometric(true);

      // Token-based biometric authentication - uses existing JWT session
      await enableBiometrics(user.username);
      await checkBiometricAvailability();

      Alert.alert(
        "Success",
        `${biometricType} authentication has been enabled. You can now use ${biometricType.toLowerCase()}s to log in.`
      );
    } catch (error: any) {
      console.error("Failed to enable biometrics:", error);

      // Suppress alerts for user-initiated cancellations
      const errorCode = error.errorCode || error.code;
      const shouldSuppressAlert =
        errorCode === BiometricErrorCode.USER_CANCELLED ||
        errorCode === BiometricErrorCode.SYSTEM_CANCELLED;

      if (!shouldSuppressAlert) {
        Alert.alert(
          "Error",
          error.message ||
            `Failed to enable ${biometricType.toLowerCase()}s authentication. Please try again.`
        );
      }
    } finally {
      setIsTogglingBiometric(false);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Enable biometrics - confirm and enable
      Alert.alert(
        `Enable ${biometricType}?`,
        `This will allow you to log in using ${biometricType.toLowerCase()}s instead of your password. Your device will securely store an authentication token.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enable",
            onPress: handleEnableBiometrics,
          },
        ]
      );
    } else {
      // Disable biometrics - confirm and disable
      Alert.alert(
        `Disable ${biometricType}?`,
        `This will disable ${biometricType.toLowerCase()}s login. You'll need to enter your password to log in.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: async () => {
              try {
                setIsTogglingBiometric(true);
                await disableBiometrics();
                await checkBiometricAvailability();
                Alert.alert(
                  "Success",
                  `${biometricType} authentication has been disabled.`
                );
              } catch (error) {
                console.error("Failed to disable biometrics:", error);
                Alert.alert(
                  "Error",
                  `Failed to disable ${biometricType.toLowerCase()}s authentication. Please try again.`
                );
              } finally {
                setIsTogglingBiometric(false);
              }
            },
          },
        ]
      );
    }
  };

  const renderThemeOption = (
    themeMode: ThemeMode,
    title: string,
    subtitle: string
  ) => (
    <TouchableOpacity
      key={themeMode}
      style={styles.optionItem}
      onPress={() => handleThemeChange(themeMode)}
      testID={TEST_IDS.patterns.themeOption(themeMode)}
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.radioButton}>
        {theme === themeMode ? (
          <MaterialIcons
            name="check-circle"
            size={24}
            color={themeContext.colors.primary}
          />
        ) : null}
        {theme !== themeMode ? (
          <MaterialIcons
            name="radio-button-unchecked"
            size={24}
            color={themeContext.colors.textMuted}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderUnitSystemOption = (
    unitSystemMode: UnitSystem,
    title: string,
    subtitle: string
  ) => (
    <TouchableOpacity
      key={unitSystemMode}
      style={styles.optionItem}
      onPress={() => handleUnitSystemChange(unitSystemMode)}
      disabled={unitsLoading}
      testID={TEST_IDS.patterns.unitOption(unitSystemMode)}
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.radioButton}>
        {unitsLoading ? (
          <ActivityIndicator size="small" color={themeContext.colors.primary} />
        ) : unitSystem === unitSystemMode ? (
          <MaterialIcons
            name="check-circle"
            size={24}
            color={themeContext.colors.primary}
          />
        ) : (
          <MaterialIcons
            name="radio-button-unchecked"
            size={24}
            color={themeContext.colors.textMuted}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={themeContext.colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.settingGroup}>
            <Text
              style={styles.groupTitle}
              testID={TEST_IDS.settings.themeLabel}
            >
              Theme
            </Text>
            <View style={styles.groupContent}>
              {renderThemeOption("light", "Light", "Always use light theme")}
              {renderThemeOption("dark", "Dark", "Always use dark theme")}
              {renderThemeOption("system", "System", "Follow device setting")}
            </View>
          </View>
        </View>

        {/* Brewing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brewing</Text>

          <View style={styles.settingGroup}>
            <Text
              style={styles.groupTitle}
              testID={TEST_IDS.settings.unitLabel}
            >
              Unit System
            </Text>
            <View style={styles.groupContent}>
              {renderUnitSystemOption(
                "imperial",
                "Imperial",
                "Fahrenheit, pounds, gallons"
              )}
              {renderUnitSystemOption(
                "metric",
                "Metric",
                "Celsius, kilograms, liters"
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handlePlaceholderAction("Default values")}
          >
            <MaterialIcons
              name="tune"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Default Values</Text>
              <Text style={styles.menuSubtext}>Batch size, efficiency</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={themeContext.colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        {isBiometricAvailable && (
          <View
            style={styles.section}
            testID={TEST_IDS.settings.securitySection}
          >
            <Text style={styles.sectionTitle}>Security</Text>

            <View style={styles.menuItem}>
              <MaterialIcons
                name="fingerprint"
                size={24}
                color={themeContext.colors.textSecondary}
              />
              <View style={styles.menuContent}>
                <Text
                  style={styles.menuText}
                  testID={TEST_IDS.settings.biometricLabel}
                >
                  {biometricType} Authentication
                </Text>
                <Text
                  style={styles.menuSubtext}
                  testID={TEST_IDS.settings.biometricStatus}
                >
                  {isBiometricEnabled
                    ? `Enabled - Use ${biometricType.toLowerCase()}s to log in`
                    : `Disabled - Log in with password`}
                </Text>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={isTogglingBiometric}
                trackColor={{
                  false: themeContext.colors.textMuted,
                  true: themeContext.colors.primary,
                }}
                thumbColor={themeContext.colors.background}
                testID={TEST_IDS.settings.biometricToggle}
              />
            </View>
          </View>
        )}

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.menuItem}>
            <MaterialIcons
              name="notifications"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Push Notifications</Text>
              <Text style={styles.menuSubtext}>Brewing reminders</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() =>
                handlePlaceholderAction("Push notifications")
              }
              trackColor={{
                false: themeContext.colors.textMuted,
                true: themeContext.colors.primary,
              }}
              thumbColor={themeContext.colors.background}
            />
          </View>

          <View style={styles.menuItem}>
            <MaterialIcons
              name="schedule"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Fermentation Alerts</Text>
              <Text style={styles.menuSubtext}>Progress updates</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() =>
                handlePlaceholderAction("Fermentation alerts")
              }
              trackColor={{
                false: themeContext.colors.textMuted,
                true: themeContext.colors.primary,
              }}
              thumbColor={themeContext.colors.background}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handlePlaceholderAction("Export data")}
          >
            <MaterialIcons
              name="download"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Export Data</Text>
              <Text style={styles.menuSubtext}>
                Backup recipes and sessions
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={themeContext.colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleClearStaticData}
          >
            <MaterialIcons
              name="cached"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Clear Static Data</Text>
              <Text style={styles.menuSubtext}>
                Ingredients and beer styles
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={themeContext.colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleClearUserData}
          >
            <MaterialIcons
              name="clear-all"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Clear User Data</Text>
              <Text style={styles.menuSubtext}>
                Offline recipes and sync data
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={themeContext.colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(modals)/(settings)/privacyPolicy")}
          >
            <MaterialIcons
              name="privacy-tip"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Privacy Policy</Text>
              <Text style={styles.menuSubtext}>How we handle your data</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={themeContext.colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(modals)/(settings)/termsOfService")}
          >
            <MaterialIcons
              name="gavel"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Terms of Service</Text>
              <Text style={styles.menuSubtext}>Usage terms and conditions</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={themeContext.colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <MaterialIcons
              name="info"
              size={24}
              color={themeContext.colors.textSecondary}
            />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>App Version</Text>
              <Text style={styles.menuSubtext}>
                {Constants.expoConfig?.version || "0.1.0"}
              </Text>
            </View>
          </View>
        </View>

        {/* Developer Section - Only show in development mode */}
        {isDeveloperMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developer</Text>

            <View style={styles.settingGroup}>
              <Text style={styles.groupTitle}>Network Simulation</Text>
              <View style={styles.groupContent}>
                {/* Normal Network Mode */}
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => setNetworkSimulationMode("normal")}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Normal</Text>
                    <Text style={styles.optionSubtitle}>
                      Use actual network connection
                    </Text>
                  </View>
                  <View style={styles.radioButton}>
                    {networkSimulationMode === "normal" ? (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={themeContext.colors.primary}
                      />
                    ) : (
                      <MaterialIcons
                        name="radio-button-unchecked"
                        size={24}
                        color={themeContext.colors.textMuted}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Slow Network Mode */}
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => setNetworkSimulationMode("slow")}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Slow Network</Text>
                    <Text style={styles.optionSubtitle}>
                      Simulate poor connection quality
                    </Text>
                  </View>
                  <View style={styles.radioButton}>
                    {networkSimulationMode === "slow" ? (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={themeContext.colors.primary}
                      />
                    ) : (
                      <MaterialIcons
                        name="radio-button-unchecked"
                        size={24}
                        color={themeContext.colors.textMuted}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Offline Mode */}
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => setNetworkSimulationMode("offline")}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Offline</Text>
                    <Text style={styles.optionSubtitle}>
                      Test offline functionality
                    </Text>
                  </View>
                  <View style={styles.radioButton}>
                    {networkSimulationMode === "offline" ? (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={themeContext.colors.primary}
                      />
                    ) : (
                      <MaterialIcons
                        name="radio-button-unchecked"
                        size={24}
                        color={themeContext.colors.textMuted}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}
