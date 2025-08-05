import { StyleSheet } from "react-native";
import { colors } from "../common/colors";
import { buttonStyles } from "../common/buttons";

export const verifyEmailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  email: {
    fontWeight: "600",
    color: colors.text,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    backgroundColor: colors.inputBackground,
    letterSpacing: 1,
  },
  divider: {
    alignItems: "center",
    marginVertical: 20,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  linkText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  // Re-export button styles for consistency
  ...buttonStyles,
});
