/**
 * Tests for StorageService - Modern storage API implementation
 */

import { Platform } from "react-native";
import { StorageService, BeerXMLService } from "@services/storageService";

// Get mocked modules from global setup
const DocumentPicker = require("expo-document-picker");
const MediaLibrary = require("expo-media-library");
const Sharing = require("expo-sharing");
const FileSystem = require("expo-file-system");
// Mock Platform directly
jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
    Version: 33, // Android 13
  },
}));

const mockDocumentPicker = DocumentPicker;
const mockMediaLibrary = MediaLibrary;
const mockSharing = Sharing;
const mockFileSystem = FileSystem;

describe("StorageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS and Version for each test
    (Platform as any).OS = "android";
    (Platform as any).Version = 33;
  });

  describe("Platform Detection", () => {
    it("should detect Android 13+", () => {
      (Platform as any).Version = 33;
      const info = StorageService.getStorageInfo();
      expect(info.isAndroid13Plus).toBe(true);
      expect(info.requiresGranularPermissions).toBe(true);
    });

    it("should detect Android 10-12", () => {
      (Platform as any).Version = 30;
      const info = StorageService.getStorageInfo();
      expect(info.isAndroid13Plus).toBe(false);
      expect(info.isAndroid10Plus).toBe(true);
      expect(info.hasScopedStorage).toBe(true);
    });

    it("should detect pre-Android 10", () => {
      (Platform as any).Version = 28;
      const info = StorageService.getStorageInfo();
      expect(info.isAndroid13Plus).toBe(false);
      expect(info.isAndroid10Plus).toBe(false);
      expect(info.hasScopedStorage).toBe(false);
    });

    it("should handle iOS platform", () => {
      (Platform as any).OS = "ios";
      const info = StorageService.getStorageInfo();
      expect(info.platform).toBe("ios");
      expect(info.androidVersion).toBeNull();
    });

    it("should provide comprehensive platform info", () => {
      (Platform as any).OS = "android";
      (Platform as any).Version = 31;
      const info = StorageService.getStorageInfo();

      expect(info).toHaveProperty("platform");
      expect(info).toHaveProperty("androidVersion");
      expect(info).toHaveProperty("isAndroid13Plus");
      expect(info).toHaveProperty("isAndroid10Plus");
      expect(info).toHaveProperty("hasScopedStorage");
      expect(info).toHaveProperty("requiresGranularPermissions");
      expect(info.androidVersion).toBe(31);
      expect(info.platform).toBe("android");
    });
  });

  describe("Media Permissions", () => {
    it("should request permissions on Android 13+", async () => {
      (Platform as any).Version = 33;
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        accessPrivileges: "all",
        expires: "never",
      });

      const result =
        await StorageService.requestMediaPermissions("READ_MEDIA_IMAGES");

      expect(result).toBe(true);
      expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it("should handle permission denial", async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        accessPrivileges: "none",
        expires: "never",
      });

      const result = await StorageService.requestMediaPermissions();

      expect(result).toBe(false);
    });

    it("should handle iOS permissions", async () => {
      (Platform as any).OS = "ios";
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        accessPrivileges: "all",
        expires: "never",
      });

      const result = await StorageService.requestMediaPermissions();

      expect(result).toBe(true);
    });

    it("should handle permission errors", async () => {
      mockMediaLibrary.requestPermissionsAsync.mockRejectedValue(
        new Error("Permission error")
      );

      const result = await StorageService.requestMediaPermissions();

      expect(result).toBe(false);
    });
  });

  describe("Document Picker", () => {
    it("should pick single document successfully", async () => {
      const mockDocument = {
        uri: "file://test.xml",
        name: "test.xml",
        size: 1024,
        mimeType: "application/xml",
        lastModified: Date.now(),
      };

      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [mockDocument],
      });

      const result = await StorageService.pickDocument();

      expect(result.success).toBe(true);
      expect(result.documents).toEqual([mockDocument]);
      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
    });

    it("should handle document picker cancellation", async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: true,
        assets: null,
      });

      const result = await StorageService.pickDocument();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Document selection cancelled");
    });

    it("should pick multiple documents", async () => {
      const mockDocuments = [
        {
          uri: "file://test1.xml",
          name: "test1.xml",
          size: 1024,
          mimeType: "application/xml",
          lastModified: Date.now(),
        },
        {
          uri: "file://test2.xml",
          name: "test2.xml",
          size: 2048,
          mimeType: "application/xml",
          lastModified: Date.now(),
        },
      ];

      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: mockDocuments,
      });

      const result = await StorageService.pickMultipleDocuments();

      expect(result.success).toBe(true);
      expect(result.documents).toEqual(mockDocuments);
      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });
    });

    it("should handle document picker errors", async () => {
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(
        new Error("Picker failed")
      );

      const result = await StorageService.pickDocument();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Picker failed");
    });
  });

  describe("File Sharing", () => {
    beforeEach(() => {
      Object.defineProperty(mockFileSystem, "cacheDirectory", {
        value: "file://cache/",
        writable: true,
      });
    });

    it("should save and share file successfully", async () => {
      const mockFile = {
        uri: "file://cache/test.txt",
        create: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
      };
      mockFileSystem.File.mockReturnValue(mockFile);
      mockSharing.isAvailableAsync.mockResolvedValue(true);
      mockSharing.shareAsync.mockResolvedValue(undefined);

      const result = await StorageService.saveAndShareFile(
        "test content",
        "test.txt",
        "text/plain"
      );

      expect(result.success).toBe(true);
      expect(result.uri).toBe("file://cache/test.txt");
      expect(mockFileSystem.File).toHaveBeenCalledWith(
        mockFileSystem.Paths.cache,
        "test.txt"
      );
      expect(mockFile.create).toHaveBeenCalled();
      expect(mockFile.write).toHaveBeenCalledWith("test content");
      expect(mockSharing.shareAsync).toHaveBeenCalledWith(
        "file://cache/test.txt",
        {
          mimeType: "text/plain",
          dialogTitle: "Save test.txt",
        }
      );
    });

    it("should handle sharing unavailable", async () => {
      const mockFile = {
        uri: "file://cache/test.txt",
        create: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
      };
      mockFileSystem.File.mockReturnValue(mockFile);
      mockSharing.isAvailableAsync.mockResolvedValue(false);

      const result = await StorageService.saveAndShareFile(
        "content",
        "test.txt"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sharing not available on this platform");
    });

    it("should handle file write errors", async () => {
      const mockFile = {
        uri: "file://cache/test.txt",
        create: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockRejectedValue(new Error("Write failed")),
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      const result = await StorageService.saveAndShareFile(
        "content",
        "test.txt"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Write failed");
    });
  });

  describe("Media Library Operations", () => {
    it("should save image to media library with permission", async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        accessPrivileges: "all",
        expires: "never",
      });

      const mockAsset = {
        id: "123",
        filename: "image.jpg",
        uri: "file://image.jpg",
        mediaType: "photo" as const,
        width: 1920,
        height: 1080,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        duration: 0,
        mediaSubtypes: [],
      };

      mockMediaLibrary.createAssetAsync.mockResolvedValue(mockAsset);

      const result =
        await StorageService.saveImageToMediaLibrary("file://test.jpg");

      expect(result.success).toBe(true);
      expect(result.uri).toBe("file://image.jpg");
      expect(mockMediaLibrary.createAssetAsync).toHaveBeenCalledWith(
        "file://test.jpg"
      );
    });

    it("should handle permission denial for media library", async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        accessPrivileges: "none",
        expires: "never",
      });

      const result =
        await StorageService.saveImageToMediaLibrary("file://test.jpg");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Media library permission denied");
    });
  });

  describe("File Reading", () => {
    it("should read document file successfully", async () => {
      const mockFile = {
        exists: true,
        text: jest.fn().mockResolvedValue("file content"),
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      const result = await StorageService.readDocumentFile("file://test.txt");

      expect(result.success).toBe(true);
      expect(result.content).toBe("file content");
      expect(mockFileSystem.File).toHaveBeenCalledWith("file://test.txt");
      expect(mockFile.text).toHaveBeenCalled();
    });

    it("should handle file read errors", async () => {
      const mockFile = {
        exists: false,
        text: jest.fn().mockRejectedValue(new Error("Read failed")),
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      const result = await StorageService.readDocumentFile("file://test.txt");

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found at the specified URI");
    });
  });
});

describe("BeerXMLService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(mockFileSystem, "cacheDirectory", {
      value: "file://cache/",
      writable: true,
    });
  });

  describe("Import BeerXML", () => {
    it("should import BeerXML file successfully", async () => {
      const mockDocument = {
        uri: "file://recipe.xml",
        name: "recipe.xml",
        size: 2048,
        mimeType: "application/xml",
        lastModified: Date.now(),
      };

      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [mockDocument],
      });

      const mockFile = {
        exists: true,
        text: jest.fn().mockResolvedValue('<?xml version="1.0"?>...'),
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      const result = await BeerXMLService.importBeerXML();

      expect(result.success).toBe(true);
      expect(result.content).toBe('<?xml version="1.0"?>...');
      expect(result.filename).toBe("recipe.xml");
    });

    it("should handle import cancellation", async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: true,
        assets: null,
      });

      const result = await BeerXMLService.importBeerXML();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Document selection cancelled");
    });
  });

  describe("Export BeerXML", () => {
    it("should export BeerXML file successfully", async () => {
      // Mock directory picker to return null (user cancelled), so it falls back to sharing
      mockFileSystem.Directory.pickDirectoryAsync.mockResolvedValue(null);

      // Mock the sharing fallback
      const mockFile = {
        uri: "file://cache/My_Recipe_recipe.xml",
        create: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
      };
      mockFileSystem.File.mockReturnValue(mockFile);
      mockSharing.isAvailableAsync.mockResolvedValue(true);
      mockSharing.shareAsync.mockResolvedValue(undefined);

      const result = await BeerXMLService.exportBeerXML(
        '<?xml version="1.0"?>...',
        "My Recipe"
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe("share");
      expect(mockFileSystem.File).toHaveBeenCalledWith(
        mockFileSystem.Paths.cache,
        "My_Recipe_recipe.xml"
      );
      expect(mockFile.create).toHaveBeenCalled();
      expect(mockFile.write).toHaveBeenCalledWith('<?xml version="1.0"?>...');
      expect(mockSharing.shareAsync).toHaveBeenCalledWith(
        "file://cache/My_Recipe_recipe.xml",
        {
          mimeType: "application/xml",
          dialogTitle: "Save My_Recipe_recipe.xml",
        }
      );
    });

    it("should handle user cancellation during export", async () => {
      // Mock directory picker to be cancelled, but sharing succeeds as fallback
      mockFileSystem.Directory.pickDirectoryAsync.mockResolvedValue(null);
      const mockFile = {
        uri: "file://cache/My_Recipe_recipe.xml",
        create: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
      };
      mockFileSystem.File.mockReturnValue(mockFile);
      mockSharing.isAvailableAsync.mockResolvedValue(true);
      mockSharing.shareAsync.mockResolvedValue(undefined);

      const result = await BeerXMLService.exportBeerXML(
        '<?xml version="1.0"?>...',
        "My Recipe"
      );

      // Should succeed via sharing fallback when directory picker is cancelled
      expect(result.success).toBe(true);
      expect(result.method).toBe("share");
      expect(mockFileSystem.Directory.pickDirectoryAsync).toHaveBeenCalled();
      expect(mockSharing.shareAsync).toHaveBeenCalled();
    });
  });

  describe("Error handling edge cases", () => {
    it("should handle media library permission errors", async () => {
      mockMediaLibrary.requestPermissionsAsync.mockRejectedValue(
        new Error("Permission system error")
      );

      const result = await StorageService.requestMediaPermissions();

      expect(result).toBe(false);
    });

    it("should handle createAsset failure", async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        accessPrivileges: "all",
        expires: "never",
      });

      mockMediaLibrary.createAssetAsync.mockRejectedValue(
        new Error("Asset creation failed")
      );

      const result =
        await StorageService.saveImageToMediaLibrary("file://test.jpg");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Asset creation failed");
    });

    it("should handle sharing service errors", async () => {
      const mockFile = {
        uri: "file://cache/test.txt",
        create: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
      };
      mockFileSystem.File.mockReturnValue(mockFile);
      mockSharing.isAvailableAsync.mockResolvedValue(true);
      mockSharing.shareAsync.mockRejectedValue(new Error("Share failed"));

      const result = await StorageService.saveAndShareFile(
        "content",
        "test.txt"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Share failed");
    });

    it("should handle document picker errors", async () => {
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(
        new Error("Document picker error")
      );

      const result = await StorageService.pickDocument();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Document picker error");
    });

    it("should handle multiple documents picker errors", async () => {
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(
        new Error("Multiple picker error")
      );

      const result = await StorageService.pickMultipleDocuments();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Multiple picker error");
    });

    it("should handle file read errors", async () => {
      const mockFile = {
        exists: false,
        text: jest.fn().mockRejectedValue(new Error("File read failed")),
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      const result = await StorageService.readDocumentFile("file://test.txt");

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found at the specified URI");
    });

    it("should handle album creation when album exists", async () => {
      (Platform as any).Version = 33; // Android 13+ to trigger album logic

      const mockAsset = { uri: "media://test-asset", id: "asset-123" };
      const mockAlbum = { id: "album-123", title: "TestAlbum" };

      // Mock permissions as granted
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        accessPrivileges: "all",
        expires: "never",
      });

      mockMediaLibrary.createAssetAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockAlbum); // Album exists
      mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(true);
      mockMediaLibrary.createAlbumAsync.mockResolvedValue(true);

      const result = await StorageService.saveImageToMediaLibrary(
        "file://test.jpg",
        "TestAlbum"
      );

      expect(result.success).toBe(true);
      expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockMediaLibrary.getAlbumAsync).toHaveBeenCalledWith("TestAlbum");
      expect(mockMediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalledWith(
        [mockAsset],
        mockAlbum,
        false
      );
      // Verify the opposite branch was not called
      expect(mockMediaLibrary.createAlbumAsync).not.toHaveBeenCalled();
    });

    it("should create new album when album doesn't exist", async () => {
      (Platform as any).Version = 33; // Android 13+ to trigger album logic

      const mockAsset = { uri: "media://test-asset", id: "asset-123" };

      // Mock permissions as granted
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: MediaLibrary.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        accessPrivileges: "all",
        expires: "never",
      });

      mockMediaLibrary.createAssetAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(null); // Album doesn't exist
      mockMediaLibrary.createAlbumAsync.mockResolvedValue(true);
      mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(true);

      const result = await StorageService.saveImageToMediaLibrary(
        "file://test.jpg",
        "NewAlbum"
      );

      expect(result.success).toBe(true);
      expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockMediaLibrary.getAlbumAsync).toHaveBeenCalledWith("NewAlbum");
      expect(mockMediaLibrary.createAlbumAsync).toHaveBeenCalledWith(
        "NewAlbum",
        mockAsset,
        false
      );
      // Verify the opposite branch was not called
      expect(mockMediaLibrary.addAssetsToAlbumAsync).not.toHaveBeenCalled();
    });
  });

  describe("BeerXML Service", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should handle BeerXML import with file read failure", async () => {
      const mockDocument = {
        uri: "file://test.xml",
        name: "test.xml",
        size: 1024,
        mimeType: "application/xml",
        lastModified: Date.now(),
      };

      jest.spyOn(StorageService, "pickDocument").mockResolvedValue({
        success: true,
        documents: [mockDocument],
      });

      jest.spyOn(StorageService, "readDocumentFile").mockResolvedValue({
        success: false,
        error: "Failed to read file",
      });

      const result = await BeerXMLService.importBeerXML();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to read file");
    });

    it("should handle BeerXML import with exception", async () => {
      jest
        .spyOn(StorageService, "pickDocument")
        .mockRejectedValue(new Error("Picker failed"));

      const result = await BeerXMLService.importBeerXML();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Picker failed");
    });

    it("should handle BeerXML import with non-Error exception", async () => {
      jest
        .spyOn(StorageService, "pickDocument")
        .mockRejectedValue("Something went wrong");

      const result = await BeerXMLService.importBeerXML();

      expect(result.success).toBe(false);
      expect(result.error).toBe("BeerXML import failed");
    });
  });
});
