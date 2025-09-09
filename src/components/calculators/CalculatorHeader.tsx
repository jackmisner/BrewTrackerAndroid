import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@contexts/ThemeContext";
import { useRouter } from "expo-router";
import { createCalculatorHeaderStyles } from "@styles/components/calculators/calculatorHeaderStyles";

interface CalculatorHeaderProps {
  title: string;
  onClose?: () => void;
}

export function CalculatorHeader({ title, onClose }: CalculatorHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const calculatorHeaderStyles = createCalculatorHeaderStyles(insets);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        calculatorHeaderStyles.header,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <TouchableOpacity
        onPress={handleClose}
        style={calculatorHeaderStyles.headerButton}
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

      <Text
        style={[
          calculatorHeaderStyles.headerTitle,
          { color: theme.colors.primaryText },
        ]}
      >
        {title}
      </Text>

      <View style={calculatorHeaderStyles.headerButton} />
    </View>
  );
}
