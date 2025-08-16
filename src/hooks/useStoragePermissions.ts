/**
 * Custom hook for managing modern storage permissions
 *
 * Handles conditional permission requests based on Android version
 * and provides a clean API for permission-related operations.
 */

import { useState, useEffect, useCallback } from "react";
import * as MediaLibrary from "expo-media-library";
import { StorageService, MediaPermission } from "@services/storageService";
import type { DocumentPickerOptions } from "expo-document-picker";

export interface PermissionState {
  granted: boolean;
  loading: boolean;
  error: string | null;
  canRequest: boolean;
}

export interface StoragePermissionsHook {
  mediaPermission: PermissionState;
  requestMediaPermission: (type?: MediaPermission) => Promise<boolean>;
  checkPermissions: () => Promise<void>;
  storageInfo: {
    platform: string;
    androidVersion: number | null;
    isAndroid13Plus: boolean;
    isAndroid10Plus: boolean;
    hasScopedStorage: boolean;
    requiresGranularPermissions: boolean;
  };
}

/**
 * Hook for managing storage permissions across Android versions
 */
export function useStoragePermissions(): StoragePermissionsHook {
  const [mediaPermission, setMediaPermission] = useState<PermissionState>({
    granted: false,
    loading: false,
    error: null,
    canRequest: true,
  });

  const storageInfo = StorageService.getStorageInfo();

  /**
   * Check current permission status
   */
  const checkPermissions = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      setMediaPermission(prev => ({
        ...prev,
        granted: status === "granted",
        canRequest: status !== "denied",
        error: null,
      }));
    } catch (error) {
      setMediaPermission(prev => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Permission check failed",
      }));
    }
  }, []);

  /**
   * Request media library permission
   */
  const requestMediaPermission = useCallback(
    async (type: MediaPermission = "READ_MEDIA_IMAGES"): Promise<boolean> => {
      setMediaPermission(prev => ({ ...prev, loading: true, error: null }));

      try {
        const granted = await StorageService.requestMediaPermissions(type);

        setMediaPermission(prev => ({
          ...prev,
          granted,
          loading: false,
          canRequest: !granted ? false : prev.canRequest, // If denied, can't request again
        }));

        return granted;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Permission request failed";
        setMediaPermission(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    []
  );

  /**
   * Initialize permissions on mount
   */
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    mediaPermission,
    requestMediaPermission,
    checkPermissions,
    storageInfo,
  };
}

/**
 * Hook specifically for document operations (no permissions needed)
 */
export function useDocumentPicker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickDocument = useCallback(async (options?: DocumentPickerOptions) => {
    setLoading(true);
    setError(null);

    try {
      const result = await StorageService.pickDocument(options);
      setLoading(false);

      if (!result.success) {
        setError(result.error || "Document picker failed");
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Document picker failed";
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  const pickMultipleDocuments = useCallback(
    async (options?: DocumentPickerOptions) => {
      return pickDocument({ ...options, multiple: true });
    },
    [pickDocument]
  );

  return {
    pickDocument,
    pickMultipleDocuments,
    loading,
    error,
  };
}

/**
 * Hook for file sharing operations
 */
export function useFileSharing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareFile = useCallback(
    async (content: string, filename: string, mimeType?: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await StorageService.saveAndShareFile(
          content,
          filename,
          mimeType
        );
        setLoading(false);

        if (!result.success) {
          setError(result.error || "File sharing failed");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "File sharing failed";
        setError(errorMessage);
        setLoading(false);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  return {
    shareFile,
    loading,
    error,
  };
}

export default useStoragePermissions;
