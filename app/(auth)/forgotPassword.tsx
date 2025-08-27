import React, { useState } from "react";
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
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import { loginStyles } from "@styles/auth/loginStyles";

const ForgotPasswordScreen: React.FC = () => {
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = async (): Promise<void> => {
    if (isLoading) return;
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      await forgotPassword(email.trim());
      setEmailSent(true);
    } catch {
      // Error is handled by the context and displayed through error state
    }
  };

  const handleBackToLogin = (): void => {
    clearError();
    router.replace("/(auth)/login");
  };

  const handleCreateAccount = (): void => {
    clearError();
    router.replace("/(auth)/register");
  };

  if (emailSent) {
    return (
      <KeyboardAvoidingView
        style={loginStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={loginStyles.scrollContainer}>
          <View style={loginStyles.formContainer}>
            <View style={loginStyles.header}>
              <MaterialIcons name="mail-outline" size={64} color="#2563eb" />
              <Text style={loginStyles.title}>Check Your Email</Text>
              <Text style={loginStyles.subtitle}>
                If an account with that email exists, you should receive a
                password reset link shortly.
              </Text>
            </View>

            <View style={loginStyles.successContainer}>
              <Text style={loginStyles.successText}>
                Please check your email inbox and spam folder for the password
                reset link.
              </Text>
              <Text style={loginStyles.successSubtext}>
                The reset link will expire in 1 hour for security reasons.
              </Text>
            </View>

            <View style={loginStyles.buttonContainer}>
              <TouchableOpacity
                style={loginStyles.resetPrimaryButton}
                onPress={handleBackToLogin}
              >
                <Text style={loginStyles.resetPrimaryButtonText}>
                  Back to Login
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
            <MaterialIcons name="lock-outline" size={64} color="#2563eb" />
            <Text style={loginStyles.title}>Forgot Password</Text>
            <Text style={loginStyles.subtitle}>
              {
                "Enter your email address and we'll send you a link to reset your password."
              }
            </Text>
          </View>

          {error ? (
            <View style={loginStyles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#dc2626" />
              <Text style={loginStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={loginStyles.inputContainer}>
            <View style={loginStyles.inputWrapper}>
              <MaterialIcons
                name="email"
                size={20}
                color="#6b7280"
                style={loginStyles.inputIcon}
              />
              <TextInput
                style={loginStyles.input}
                placeholder="Enter your email address"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (error) clearError();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="send"
                onSubmitEditing={handleForgotPassword}
              />
            </View>
          </View>

          <View style={loginStyles.buttonContainer}>
            <TouchableOpacity
              style={[
                loginStyles.resetPrimaryButton,
                (isLoading || !email.trim() || !validateEmail(email.trim())) &&
                  loginStyles.primaryButtonDisabled,
              ]}
              onPress={handleForgotPassword}
              disabled={
                isLoading || !email.trim() || !validateEmail(email.trim())
              }
            >
              <Text
                style={[
                  loginStyles.resetPrimaryButtonText,
                  (isLoading ||
                    !email.trim() ||
                    !validateEmail(email.trim())) &&
                    loginStyles.primaryButtonTextDisabled,
                ]}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={loginStyles.footerLinks}>
            <TouchableOpacity onPress={handleBackToLogin}>
              <Text style={loginStyles.linkText}>Back to Login</Text>
            </TouchableOpacity>
            <Text style={loginStyles.linkSeparator}>•</Text>
            <TouchableOpacity onPress={handleCreateAccount}>
              <Text style={loginStyles.linkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
