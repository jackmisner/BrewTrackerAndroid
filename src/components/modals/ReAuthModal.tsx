/**
 * Re-Authentication Modal Component
 *
 * Modal for re-authenticating users whose sessions have expired.
 * Provides a streamlined login flow without leaving the current screen.
 *
 * Features:
 * - Password-only re-auth (email pre-filled from current user)
 * - Quick device token login if available
 * - Biometric authentication option (if enabled)
 * - Error handling with user feedback
 * - Loading states during authentication
 * - Cancel option to stay in read-only mode
 *
 * @example
 * ```typescript
 * const [showReAuth, setShowReAuth] = useState(false);
 *
 * <ReAuthModal
 *   visible={showReAuth}
 *   onClose={() => setShowReAuth(false)}
 *   onSuccess={() => {
 *     setShowReAuth(false);
 *     Alert.alert("Success", "Re-authenticated successfully!");
 *   }}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { DeviceTokenService } from "@services/auth/DeviceTokenService";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";
import { reAuthModalStyles } from "@styles/components/modals/reAuthModalStyles";

interface ReAuthModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Callback when modal is closed (cancel or backdrop tap)
   */
  onClose: () => void;
  /**
   * Callback when re-authentication succeeds
   */
  onSuccess: () => void;
}

/**
 * Re-Authentication Modal Component
 *
 * Allows users to re-authenticate when their session expires without
 * navigating away from the current screen.
 */
export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user, login, quickLoginWithDeviceToken } = useAuth();
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDeviceToken, setHasDeviceToken] = useState(false);

  // Check for device token on mount
  useEffect(() => {
    const checkDeviceToken = async () => {
      const token = await DeviceTokenService.getDeviceToken();
      setHasDeviceToken(!!token);
    };
    if (visible) {
      checkDeviceToken();
    }
  }, [visible]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPassword("");
      setError(null);
      setShowPassword(false);
    }
  }, [visible]);

  const handlePasswordLogin = useCallback(async () => {
    if (!user?.email) {
      setError("No user email found");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login({ username: user.email, password });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }, [user, password, login, onSuccess]);

  const handleQuickLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await quickLoginWithDeviceToken();
      onSuccess();
    } catch (err) {
      // Quick login failed, show password form
      UnifiedLogger.warn("ReAuthModal", "Quick login failed", { error: err });
      setError("Quick login failed. Please enter your password.");
      setHasDeviceToken(false);
    } finally {
      setIsLoading(false);
    }
  }, [quickLoginWithDeviceToken, onSuccess]);

  const handleCancel = useCallback(() => {
    setPassword("");
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
      testID="reauth-modal"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={reAuthModalStyles.modalOverlay}
      >
        <TouchableOpacity
          style={reAuthModalStyles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
          testID="reauth-modal-backdrop"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View
              style={[
                reAuthModalStyles.modalContent,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <ScrollView
                contentContainerStyle={reAuthModalStyles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={reAuthModalStyles.header}>
                  <MaterialIcons
                    name="lock-clock"
                    size={48}
                    color={colors.warning || "#ff9800"}
                  />
                  <Text
                    style={[reAuthModalStyles.title, { color: colors.text }]}
                    testID="reauth-modal-title"
                  >
                    Session Expired
                  </Text>
                  <Text
                    style={[
                      reAuthModalStyles.subtitle,
                      { color: colors.textSecondary },
                    ]}
                    testID="reauth-modal-subtitle"
                  >
                    Please re-authenticate to continue
                  </Text>
                </View>

                {/* Quick Login Option */}
                {hasDeviceToken && (
                  <TouchableOpacity
                    style={[
                      reAuthModalStyles.quickLoginButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleQuickLogin}
                    disabled={isLoading}
                    testID="reauth-quick-login-button"
                  >
                    <MaterialIcons name="fingerprint" size={24} color="#fff" />
                    <Text style={reAuthModalStyles.quickLoginText}>
                      Use Trusted Device
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                {hasDeviceToken && (
                  <View style={reAuthModalStyles.divider}>
                    <View
                      style={[
                        reAuthModalStyles.dividerLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <Text
                      style={[
                        reAuthModalStyles.dividerText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      or
                    </Text>
                    <View
                      style={[
                        reAuthModalStyles.dividerLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </View>
                )}

                {/* Email (read-only) */}
                <View style={reAuthModalStyles.inputGroup}>
                  <Text
                    style={[
                      reAuthModalStyles.label,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Email
                  </Text>
                  <View
                    style={[
                      reAuthModalStyles.input,
                      reAuthModalStyles.readOnlyInput,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        reAuthModalStyles.inputText,
                        { color: colors.text },
                      ]}
                    >
                      {user?.email || "No email"}
                    </Text>
                  </View>
                </View>

                {/* Password Input */}
                <View style={reAuthModalStyles.inputGroup}>
                  <Text
                    style={[
                      reAuthModalStyles.label,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Password
                  </Text>
                  <View style={reAuthModalStyles.passwordContainer}>
                    <TextInput
                      style={[
                        reAuthModalStyles.input,
                        reAuthModalStyles.passwordInput,
                        { color: colors.text, borderColor: colors.border },
                      ]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={handlePasswordLogin}
                      returnKeyType="done"
                      editable={!isLoading}
                      testID="reauth-password-input"
                    />
                    <TouchableOpacity
                      style={reAuthModalStyles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      testID="reauth-toggle-password-visibility"
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility" : "visibility-off"}
                        size={24}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error Message */}
                {error && (
                  <View
                    style={[
                      reAuthModalStyles.errorContainer,
                      { backgroundColor: `${colors.error}20` },
                    ]}
                    testID="reauth-error-message"
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={20}
                      color={colors.error}
                    />
                    <Text
                      style={[
                        reAuthModalStyles.errorText,
                        { color: colors.error },
                      ]}
                    >
                      {error}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={reAuthModalStyles.buttonContainer}>
                  <TouchableOpacity
                    style={[
                      reAuthModalStyles.button,
                      reAuthModalStyles.cancelButton,
                      { borderColor: colors.border },
                    ]}
                    onPress={handleCancel}
                    disabled={isLoading}
                    testID="reauth-cancel-button"
                  >
                    <Text
                      style={[
                        reAuthModalStyles.cancelButtonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      reAuthModalStyles.button,
                      reAuthModalStyles.loginButton,
                      { backgroundColor: colors.primary },
                      (isLoading || !password.trim()) &&
                        reAuthModalStyles.disabledButton,
                    ]}
                    onPress={handlePasswordLogin}
                    disabled={isLoading || !password.trim()}
                    testID="reauth-submit-button"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={reAuthModalStyles.loginButtonText}>
                        Re-authenticate
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ReAuthModal;
