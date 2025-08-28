import React, { useState, useEffect } from "react";
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

const ResetPasswordScreen: React.FC = () => {
  const { resetPassword, isLoading, error, clearError } = useAuth();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      Alert.alert(
        "Invalid Reset Link",
        "No reset token provided. Please use the link from your email.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    }
  }, [token]);

  const getPasswordStrength = (password: string): string => {
    if (!password) return "";

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

  const isPasswordValid = (password: string): boolean => {
    return getPasswordStrength(password) === "strong";
  };

  const handleResetPassword = async (): Promise<void> => {
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
    } catch (error) {
      // Error is handled by the context and displayed through error state
      console.error("Password reset failed:", error);
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
  const passwordStrength = getPasswordStrength(formData.newPassword);

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
                  if (error) clearError();
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
                  if (error) clearError();
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
                  !isPasswordValid(formData.newPassword)) &&
                  loginStyles.primaryButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={
                isLoading ||
                !passwordsMatch ||
                !isPasswordValid(formData.newPassword)
              }
              testID={TEST_IDS.auth.resetPasswordButton}
            >
              <Text
                style={[
                  loginStyles.resetPrimaryButtonText,
                  (isLoading ||
                    !passwordsMatch ||
                    !isPasswordValid(formData.newPassword)) &&
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
