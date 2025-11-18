/**
 * Tests for BiometricEnrollmentModal component
 *
 * Tests the biometric enrollment prompt that appears on the dashboard
 * after successful login when biometrics are available but not enabled.
 */

import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { BiometricEnrollmentModal } from "@src/components/BiometricEnrollmentModal";
import {
  BiometricService,
  BiometricErrorCode,
} from "@services/BiometricService";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));

jest.mock("@services/BiometricService", () => ({
  BiometricService: {
    getBiometricTypeName: jest.fn(),
    isBiometricAvailable: jest.fn(),
    isBiometricEnabled: jest.fn(),
    enableBiometrics: jest.fn(),
    disableBiometrics: jest.fn(),
    authenticateWithBiometrics: jest.fn(),
  },
  BiometricErrorCode: {
    USER_CANCELLED: "USER_CANCELLED",
    SYSTEM_CANCELLED: "SYSTEM_CANCELLED",
    LOCKOUT: "LOCKOUT",
    NOT_ENROLLED: "NOT_ENROLLED",
    USER_FALLBACK: "USER_FALLBACK",
    NOT_ENABLED: "NOT_ENABLED",
    NOT_AVAILABLE: "NOT_AVAILABLE",
    CREDENTIALS_NOT_FOUND: "CREDENTIALS_NOT_FOUND",
    VERIFICATION_FAILED: "VERIFICATION_FAILED",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
  },
}));

jest.mock("@services/logger/UnifiedLogger", () => ({
  UnifiedLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock functions - defined before jest.mock to avoid TDZ
const mockEnableBiometrics = jest.fn();

jest.mock("@contexts/AuthContext", () => ({
  useAuth: () => ({
    enableBiometrics: mockEnableBiometrics,
  }),
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      primary: "#f4511e",
      text: "#000000",
      textMuted: "#666666",
      background: "#ffffff",
    },
  }),
}));

// Mock Alert
const alertSpy = jest.spyOn(Alert, "alert");
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
const mockSecureStoreGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSecureStoreDeleteItem = SecureStore.deleteItemAsync as jest.Mock;
const mockGetBiometricTypeName =
  BiometricService.getBiometricTypeName as jest.Mock;

describe("BiometricEnrollmentModal", () => {
  // Helper function to setup biometric enrollment mocks
  const setupBiometricPrompt = (
    username: string = "testuser",
    password: string = "testpass"
  ) => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "show_biometric_prompt") {
        return Promise.resolve("true");
      }
      if (key === "biometric_prompt_username") {
        return Promise.resolve(username);
      }
      return Promise.resolve(null);
    });
    mockSecureStoreGetItem.mockResolvedValue(password);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBiometricTypeName.mockResolvedValue("Fingerprint");
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  describe("initial render and flag checking", () => {
    it("should not render modal when no flags are set", async () => {
      mockGetItem.mockResolvedValue(null);

      const { queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprint/i)).toBeNull();
      });
    });

    it("should not render modal when show_biometric_prompt is false", async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === "show_biometric_prompt") {
          return Promise.resolve("false");
        }
        if (key === "biometric_prompt_username") {
          return Promise.resolve("testuser");
        }
        return Promise.resolve(null);
      });

      const { queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprint/i)).toBeNull();
      });
    });

    it("should not render modal when username is missing", async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === "show_biometric_prompt") {
          return Promise.resolve("true");
        }
        if (key === "biometric_prompt_username") {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const { queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprint/i)).toBeNull();
      });
    });

    it("should render modal when flags are set correctly", async () => {
      setupBiometricPrompt();

      const { getByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });
    });

    it("should clear AsyncStorage flags after showing modal", async () => {
      setupBiometricPrompt();
      mockRemoveItem.mockResolvedValue(undefined);
      mockSecureStoreDeleteItem.mockResolvedValue(undefined);

      render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith("show_biometric_prompt");
        expect(mockRemoveItem).toHaveBeenCalledWith(
          "biometric_prompt_username"
        );
        expect(mockSecureStoreDeleteItem).toHaveBeenCalledWith(
          "biometric_prompt_password"
        );
      });
    });
  });

  describe("biometric type display", () => {
    it("should display Face Recognition type", async () => {
      mockGetBiometricTypeName.mockResolvedValue("Face Recognition");
      setupBiometricPrompt();

      const { getByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Face Recognitions\?/i)).toBeTruthy();
      });
    });

    it("should display Biometric type as fallback", async () => {
      mockGetBiometricTypeName.mockResolvedValue("Biometric");
      setupBiometricPrompt();

      const { getByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Biometrics\?/i)).toBeTruthy();
      });
    });
  });

  describe("enabling biometrics", () => {
    beforeEach(() => {
      setupBiometricPrompt();
    });

    it("should call enableBiometrics with username and password when enable button is pressed", async () => {
      mockEnableBiometrics.mockResolvedValue(undefined);

      const { getByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const enableButton = getByText(/Enable Fingerprints$/i);
      fireEvent.press(enableButton);

      await waitFor(() => {
        expect(mockEnableBiometrics).toHaveBeenCalledWith(
          "testuser",
          "testpass"
        );
      });
    });

    it("should hide modal and show success alert after enabling", async () => {
      mockEnableBiometrics.mockResolvedValue(undefined);

      const { getByText, queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const enableButton = getByText(/Enable Fingerprints$/i);
      fireEvent.press(enableButton);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprints\?/i)).toBeNull();
        expect(Alert.alert).toHaveBeenCalledWith(
          "Success",
          expect.stringContaining("Fingerprint authentication enabled")
        );
      });
    });

    it("should handle user cancellation gracefully", async () => {
      const error = new Error("User cancelled");
      (error as any).errorCode = BiometricErrorCode.USER_CANCELLED;
      mockEnableBiometrics.mockRejectedValue(error);

      const { getByText, queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const enableButton = getByText(/Enable Fingerprints$/i);
      fireEvent.press(enableButton);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprints\?/i)).toBeNull();
        // Should not show error alert for user cancellation
        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });

    it("should handle system cancellation gracefully", async () => {
      const error = new Error("System cancelled");
      (error as any).errorCode = BiometricErrorCode.SYSTEM_CANCELLED;
      mockEnableBiometrics.mockRejectedValue(error);

      const { getByText, queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const enableButton = getByText(/Enable Fingerprints$/i);
      fireEvent.press(enableButton);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprints\?/i)).toBeNull();
        // Should not show error alert for system cancellation
        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });

    it("should show error alert for other errors", async () => {
      const error = new Error("Hardware error");
      (error as any).errorCode = BiometricErrorCode.NOT_AVAILABLE;
      mockEnableBiometrics.mockRejectedValue(error);

      const { getByText, queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const enableButton = getByText(/Enable Fingerprints$/i);
      fireEvent.press(enableButton);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprints\?/i)).toBeNull();
        expect(Alert.alert).toHaveBeenCalledWith(
          "Error",
          expect.stringContaining("Failed to enable")
        );
      });
    });

    it("should not show modal if username is missing from storage", async () => {
      // Test the guard: modal should not appear if username is null
      mockGetItem.mockImplementation((key: string) => {
        if (key === "show_biometric_prompt") {
          return Promise.resolve("true");
        }
        if (key === "biometric_prompt_username") {
          return Promise.resolve(null); // No username stored
        }
        return Promise.resolve(null);
      });

      const { queryByText } = render(<BiometricEnrollmentModal />);

      // Modal should not show when username is missing
      await waitFor(
        () => {
          expect(queryByText(/Enable Fingerprints\?/i)).toBeNull();
        },
        { timeout: 1000 }
      );

      // enableBiometrics should never be called
      expect(mockEnableBiometrics).not.toHaveBeenCalled();
    });
  });

  describe("skipping biometrics", () => {
    beforeEach(() => {
      setupBiometricPrompt();
    });

    it("should hide modal when skip button is pressed", async () => {
      const { getByText, queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const skipButton = getByText("Skip");
      fireEvent.press(skipButton);

      await waitFor(() => {
        expect(queryByText(/Enable Fingerprints\?/i)).toBeNull();
      });
    });

    it("should not call enableBiometrics when skip is pressed", async () => {
      const { getByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const skipButton = getByText("Skip");
      fireEvent.press(skipButton);

      await waitFor(() => {
        expect(mockEnableBiometrics).not.toHaveBeenCalled();
      });
    });

    it("should not show any alerts when skip is pressed", async () => {
      const { getByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        expect(getByText(/Enable Fingerprints\?/i)).toBeTruthy();
      });

      const skipButton = getByText("Skip");
      fireEvent.press(skipButton);

      await waitFor(() => {
        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should handle AsyncStorage errors gracefully when checking flags", async () => {
      mockGetItem.mockRejectedValue(new Error("Storage error"));

      const { queryByText } = render(<BiometricEnrollmentModal />);

      // Should not crash and should not show modal
      await waitFor(() => {
        expect(queryByText(/Enable/i)).toBeNull();
      });
    });

    it("should handle getBiometricTypeName errors gracefully", async () => {
      mockGetBiometricTypeName.mockRejectedValue(new Error("Hardware error"));
      setupBiometricPrompt();

      // Mock console.error to verify no uncaught errors
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const { getByText, queryByText } = render(<BiometricEnrollmentModal />);

      await waitFor(() => {
        // When getBiometricTypeName fails, modal should still render with default "Biometric" type
        expect(getByText(/Enable Biometrics\?/i)).toBeTruthy();
        expect(queryByText(/Skip/i)).toBeTruthy();
      });

      // Verify no uncaught errors were thrown
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
