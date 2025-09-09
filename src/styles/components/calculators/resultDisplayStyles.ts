import { StyleSheet } from "react-native";
import { sharedStyles } from "@styles/common/sharedStyles";

export const resultDisplayStyles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    ...sharedStyles.padding16,
    ...sharedStyles.cardSpacing,
  },
  title: {
    ...sharedStyles.mediumText,
    ...sharedStyles.semiBold,
    ...sharedStyles.marginBottom12,
  },
  resultsList: {
    ...sharedStyles.gap8,
  },
  resultItem: {
    ...sharedStyles.rowSpaceBetween,
    paddingVertical: 4,
  },
  resultLabelContainer: {
    ...sharedStyles.rowCenter,
    flex: 1,
  },
  resultIcon: {
    marginRight: 6,
  },
  resultLabel: {
    ...sharedStyles.bodyText,
  },
  resultValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    ...sharedStyles.gap4,
  },
  resultValue: {
    ...sharedStyles.mediumText,
    textAlign: "right",
  },
  resultUnit: {
    fontSize: 12,
  },

  // Single result styles
  singleResultContainer: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginVertical: 8,
  },
  singleResultHeader: {
    ...sharedStyles.rowCenter,
    ...sharedStyles.marginBottom8,
  },
  singleResultIcon: {
    marginRight: 6,
  },
  singleResultLabel: {
    ...sharedStyles.medium,
  },
  singleResultValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  singleResultValue: {
    fontWeight: "bold",
  },
  singleResultUnit: {
    ...sharedStyles.medium,
  },
});
