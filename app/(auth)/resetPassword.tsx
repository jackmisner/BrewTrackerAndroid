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
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import zxcvbn from "zxcvbn";
import { useAuth } from "@contexts/AuthContext";
import { loginStyles } from "@styles/auth/loginStyles";
import { TEST_IDS } from "@src/constants/testIDs";

type Strength = "" | "weak" | "medium" | "strong";

const ResetPasswordScreen: React.FC = () => {
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
      console.error("Password reset failed:", err);
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
      <KeyboardAvoidingView
        style={loginStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={loginStyles.scrollContainer}>
          <View style={loginStyles.formContainer}>
            <View style={loginStyles.header}>
              <MaterialIcons name="check-circle" size={64} color="#16a34a" />
              <Text style={loginStyles.title}>Password Reset Successful</Text>
              <Text style={loginStyles.subtitle}>
                Your password has been successfully reset!
              </Text>
            </View>

            <View style={loginStyles.successContainer}>
              <Text style={loginStyles.successText}>
                You can now log in with your new password.
              </Text>
            </View>

            <View style={loginStyles.buttonContainer}>
              <TouchableOpacity
                style={loginStyles.resetPrimaryButton}
                onPress={handleGoToLogin}
                testID={TEST_IDS.auth.goToLoginButton}
              >
                <Text style={loginStyles.resetPrimaryButtonText}>
                  Go to Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={loginStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={loginStyles.scrollContainer}>
        <View style={loginStyles.formContainer}>
          <View style={loginStyles.header}>
            <MaterialIcons name="lock-reset" size={64} color="#2563eb" />
            <Text
              style={loginStyles.title}
              testID={TEST_IDS.auth.resetPasswordTitle}
            >
              Reset Password
            </Text>
            <Text style={loginStyles.subtitle}>
              Enter your new password below.
            </Text>
          </View>

          {error ? (
            <View style={loginStyles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#dc2626" />
              <Text style={loginStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={loginStyles.inputContainer}>
            {/* New Password Field */}
            <View style={loginStyles.inputWrapper}>
              <MaterialIcons
                name="lock"
                size={20}
                color="#6b7280"
                style={loginStyles.inputIcon}
              />
              <TextInput
                style={[loginStyles.input, { paddingRight: 50 }]}
                placeholder="Enter new password"
                placeholderTextColor="#9ca3af"
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
                style={loginStyles.passwordToggle}
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
              <View style={loginStyles.passwordStrengthContainer}>
                <Text
                  style={[
                    loginStyles.passwordStrengthText,
                    passwordStrength === "weak" && loginStyles.passwordWeak,
                    passwordStrength === "medium" && loginStyles.passwordMedium,
                    passwordStrength === "strong" && loginStyles.passwordStrong,
                  ]}
                >
                  Password strength: {passwordStrength}
                </Text>
              </View>
            ) : null}

            <Text style={loginStyles.helpText}>
              Password must be at least 8 characters and contain uppercase,
              lowercase, number, and special character.
            </Text>

            {/* Confirm Password Field */}
            <View style={[loginStyles.inputWrapper, { marginTop: 16 }]}>
              <MaterialIcons
                name="lock"
                size={20}
                color="#6b7280"
                style={loginStyles.inputIcon}
              />
              <TextInput
                style={[loginStyles.input, { paddingRight: 50 }]}
                placeholder="Confirm new password"
                placeholderTextColor="#9ca3af"
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
                style={loginStyles.passwordToggle}
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
              <Text style={loginStyles.errorText}>Passwords do not match</Text>
            ) : null}
          </View>

          <View style={loginStyles.buttonContainer}>
            <TouchableOpacity
              style={[
                loginStyles.resetPrimaryButton,
                (isLoading ||
                  !passwordsMatch ||
                  !isPasswordValid(formData.newPassword, passwordStrength)) &&
                  loginStyles.primaryButtonDisabled,
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
                  loginStyles.resetPrimaryButtonText,
                  (isLoading ||
                    !passwordsMatch ||
                    !isPasswordValid(formData.newPassword, passwordStrength)) &&
                    loginStyles.primaryButtonTextDisabled,
                ]}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={loginStyles.footerLinks}>
            <TouchableOpacity onPress={handleRequestNewLink}>
              <Text style={loginStyles.linkText}>Request New Reset Link</Text>
            </TouchableOpacity>
            <Text style={loginStyles.linkSeparator}>•</Text>
            <TouchableOpacity onPress={handleGoToLogin}>
              <Text style={loginStyles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;
