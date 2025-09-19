/**
 * Tests for useStoragePermissions hook
 */

import { renderHook, act } from "@testing-library/react-native";
import { Platform } from "react-native";
import {
  useStoragePermissions,
  useDocumentPicker,
  useFileSharing,
} from "@hooks/useStoragePermissions";
import { StorageService } from "@services/storageService";

// Get mocked modules from global setup
const MediaLibrary = require("expo-media-library");

// Mock StorageService
jest.mock("@services/storageService");
jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
    Version: 33,
  },
}));

const mockMediaLibrary = MediaLibrary;
const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

describe("useStoragePermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = "android";
    (Platform as any).Version = 33;

    // Mock StorageService.getStorageInfo
    mockStorageService.getStorageInfo.mockReturnValue({
      platform: "android",
      androidVersion: 33,
      isAndroid13Plus: true,
      isAndroid10Plus: true,
      hasScopedStorage: true,
      requiresGranularPermissions: true,
    });
  });

  it("should initialize with default permission state", async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
      status: MediaLibrary.PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      accessPrivileges: "none",
      expires: "never",
    });

    const { result } = renderHook(() => useStoragePermissions());

    expect(result.current.mediaPermission.granted).toBe(false);
    expect(result.current.mediaPermission.loading).toBe(false);
    expect(result.current.mediaPermission.canRequest).toBe(true);
    expect(result.current.storageInfo.isAndroid13Plus).toBe(true);
  });

  it("should check permissions on mount", async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
      status: MediaLibrary.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      accessPrivileges: "all",
      expires: "never",
    });

    const { result } = renderHook(() => useStoragePermissions());

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockMediaLibrary.getPermissionsAsync).toHaveBeenCalled();
    expect(result.current.mediaPermission.granted).toBe(true);
  });

  it("should request media permissions successfully", async () => {
    mockStorageService.requestMediaPermissions.mockResolvedValue(true);
    mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
      status: MediaLibrary.PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      accessPrivileges: "none",
      expires: "never",
    });

    const { result } = renderHook(() => useStoragePermissions());

    await act(async () => {
      const granted =
        await result.current.requestMediaPermission("READ_MEDIA_IMAGES");
      expect(granted).toBe(true);
    });

    expect(mockStorageService.requestMediaPermissions).toHaveBeenCalledWith(
      "READ_MEDIA_IMAGES"
    );
    expect(result.current.mediaPermission.granted).toBe(true);
    expect(result.current.mediaPermission.loading).toBe(false);
  });

  it("should handle permission request failure", async () => {
    mockStorageService.requestMediaPermissions.mockResolvedValue(false);
    mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
      status: MediaLibrary.PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      accessPrivileges: "none",
      expires: "never",
    });

    const { result } = renderHook(() => useStoragePermissions());

    await act(async () => {
      const granted = await result.current.requestMediaPermission();
      expect(granted).toBe(false);
    });

    expect(result.current.mediaPermission.granted).toBe(false);
    expect(result.current.mediaPermission.canRequest).toBe(false);
  });

  it("should handle permission request errors", async () => {
    mockStorageService.requestMediaPermissions.mockRejectedValue(
      new Error("Permission error")
    );
    mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
      status: MediaLibrary.PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      accessPrivileges: "none",
      expires: "never",
    });

    const { result } = renderHook(() => useStoragePermissions());

    await act(async () => {
      const granted = await result.current.requestMediaPermission();
      expect(granted).toBe(false);
    });

    expect(result.current.mediaPermission.error).toBe("Permission error");
    expect(result.current.mediaPermission.loading).toBe(false);
  });

  it("should handle iOS platform", async () => {
    (Platform as any).OS = "ios";
    mockStorageService.getStorageInfo.mockReturnValue({
      platform: "ios",
      androidVersion: null,
      isAndroid13Plus: false,
      isAndroid10Plus: false,
      hasScopedStorage: false,
      requiresGranularPermissions: false,
    });

    mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
      status: MediaLibrary.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      accessPrivileges: "all",
      expires: "never",
    });

    const { result } = renderHook(() => useStoragePermissions());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.storageInfo.platform).toBe("ios");
    expect(result.current.storageInfo.androidVersion).toBeNull();
  });

  it("should handle permission check errors", async () => {
    // Make MediaLibrary.getPermissionsAsync throw an error
    mockMediaLibrary.getPermissionsAsync.mockRejectedValue(
      new Error("Permission check failed")
    );

    const { result } = renderHook(() => useStoragePermissions());

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should have set error in permission state
    expect(result.current.mediaPermission.error).toBe(
      "Permission check failed"
    );
    expect(result.current.mediaPermission.granted).toBe(false);
  });

  it("should handle non-Error objects in permission check", async () => {
    // Make MediaLibrary.getPermissionsAsync throw a non-Error object
    mockMediaLibrary.getPermissionsAsync.mockRejectedValue(
      "Something went wrong"
    );

    const { result } = renderHook(() => useStoragePermissions());

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should use default error message for non-Error objects
    expect(result.current.mediaPermission.error).toBe(
      "Permission check failed"
    );
    expect(result.current.mediaPermission.granted).toBe(false);
  });
});

describe("useDocumentPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should pick document successfully", async () => {
    const mockResult = {
      success: true,
      documents: [
        {
          uri: "file://test.xml",
          name: "test.xml",
          size: 1024,
          mimeType: "application/xml",
          lastModified: Date.now(),
        },
      ],
    };

    mockStorageService.pickDocument.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useDocumentPicker());

    await act(async () => {
      const pickerResult = await result.current.pickDocument();
      expect(pickerResult).toEqual(mockResult);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle document picker failure", async () => {
    const mockResult = {
      success: false,
      error: "Document picker failed",
    };

    mockStorageService.pickDocument.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useDocumentPicker());

    await act(async () => {
      const pickerResult = await result.current.pickDocument();
      expect(pickerResult).toEqual(mockResult);
    });

    expect(result.current.error).toBe("Document picker failed");
  });

  it("should pick multiple documents", async () => {
    const mockResult = {
      success: true,
      documents: [
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
      ],
    };

    mockStorageService.pickDocument.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useDocumentPicker());

    await act(async () => {
      const pickerResult = await result.current.pickMultipleDocuments();
      expect(pickerResult).toEqual(mockResult);
    });

    expect(mockStorageService.pickDocument).toHaveBeenCalledWith({
      multiple: true,
    });
  });

  it("should handle document picker errors", async () => {
    mockStorageService.pickDocument.mockRejectedValue(
      new Error("Picker error")
    );

    const { result } = renderHook(() => useDocumentPicker());

    await act(async () => {
      const pickerResult = await result.current.pickDocument();
      expect(pickerResult.success).toBe(false);
      expect(pickerResult.error).toBe("Picker error");
    });

    expect(result.current.error).toBe("Picker error");
  });
});

describe("useFileSharing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should share file successfully", async () => {
    const mockResult = {
      success: true,
      uri: "file://cache/test.txt",
    };

    mockStorageService.saveAndShareFile.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useFileSharing());

    await act(async () => {
      const shareResult = await result.current.shareFile(
        "test content",
        "test.txt",
        "text/plain"
      );
      expect(shareResult).toEqual(mockResult);
    });

    expect(mockStorageService.saveAndShareFile).toHaveBeenCalledWith(
      "test content",
      "test.txt",
      "text/plain"
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle file sharing failure", async () => {
    const mockResult = {
      success: false,
      error: "Sharing failed",
    };

    mockStorageService.saveAndShareFile.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useFileSharing());

    await act(async () => {
      const shareResult = await result.current.shareFile("content", "test.txt");
      expect(shareResult).toEqual(mockResult);
    });

    expect(result.current.error).toBe("Sharing failed");
  });

  it("should handle file sharing errors", async () => {
    mockStorageService.saveAndShareFile.mockRejectedValue(
      new Error("Share error")
    );

    const { result } = renderHook(() => useFileSharing());

    await act(async () => {
      const shareResult = await result.current.shareFile("content", "test.txt");
      expect(shareResult.success).toBe(false);
      expect(shareResult.error).toBe("Share error");
    });

    expect(result.current.error).toBe("Share error");
  });
});
