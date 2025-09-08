import { StyleSheet } from "react-native";

/**
 * Shared style utilities to reduce duplication across components
 * These are common patterns extracted from calculator components
 */
export const sharedStyles = StyleSheet.create({
  // Container patterns
  containerSpacing: {
    marginVertical: 4,
  },

  cardSpacing: {
    marginVertical: 8,
  },

  // Common label styling
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },

  // Interactive element base
  touchableBase: {
    minHeight: 44, // Accessibility requirement for touch targets
    alignItems: "center",
    justifyContent: "center",
  },

  // Input/Button base styles
  inputBase: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // Common layout patterns
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowSpaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Text patterns
  bodyText: {
    fontSize: 14,
  },

  mediumText: {
    fontSize: 16,
  },

  helperText: {
    fontSize: 12,
    marginTop: 4,
  },

  // Font weight patterns
  medium: {
    fontWeight: "500",
  },

  semiBold: {
    fontWeight: "600",
  },

  // Common spacing
  gap4: {
    gap: 4,
  },

  gap8: {
    gap: 8,
  },

  gap12: {
    gap: 12,
  },

  // Common margin/padding
  marginBottom6: {
    marginBottom: 6,
  },

  marginBottom8: {
    marginBottom: 8,
  },

  marginBottom12: {
    marginBottom: 12,
  },

  padding16: {
    padding: 16,
  },
});
