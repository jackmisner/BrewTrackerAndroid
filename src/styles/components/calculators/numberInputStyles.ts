import { StyleSheet } from "react-native";
import { sharedStyles } from "@styles/common/sharedStyles";

export const numberInputStyles = StyleSheet.create({
  container: {
    ...sharedStyles.containerSpacing,
  },
  label: {
    ...sharedStyles.label,
  },
  inputContainer: {
    ...sharedStyles.rowCenter,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...sharedStyles.mediumText,
    paddingVertical: 4,
  },
  controls: {
    ...sharedStyles.rowCenter,
    ...sharedStyles.gap8,
  },
  steppers: {
    ...sharedStyles.rowCenter,
    ...sharedStyles.gap4,
  },
  stepperButton: {
    ...sharedStyles.touchableBase,
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  unitButton: {
    ...sharedStyles.rowCenter,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    ...sharedStyles.gap4,
  },
  unitText: {
    ...sharedStyles.bodyText,
    ...sharedStyles.medium,
  },
  helperText: {
    ...sharedStyles.helperText,
    marginLeft: 4,
  },
});
