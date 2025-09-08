import { StyleSheet } from "react-native";
import { sharedStyles } from "@styles/common/sharedStyles";

export const calculatorHeaderStyles = StyleSheet.create({
  header: {
    ...sharedStyles.rowSpaceBetween,
    paddingTop: 50, // Account for status bar
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
