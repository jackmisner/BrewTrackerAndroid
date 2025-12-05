/**
 * Reset Password Screen
 *
 * Password reset completion screen that allows users to set a new password using
 * a reset token from their email. Includes comprehensive password validation,
 * strength checking, and confirmation matching.
 *
 * Features:
 * - Token validation from URL parameters
 * - Real-time password strength analysis using zxcvbn
 * - Password confirmation matching with visual feedback
 * - Secure password toggle visibility
 * - Comprehensive form validation with error messages
 * - Success screen after successful password reset
 * - Navigation back to login or request new reset link
 * - Test ID support for automated testing
 *
 * Flow:
 * 1. User accesses via reset link with token parameter
 * 2. Token is validated on component mount
 * 3. User enters new password with real-time strength feedback
 * 4. Password confirmation is validated for matching
 * 5. Submit triggers password reset API with token
 * 6. Success shows confirmation with navigation to login
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(auth)/resetPassword?token=abc123');
 * ```
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import zxcvbn from "zxcvbn";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { loginStyles } from "@styles/auth/loginStyles";
import { TEST_IDS } from "@src/constants/testIDs";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

type Strength = "" | "weak" | "medium" | "strong";

const ResetPasswordScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = loginStyles(colors);
  const { resetPassword, isLoading, error, clearError } = useAuth();
  const searchParams = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : searchParams.token;

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const warnedMissingToken = React.useRef(false);

  useEffect(() => {
    if (!token && !warnedMissingToken.current) {
      Alert.alert(
        "Invalid Reset Link",
        "No reset token provided. Please use the link from your email.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
      warnedMissingToken.current = true;
    }
  }, [token]);

  /**
   * Evaluates password strength using the zxcvbn library
   * Maps zxcvbn scores (0-4) to simplified strength levels
   * @param password - Password to evaluate
   * @returns Strength level: "weak", "medium", or "strong"
   */
  const getPasswordStrength = (password: string): Strength => {
    if (!password) {
      return "";
    }

    // Use zxcvbn to evaluate password strength
    const result = zxcvbn(password);

    // Map zxcvbn scores (0-4) to our strength levels
    // 0, 1: weak
    // 2: medium
    // 3, 4: strong
    switch (result.score) {
      case 0:
      case 1:
        return "weak";
      case 2:
        return "medium";
      case 3:
      case 4:
        return "strong";
      default:
        return "weak";
    }
  };

  /**
   * Validates if password meets minimum strength requirements
   * @param password - Password to validate
   * @returns True if password is strong enough, false otherwise
   */
  const isPasswordValid = (password: string, strength?: Strength): boolean => {
    const trimmed = password.trim();
    if (trimmed.length < 8) {
      return false;
    }

    const hasUpper = /[A-Z]/.test(trimmed);
    const hasLower = /[a-z]/.test(trimmed);
    const hasNumber = /\d/.test(trimmed);
    const hasSpecial = /[^A-Za-z0-9]/.test(trimmed);

    if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
      return false;
    }

    const effectiveStrength = strength ?? getPasswordStrength(trimmed);
    // Still use zxcvbn feedback to block obviously weak passwords.
    return effectiveStrength !== "weak";
  };

  /**
   * Handles password reset form submission with comprehensive validation
   * Validates token, password strength, confirmation matching, and whitespace
   * @throws {Error} When validation fails or API request fails
   */
  const handleResetPassword = async (): Promise<void> => {
    if (isLoading) {
      return;
    }
    if (!token) {
      Alert.alert(
        "Error",
        "Invalid reset token. Please request a new password reset."
      );
      return;
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (formData.newPassword !== formData.newPassword.trim()) {
      Alert.alert("Error", "Password cannot start or end with spaces");
      return;
    }

    if (!formData.newPassword.trim()) {
      Alert.alert("Error", "Password cannot be empty");
      return;
    }

    if (!isPasswordValid(formData.newPassword)) {
      Alert.alert(
        "Password Too Weak",
        "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
      );
      return;
    }

    try {
      await resetPassword(token, formData.newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      // Error is handled by the context and displayed through error state
      void UnifiedLogger.error(
        "resetPassword.handleResetPassword",
        "Password reset failed:",
        err
      );
      // Optionally show a fallback alert if context error handling fails
      if (!error) {
        Alert.alert("Error", "Failed to reset password. Please try again.");
      }
    }
  };

  const handleGoToLogin = (): void => {
    clearError();
    router.replace("/(auth)/login");
  };

  const handleRequestNewLink = (): void => {
    clearError();
    router.replace("/(auth)/forgotPassword");
  };

  const passwordsMatch =
    formData.newPassword &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword;
  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.newPassword),
    [formData.newPassword]
  );

  if (success) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={"height"}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <View style={styles.header}>
              <MaterialIcons name="check-circle" size={64} color="#16a34a" />
              <Text style={styles.title}>Password Reset Successful</Text>
              <Text style={styles.subtitle}>
                Your password has been successfully reset!
              </Text>
            </View>

            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                You can now log in with your new password.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.resetPrimaryButton}
                onPress={handleGoToLogin}
                testID={TEST_IDS.auth.goToLoginButton}
              >
                <Text style={styles.resetPrimaryButtonText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={"height"}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <View style={styles.header}>
            <MaterialIcons name="lock-reset" size={64} color="#2563eb" />
            <Text
              style={styles.title}
              testID={TEST_IDS.auth.resetPasswordTitle}
            >
              Reset Password
            </Text>
            <Text style={styles.subtitle}>Enter your new password below.</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            {/* New Password Field */}
            <View style={styles.inputWrapper}>
              <MaterialIcons
                name="lock"
                size={20}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Enter new password"
                placeholderTextColor={colors.textMuted}
                value={formData.newPassword}
                onChangeText={text => {
                  // Don't trim here to allow spaces within password, but validate on submit
                  setFormData(prev => ({ ...prev, newPassword: text }));
                  if (error) {
                    clearError();
                  }
                }}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                <MaterialIcons
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {formData.newPassword ? (
              <View style={styles.passwordStrengthContainer}>
                <Text
                  style={[
                    styles.passwordStrengthText,
                    passwordStrength === "weak" && styles.passwordWeak,
                    passwordStrength === "medium" && styles.passwordMedium,
                    passwordStrength === "strong" && styles.passwordStrong,
                  ]}
                >
                  Password strength: {passwordStrength}
                </Text>
              </View>
            ) : null}

            <Text style={styles.helpText}>
              Password must be at least 8 characters and contain uppercase,
              lowercase, number, and special character.
            </Text>

            {/* Confirm Password Field */}
            <View style={[styles.inputWrapper, { marginTop: 16 }]}>
              <MaterialIcons
                name="lock"
                size={20}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textMuted}
                value={formData.confirmPassword}
                onChangeText={text => {
                  setFormData(prev => ({ ...prev, confirmPassword: text }));
                  if (error) {
                    clearError();
                  }
                }}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="send"
                onSubmitEditing={handleResetPassword}
                testID={TEST_IDS.patterns.inputField("confirm-password")}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {formData.confirmPassword && !passwordsMatch ? (
              <Text style={styles.errorText}>Passwords do not match</Text>
            ) : null}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.resetPrimaryButton,
                (isLoading ||
                  !passwordsMatch ||
                  !isPasswordValid(formData.newPassword, passwordStrength)) &&
                  styles.primaryButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={
                isLoading ||
                !passwordsMatch ||
                !isPasswordValid(formData.newPassword, passwordStrength)
              }
              testID={TEST_IDS.auth.resetPasswordButton}
            >
              <Text
                style={[
                  styles.resetPrimaryButtonText,
                  (isLoading ||
                    !passwordsMatch ||
                    !isPasswordValid(formData.newPassword, passwordStrength)) &&
                    styles.primaryButtonTextDisabled,
                ]}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={handleRequestNewLink}>
              <Text style={styles.linkText}>Request New Reset Link</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>•</Text>
            <TouchableOpacity onPress={handleGoToLogin}>
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;
