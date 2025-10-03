/**
 * Modern Storage Service for BrewTracker Android
 *
 * Provides scoped storage APIs for file operations using modern Android APIs.
 * Handles conditional permission requests based on Android version.
 *
 * Migration from deprecated WRITE_EXTERNAL_STORAGE/READ_EXTERNAL_STORAGE
 * to scoped storage APIs (MediaLibrary, DocumentPicker, SAF).
 *
 * Extended for offline functionality with data persistence, sync management,
 * and offline-first storage patterns for React Query cache integration.
 */

import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { File, Directory, Paths } from "expo-file-system";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@services/config";

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
    if (Platform.OS !== "android") {
      return false;
    }
    return Platform.Version >= ANDROID_API_LEVELS.ANDROID_13;
  }

  /**
   * Check if running on Android 10+ (API 29+)
   */
  private static isAndroid10Plus(): boolean {
    if (Platform.OS !== "android") {
      return false;
    }
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
      const file = new File(Paths.cache, filename);
      await file.create();
      await file.write(content, { encoding: "utf8" });
      const fileUri = file.uri;

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
      // Note: MediaLibrary.createAssetAsync handles its own permissions
      // but we can still check if permissions are available
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
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
      // Create file instance from URI
      const file = new File(documentUri);
      if (!file.exists) {
        return {
          success: false,
          error: "File not found at the specified URI",
        };
      }
      const content = await file.text();
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
   * Export BeerXML file with directory selection or sharing (fallback)
   */
  static async exportBeerXML(
    xmlContent: string,
    recipeName: string
  ): Promise<
    FileOperationResult & {
      method?: "directory" | "share";
      userCancelled?: boolean;
    }
  > {
    // Try Storage Access Framework first for directory selection
    const safResult = await BeerXMLService.exportBeerXMLWithDirectoryChoice(
      xmlContent,
      recipeName
    );

    if (safResult.success) {
      return { ...safResult, method: "directory" };
    }

    // If user cancelled directory selection, fall back to sharing
    if (safResult.userCancelled) {
    } else {
      console.warn(
        "🍺 BeerXML Export - SAF failed, falling back to sharing:",
        safResult.error
      );
    }

    // Fallback to current sharing method
    const sanitizedName = recipeName
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_") // Sanitize invalid filename characters
      .replace(/\s+/g, "_") // Replace multiple spaces with underscores
      .trim() // Remove leading/trailing whitespace
      .replace(/\.+$/, ""); // Remove trailing periods

    const baseName = sanitizedName || "recipe";
    const truncatedName = baseName.slice(0, 200);
    const filename = `${truncatedName}_recipe.xml`;

    const shareResult = await StorageService.saveAndShareFile(
      xmlContent,
      filename,
      "application/xml"
    );

    return { ...shareResult, method: "share" };
  }

  /**
   * Export BeerXML with user directory selection
   */
  static async exportBeerXMLWithDirectoryChoice(
    xmlContent: string,
    recipeName: string
  ): Promise<FileOperationResult & { userCancelled?: boolean }> {
    try {
      // Sanitize filename for filesystem
      const sanitizedName = recipeName
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
        .replace(/\s+/g, "_")
        .trim()
        .replace(/\.+$/, "");

      const baseName = sanitizedName || "recipe";
      const truncatedName = baseName.slice(0, 200);
      const filename = `${truncatedName}_recipe.xml`;

      // Use Directory.pickDirectoryAsync for directory selection
      const directory = await Directory.pickDirectoryAsync();

      if (!directory) {
        return {
          success: false,
          error: "Directory selection cancelled",
          userCancelled: true,
        };
      }

      // Validate filename doesn't contain path separators after sanitization
      if (filename.includes("/") || filename.includes("\\")) {
        return {
          success: false,
          error: "Invalid filename",
        };
      }

      // Create file in selected directory
      const file = new File(directory.uri, filename);

      // Check if file exists and handle appropriately
      if (file.exists) {
        await file.delete();
      }

      await file.create();
      await file.write(xmlContent, { encoding: "utf8" });

      return {
        success: true,
        uri: file.uri,
      };
    } catch (error) {
      console.error("🍺 BeerXML Export - Directory choice error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "File save failed",
      };
    }
  }
}

/**
 * Offline Data Management Service
 *
 * Handles offline data storage, sync operations, and cache management
 * for React Query integration and offline-first functionality.
 */
export class OfflineStorageService {
  /**
   * Store offline recipes data
   */
  static async storeOfflineRecipes(recipes: any[]): Promise<boolean> {
    try {
      // Validate input
      if (!Array.isArray(recipes)) {
        console.error("Invalid recipes data: expected array");
        return false;
      }

      // Check size limits (e.g., 10MB)
      const dataSize = JSON.stringify(recipes).length;
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (dataSize > MAX_SIZE) {
        console.error(
          `Recipe data too large: ${dataSize} bytes exceeds ${MAX_SIZE} bytes limit`
        );
        return false;
      }

      const timestamp = Date.now();
      const offlineData = {
        recipes,
        timestamp,
        version: 1,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_RECIPES,
        JSON.stringify(offlineData)
      );

      return true;
    } catch (error) {
      console.error("Failed to store offline recipes:", error);
      return false;
    }
  }

  /**
   * Get offline recipes data
   */
  static async getOfflineRecipes(): Promise<{
    success: boolean;
    recipes?: any[];
    timestamp?: number;
    error?: string;
  }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_RECIPES);

      if (!data) {
        return {
          success: true,
          recipes: [],
        };
      }

      const parsed = JSON.parse(data);

      return {
        success: true,
        recipes: parsed.recipes || [],
        timestamp: parsed.timestamp,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load offline recipes",
      };
    }
  }

  /**
   * Store cached ingredients data
   */
  static async storeCachedIngredients(ingredients: any[]): Promise<boolean> {
    try {
      // Validate input
      if (!Array.isArray(ingredients)) {
        console.error("Invalid ingredients data: expected array");
        return false;
      }

      // Check size limits
      const dataSize = JSON.stringify(ingredients).length;
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB for ingredients
      if (dataSize > MAX_SIZE) {
        console.error(
          `Ingredients data too large: ${dataSize} bytes exceeds ${MAX_SIZE} bytes limit`
        );
        return false;
      }

      const timestamp = Date.now();
      const cachedData = {
        ingredients,
        timestamp,
        version: 1,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_INGREDIENTS,
        JSON.stringify(cachedData)
      );

      return true;
    } catch (error) {
      console.error("Failed to cache ingredients:", error);
      return false;
    }
  }

  /**
   * Get cached ingredients data
   */
  static async getCachedIngredients(): Promise<{
    success: boolean;
    ingredients?: any[];
    timestamp?: number;
    isStale?: boolean;
    error?: string;
  }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_INGREDIENTS);

      if (!data) {
        return {
          success: true,
          ingredients: [],
        };
      }

      const parsed = JSON.parse(data);
      const timestamp = parsed.timestamp || 0;
      const now = Date.now();

      // Consider ingredients stale after 24 hours
      const isStale = now - timestamp > 24 * 60 * 60 * 1000;

      return {
        success: true,
        ingredients: parsed.ingredients || [],
        timestamp,
        isStale,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load cached ingredients",
      };
    }
  }

  /**
   * Store last sync timestamp
   */
  static async updateLastSync(
    timestamp: number = Date.now()
  ): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
      return true;
    } catch (error) {
      console.error("Failed to update last sync timestamp:", error);
      return false;
    }
  }

  /**
   * Get last sync timestamp
   */
  static async getLastSync(): Promise<number | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (!raw) {
        return null;
      }
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    } catch (error) {
      console.error("Failed to get last sync timestamp:", error);
      return null;
    }
  }

  /**
   * Clear all offline data
   */
  static async clearOfflineData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.OFFLINE_RECIPES,
        STORAGE_KEYS.CACHED_INGREDIENTS,
        STORAGE_KEYS.LAST_SYNC,
      ]);

      return true;
    } catch (error) {
      console.error("Failed to clear offline data:", error);
      return false;
    }
  }

  /**
   * Get offline storage statistics
   */
  static async getOfflineStats(): Promise<{
    recipesCount: number;
    ingredientsCount: number;
    lastSync: number | null;
    totalStorageSize: number;
  }> {
    try {
      const [recipesResult, ingredientsResult, lastSync] = await Promise.all([
        this.getOfflineRecipes(),
        this.getCachedIngredients(),
        this.getLastSync(),
      ]);

      const recipesCount = recipesResult.recipes?.length || 0;
      const ingredientsCount = ingredientsResult.ingredients?.length || 0;

      // Estimate storage size (rough calculation)
      const recipesSize = recipesResult.recipes
        ? JSON.stringify(recipesResult.recipes).length
        : 0;
      const ingredientsSize = ingredientsResult.ingredients
        ? JSON.stringify(ingredientsResult.ingredients).length
        : 0;

      return {
        recipesCount,
        ingredientsCount,
        lastSync,
        totalStorageSize: recipesSize + ingredientsSize,
      };
    } catch (error) {
      console.error("Failed to get offline stats:", error);
      return {
        recipesCount: 0,
        ingredientsCount: 0,
        lastSync: null,
        totalStorageSize: 0,
      };
    }
  }

  /**
   * Check if data needs refresh based on age
   */
  static isDataStale(timestamp: number, maxAgeHours: number = 6): boolean {
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    return now - timestamp > maxAgeMs;
  }
}

export default StorageService;
