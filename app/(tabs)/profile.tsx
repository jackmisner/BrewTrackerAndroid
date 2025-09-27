/**
 * Profile Tab Screen
 *
 * User profile and account management screen that displays user information,
 * app settings navigation, and account actions. Provides access to user settings,
 * help documentation, and logout functionality.
 *
 * Features:
 * - User profile display with avatar, username, and email
 * - Email verification status indicator
 * - Navigation to settings, help, and about sections
 * - Ko-fi donation link with external browser handling
 * - Secure logout with confirmation dialog
 * - Pull-to-refresh functionality
 * - App version information
 *
 * Navigation:
 * - Settings: Opens app settings modal
 * - Help & Support: Placeholder for help system
 * - About: Placeholder for app information
 * - Donate: Opens Ko-fi page in browser or external app
 * - Sign Out: Confirms logout and redirects to login
 *
 * @example
 * Navigation usage:
 * ```typescript
 * // Accessed via tab navigation
 * <Tabs.Screen name="profile" component={ProfileScreen} />
 * ```
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { profileStyles } from "@styles/tabs/profileStyles";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const styles = profileStyles(theme);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleSettingsPress = () => {
    router.push("/(modals)/(settings)/settings");
  };

  // Ko-fi donate button click handler
  const handleDonate = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://ko-fi.com/jackmisner");
    } catch (error) {
      console.error("Failed to open in-app browser:", error);
      try {
        await Linking.openURL("https://ko-fi.com/jackmisner");
      } catch (linkingError) {
        console.error("Failed to open external browser:", linkingError);
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={48} color={theme.colors.primary} />
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {!user?.email_verified ? (
          <View style={styles.verificationBadge}>
            <MaterialIcons
              name="warning"
              size={16}
              color={theme.colors.warning}
            />
            <Text style={styles.verificationText}>Email not verified</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={handleSettingsPress}>
          <MaterialIcons
            name="settings"
            size={24}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.menuText}>Settings</Text>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons
            name="help"
            size={24}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.menuText}>Help & Support</Text>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons
            name="info"
            size={24}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.menuText}>About</Text>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={handleDonate}>
          <Image
            source={require("../../assets/images/mugOfBeer512.png")}
            style={styles.donateIcon}
          />
          <Text style={styles.menuText}>Buy me a Beer!</Text>
          <MaterialIcons
            name="open-in-new"
            size={20}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color={theme.colors.error} />
          <Text style={[styles.menuText, styles.logoutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>
          BrewTracker v{Constants.expoConfig?.version || "0.1.0"}
        </Text>
        <Text style={styles.copyright}>© 2025 BrewTracker</Text>
      </View>
    </ScrollView>
  );
}
