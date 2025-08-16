/**
 * Modern Storage Service for BrewTracker Android
 *
 * Provides scoped storage APIs for file operations using modern Android APIs.
 * Handles conditional permission requests based on Android version.
 *
 * Migration from deprecated WRITE_EXTERNAL_STORAGE/READ_EXTERNAL_STORAGE
 * to scoped storage APIs (MediaLibrary, DocumentPicker, SAF).
 */

import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

/**
 * Android API levels for permission handling
 */
const ANDROID_API_LEVELS = {
  ANDROID_13: 33, // Scoped storage mandatory
  ANDROID_10: 29, // Scoped storage introduced
} as const;

/**
 * Storage permission types for Android 13+
 */
export type MediaPermission =
  | "READ_MEDIA_IMAGES"
  | "READ_MEDIA_VIDEO"
  | "READ_MEDIA_AUDIO";

/**
 * File operation results
 */
export interface FileOperationResult {
  success: boolean;
  uri?: string;
  error?: string;
}

export interface DocumentPickerResult {
  success: boolean;
  documents?: DocumentPicker.DocumentPickerAsset[];
  error?: string;
}

/**
 * Modern storage service using scoped storage APIs
 */
export class StorageService {
  /**
   * Check if running on Android 13+ (API 33+)
   */
  private static isAndroid13Plus(): boolean {
    if (Platform.OS !== "android") return false;
    return Platform.Version >= ANDROID_API_LEVELS.ANDROID_13;
  }

  /**
   * Check if running on Android 10+ (API 29+)
   */
  private static isAndroid10Plus(): boolean {
    if (Platform.OS !== "android") return false;
    return Platform.Version >= ANDROID_API_LEVELS.ANDROID_10;
  }

  /**
   * Request media library permissions based on Android version
   * @param mediaType - Currently unused, reserved for future granular permission handling
   */
  static async requestMediaPermissions(
    _mediaType: MediaPermission = "READ_MEDIA_IMAGES"
  ): Promise<boolean> {
    try {
      if (Platform.OS !== "android") {
        // iOS uses photo library permissions through MediaLibrary
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === "granted";
      }

      if (this.isAndroid13Plus()) {
        // Android 13+: Use granular media permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === "granted";
      } else {
        // Android < 13: Use legacy READ_EXTERNAL_STORAGE (fallback only)
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === "granted";
      }
    } catch (error) {
      console.error("Error requesting media permissions:", error);
      return false;
    }
  }

  /**
   * Pick documents using Document Picker (no permissions required)
   * Uses Storage Access Framework (SAF) - modern approach
   */
  static async pickDocument(
    options: DocumentPicker.DocumentPickerOptions = {}
  ): Promise<DocumentPickerResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
        ...options,
      });

      if (!result.canceled && result.assets) {
        return {
          success: true,
          documents: result.assets,
        };
      }

      return {
        success: false,
        error: "Document selection cancelled",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Document picker failed",
      };
    }
  }

  /**
   * Pick multiple documents
   */
  static async pickMultipleDocuments(
    options: DocumentPicker.DocumentPickerOptions = {}
  ): Promise<DocumentPickerResult> {
    return this.pickDocument({
      ...options,
      multiple: true,
    });
  }

  /**
   * Save file to user-accessible location using sharing
   * Modern alternative to WRITE_EXTERNAL_STORAGE
   */
  static async saveAndShareFile(
    content: string,
    filename: string,
    mimeType: string = "application/octet-stream"
  ): Promise<FileOperationResult> {
    try {
      // Create temporary file
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      // Share file (allows user to choose where to save)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Save ${filename}`,
        });

        return {
          success: true,
          uri: fileUri,
        };
      } else {
        return {
          success: false,
          error: "Sharing not available on this platform",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "File save failed",
      };
    }
  }

  /**
   * Save image to media library (requires permission)
   */
  static async saveImageToMediaLibrary(
    imageUri: string,
    albumName?: string
  ): Promise<FileOperationResult> {
    try {
      const hasPermission =
        await this.requestMediaPermissions("READ_MEDIA_IMAGES");
      if (!hasPermission) {
        return {
          success: false,
          error: "Media library permission denied",
        };
      }

      const asset = await MediaLibrary.createAssetAsync(imageUri);

      if (albumName && this.isAndroid10Plus()) {
        // Create or get album (Android 10+ with scoped storage)
        const album = await MediaLibrary.getAlbumAsync(albumName);
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync(albumName, asset, false);
        }
      }

      return {
        success: true,
        uri: asset.uri,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Image save failed",
      };
    }
  }

  /**
   * Read file from document picker result
   */
  static async readDocumentFile(
    documentUri: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const content = await FileSystem.readAsStringAsync(documentUri);
      return {
        success: true,
        content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "File read failed",
      };
    }
  }

  /**
   * Get platform-specific storage information
   */
  static getStorageInfo() {
    return {
      platform: Platform.OS,
      androidVersion: Platform.OS === "android" ? Platform.Version : null,
      isAndroid13Plus: this.isAndroid13Plus(),
      isAndroid10Plus: this.isAndroid10Plus(),
      hasScopedStorage: this.isAndroid10Plus(),
      requiresGranularPermissions: this.isAndroid13Plus(),
    };
  }
}

/**
 * BeerXML specific file operations
 */
export class BeerXMLService {
  /**
   * Import BeerXML file
   */
  static async importBeerXML(): Promise<{
    success: boolean;
    content?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      const result = await StorageService.pickDocument({
        type: ["application/xml", "text/xml", "*/*"],
      });

      if (!result.success || !result.documents?.[0]) {
        return {
          success: false,
          error: result.error || "No file selected",
        };
      }

      const document = result.documents[0];
      const content = await StorageService.readDocumentFile(document.uri);

      if (!content.success) {
        return {
          success: false,
          error: content.error,
        };
      }

      return {
        success: true,
        content: content.content,
        filename: document.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "BeerXML import failed",
      };
    }
  }

  /**
   * Export BeerXML file
   */
  static async exportBeerXML(
    xmlContent: string,
    recipeName: string
  ): Promise<FileOperationResult> {
    const sanitizedName = recipeName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") // Sanitize invalid filename characters
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim() // Remove leading/trailing whitespace
      .replace(/\.+$/, ""); // Remove trailing periods

    const baseName = sanitizedName || "recipe";
    const truncatedName = baseName.slice(0, 200);
    const filename = `${truncatedName}_recipe.xml`;
    return StorageService.saveAndShareFile(
      xmlContent,
      filename,
      "application/xml"
    );
  }
}

export default StorageService;
