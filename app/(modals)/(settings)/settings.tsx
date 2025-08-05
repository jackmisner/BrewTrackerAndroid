import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useTheme, ThemeMode } from "../../../src/contexts/ThemeContext";
import { settingsStyles } from "../../../src/styles/modals/settingsStyles";

export default function SettingsScreen() {
  const themeContext = useTheme();
  const { theme, isDark, setTheme } = themeContext;
  const styles = settingsStyles(themeContext);

  const handleGoBack = () => {
    router.back();
  };

  const handleThemeChange = async (selectedTheme: ThemeMode) => {
    await setTheme(selectedTheme);
  };

  const handlePlaceholderAction = (feature: string) => {
    Alert.alert(
      "Coming Soon",
      `${feature} will be available in a future update.`,
      [{ text: "OK" }]
    );
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
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.radioButton}>
        {theme === themeMode && (
          <MaterialIcons name="check-circle" size={24} color={themeContext.colors.primary} />
        )}
        {theme !== themeMode && (
          <MaterialIcons name="radio-button-unchecked" size={24} color={themeContext.colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialIcons name="arrow-back" size={24} color={themeContext.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingGroup}>
            <Text style={styles.groupTitle}>Theme</Text>
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
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handlePlaceholderAction("Unit preferences")}
          >
            <MaterialIcons name="straighten" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Unit Preferences</Text>
              <Text style={styles.menuSubtext}>Imperial, Metric</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={themeContext.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handlePlaceholderAction("Default values")}
          >
            <MaterialIcons name="tune" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Default Values</Text>
              <Text style={styles.menuSubtext}>Batch size, efficiency</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={themeContext.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.menuItem}>
            <MaterialIcons name="notifications" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Push Notifications</Text>
              <Text style={styles.menuSubtext}>Brewing reminders</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => handlePlaceholderAction("Push notifications")}
              trackColor={{ false: themeContext.colors.textMuted, true: themeContext.colors.primary }}
              thumbColor={themeContext.colors.background}
            />
          </View>

          <View style={styles.menuItem}>
            <MaterialIcons name="schedule" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Fermentation Alerts</Text>
              <Text style={styles.menuSubtext}>Progress updates</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => handlePlaceholderAction("Fermentation alerts")}
              trackColor={{ false: themeContext.colors.textMuted, true: themeContext.colors.primary }}
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
            <MaterialIcons name="download" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Export Data</Text>
              <Text style={styles.menuSubtext}>Backup recipes and sessions</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={themeContext.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handlePlaceholderAction("Clear cache")}
          >
            <MaterialIcons name="clear-all" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Clear Cache</Text>
              <Text style={styles.menuSubtext}>Free up storage space</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={themeContext.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handlePlaceholderAction("Privacy policy")}
          >
            <MaterialIcons name="privacy-tip" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Privacy Policy</Text>
              <Text style={styles.menuSubtext}>How we handle your data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={themeContext.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handlePlaceholderAction("Terms of service")}
          >
            <MaterialIcons name="gavel" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Terms of Service</Text>
              <Text style={styles.menuSubtext}>Usage terms and conditions</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={themeContext.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <MaterialIcons name="info" size={24} color={themeContext.colors.textSecondary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>App Version</Text>
              <Text style={styles.menuSubtext}>
                {Constants.expoConfig?.version || "0.1.0"}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}