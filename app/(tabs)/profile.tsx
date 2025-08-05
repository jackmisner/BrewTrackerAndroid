import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { profileStyles } from "../../src/styles/tabs/profileStyles";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const styles = profileStyles(theme);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Profile data is static, so just simulate refresh
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
        {!user?.email_verified && (
          <View style={styles.verificationBadge}>
            <MaterialIcons name="warning" size={16} color={theme.colors.warning} />
            <Text style={styles.verificationText}>Email not verified</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={handleSettingsPress}>
          <MaterialIcons name="settings" size={24} color={theme.colors.textSecondary} />
          <Text style={styles.menuText}>Settings</Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="help" size={24} color={theme.colors.textSecondary} />
          <Text style={styles.menuText}>Help & Support</Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="info" size={24} color={theme.colors.textSecondary} />
          <Text style={styles.menuText}>About</Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
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
