/**
 * @fileoverview User registration screen for new account creation
 *
 * @description
 * This screen handles new user account creation with comprehensive form validation,
 * secure password handling, and integration with the authentication system. It provides
 * a user-friendly registration flow with proper error handling and email verification
 * requirements.
 *
 * @key_features
 * - Multi-field registration form (username, email, password, confirm password)
 * - Client-side form validation with immediate feedback
 * - Email format validation using regex patterns
 * - Password strength requirements (minimum 6 characters)
 * - Password confirmation matching validation
 * - Loading states with activity indicators
 * - Keyboard-aware scrollable interface
 *
 * @navigation_patterns
 * - Navigation from login screen for new users
 * - Automatic redirect to login after successful registration
 * - Back navigation to login screen for existing users
 * - Modal alert flow for registration success/failure
 *
 * @security_considerations
 * - Secure password input with secureTextEntry
 * - Client-side validation prevents malformed data submission
 * - JWT token handling through AuthContext
 * - Email verification requirement before account access
 * - Secure storage of authentication tokens in SecureStore
 * - Error messages protect against information disclosure
 *
 * @data_handling
 * - Form state managed with React hooks
 * - Real-time validation feedback for user experience
 * - Secure API communication for account creation
 * - Error handling with user-friendly messages
 * - Authentication context integration for state management
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@contexts/AuthContext";
import { registerStyles as styles } from "@styles/auth/registerStyles";
import { TEST_IDS } from "@src/constants/testIDs";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register, error, clearError } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      setIsLoading(true);
      await register({ username, email, password });

      Alert.alert(
        "Registration Successful",
        "Please check your email to verify your account before signing in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Registration Failed",
        "An error occurred during registration. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="height">
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the BrewTracker community</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRegister}
            disabled={isLoading}
            testID={TEST_IDS.auth.registerButton}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <Text style={styles.dividerText}>Already have an account?</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={navigateToLogin}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
