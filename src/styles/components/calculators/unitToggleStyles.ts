import { StyleSheet } from "react-native";
import { sharedStyles } from "@styles/common/sharedStyles";

export const unitToggleStyles = StyleSheet.create({
  container: {
    ...sharedStyles.containerSpacing,
  },
  label: {
    ...sharedStyles.label,
  },
  toggleContainer: {
    ...sharedStyles.rowCenter,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...sharedStyles.touchableBase,
  },
  toggleText: {
    ...sharedStyles.bodyText,
  },

  // Dropdown styles
  dropdownButton: {
    ...sharedStyles.rowSpaceBetween,
    ...sharedStyles.inputBase,
    minHeight: 44,
  },
  dropdownText: {
    ...sharedStyles.bodyText,
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 1000,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    ...sharedStyles.rowCenter,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    ...sharedStyles.bodyText,
  },
  dropdownItemDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
