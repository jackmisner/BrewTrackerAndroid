import { StyleSheet } from "react-native";
import { sharedStyles } from "@styles/common/sharedStyles";

export const calculatorCardStyles = StyleSheet.create({
  card: {
    ...sharedStyles.cardSpacing,
    borderRadius: 12,
    borderWidth: 1,
    ...sharedStyles.padding16,
    marginHorizontal: 16, // ensure this wins over any margin* from cardSpacing
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
