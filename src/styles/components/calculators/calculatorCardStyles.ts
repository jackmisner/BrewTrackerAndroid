import { StyleSheet } from "react-native";
import { sharedStyles } from "@styles/common/sharedStyles";

export const calculatorCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    ...sharedStyles.cardSpacing,
    borderRadius: 12,
    borderWidth: 1,
    ...sharedStyles.padding16,
  },
  title: {
    fontSize: 18,
    ...sharedStyles.semiBold,
    ...sharedStyles.marginBottom12,
  },
  content: {
    ...sharedStyles.gap12,
  },
});
