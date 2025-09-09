import { StyleSheet } from "react-native";
import { EdgeInsets } from "react-native-safe-area-context";
import { sharedStyles } from "@styles/common/sharedStyles";

export const createCalculatorHeaderStyles = (insets: EdgeInsets) =>
  StyleSheet.create({
    header: {
      ...sharedStyles.rowSpaceBetween,
      paddingTop: insets.top + 16, // Safe area + base spacing
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    headerButton: {
      width: 40,
      height: 40,
      ...sharedStyles.touchableBase,
    },
    headerTitle: {
      fontSize: 18,
      ...sharedStyles.semiBold,
      flex: 1,
      textAlign: "center",
    },
  });
