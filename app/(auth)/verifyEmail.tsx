/**
 * Email Verification Screen
 *
 * Email verification screen that allows users to verify their email address
 * by entering a verification code sent to their email. Includes automatic
 * verification status checking and resend functionality.
 *
 * Features:
 * - Verification code input with validation
 * - Automatic verification status polling
 * - Resend verification email capability
 * - Loading states for verify and resend operations
 * - Automatic navigation to main app when verified
 * - Error handling with visual feedback
 * - Email address display for user reference
 *
 * Flow:
 * 1. User accesses after registration or from profile
 * 2. Current verification status is checked automatically
 * 3. User enters verification code from email
 * 4. Submit triggers email verification API
 * 5. Success automatically navigates to main app
 * 6. User can request new verification email if needed
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(auth)/verifyEmail');
 * ```
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@contexts/AuthContext";
import { verifyEmailStyles as styles } from "@styles/auth/verifyEmailStyles";

export default function VerifyEmailScreen() {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    user,
    verifyEmail,
    resendVerification,
    checkVerificationStatus,
    error,
    clearError,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check verification status on load
    checkVerificationStatus();
  }, [checkVerificationStatus]);

  useEffect(() => {
    // If user becomes verified, navigate to main app
    if (user?.email_verified) {
      router.replace("/(tabs)");
    }
  }, [user?.email_verified, router]);

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    try {
      clearError();
      setIsLoading(true);
      await verifyEmail(verificationCode.trim());

      Alert.alert(
        "Email Verified",
        "Your email has been successfully verified!",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Verification Failed",
        error.message || "Invalid verification code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      clearError();
      setIsResending(true);
      await resendVerification();

      Alert.alert(
        "Code Sent",
        "A new verification code has been sent to your email address."
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to resend verification code"
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We&apos;ve sent a verification code to{"\n"}
          <Text style={styles.email}>{user?.email}</Text>
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter verification code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            autoCapitalize="none"
            keyboardType="default"
            textAlign="center"
            maxLength={50}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.dividerText}>Didn&apos;t receive the code?</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleResend}
          disabled={isResending || isLoading}
        >
          {isResending ? (
            <ActivityIndicator color="#f4511e" />
          ) : (
            <Text style={styles.secondaryButtonText}>Resend Code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.dividerText}>or</Text>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.linkText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
