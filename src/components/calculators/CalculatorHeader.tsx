import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import { useRouter } from "expo-router";

interface CalculatorHeaderProps {
  title: string;
  onClose?: () => void;
}

export function CalculatorHeader({ title, onClose }: CalculatorHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
      <TouchableOpacity
        onPress={handleClose}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Close calculator"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons
          name="close"
          size={24}
          color={theme.colors.primaryText}
        />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: theme.colors.primaryText }]}>
        {title}
      </Text>

      <View style={styles.headerButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50, // Account for status bar
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
});
