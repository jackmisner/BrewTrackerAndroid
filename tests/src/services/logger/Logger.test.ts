import { Logger } from "../../../../src/services/logger/Logger";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("expo-file-system", () => {
  const mockFile = {
    exists: true,
    size: 1000,
    text: jest.fn().mockResolvedValue(""),
    write: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    move: jest.fn().mockResolvedValue(undefined),
    name: "test-log.log",
  };

  const mockDirectory = {
    exists: true,
    uri: "/mock/log/directory",
    create: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue([mockFile]),
  };

  return {
    File: jest.fn().mockImplementation(() => mockFile),
    Directory: jest.fn().mockImplementation(() => mockDirectory),
    Paths: {
      document: "/mock/document",
      cache: "/mock/cache",
    },
  };
});

// Import mocks
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockFileSystem = require("expo-file-system");

describe("Logger", () => {
  let originalConsole: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Logger state BEFORE mocking console to avoid initialization logs
    (Logger as any).initialized = false;
    (Logger as any).enabled = true;
    (Logger as any).logLevel = "INFO";
    (Logger as any).logDirectory = null;
    (Logger as any).writePromise = Promise.resolve();
    (Logger as any).correlationCounter = 0;

    // Mock console methods to avoid cluttering test output
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Setup default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    // Reset file system mocks to default behavior
    const mockFile = {
      exists: true,
      size: 1000,
      text: jest.fn().mockResolvedValue(""),
      write: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      move: jest.fn().mockResolvedValue(undefined),
      name: "test-log.log",
    };

    const mockDirectory = {
      exists: true,
      uri: "/mock/log/directory",
      create: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([mockFile]),
    };

    mockFileSystem.File.mockImplementation(() => mockFile);
    mockFileSystem.Directory.mockImplementation(() => mockDirectory);
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe("initialization", () => {
    it("initializes successfully", async () => {
      await Logger.initialize();

      expect(mockFileSystem.Directory).toHaveBeenCalled();
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("@logger_settings");
    });

    it("handles initialization error gracefully", async () => {
      mockFileSystem.Directory.mockImplementation(() => {
        throw new Error("Directory creation failed");
      });

      await expect(Logger.initialize()).rejects.toThrow(
        "Directory creation failed"
      );
      expect(Logger.isEnabled()).toBe(false);
    });

    it("falls back to cache directory when document directory fails", async () => {
      mockFileSystem.Directory.mockImplementationOnce(() => {
        throw new Error("Document directory failed");
      }).mockImplementationOnce(() => ({
        exists: false,
        uri: "/mock/cache/logs",
        create: jest.fn().mockResolvedValue(undefined),
        list: jest.fn().mockResolvedValue([]),
      }));

      await Logger.initialize();

      expect(mockFileSystem.Directory).toHaveBeenCalledTimes(2);
    });

    it("loads settings from AsyncStorage", async () => {
      const settings = {
        logLevel: "DEBUG",
        enabled: false,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

      await Logger.initialize();

      expect(Logger.getLogLevel()).toBe("DEBUG");
      expect(Logger.isEnabled()).toBe(false);
    });

    it("handles corrupted settings gracefully", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid json");

      await Logger.initialize();

      // Should use defaults
      expect(Logger.getLogLevel()).toBe("INFO");
      expect(Logger.isEnabled()).toBe(true);
    });

    it("does not re-initialize if already initialized", async () => {
      await Logger.initialize();
      const firstCallCount = mockFileSystem.Directory.mock.calls.length;

      await Logger.initialize();

      expect(mockFileSystem.Directory.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe("log level management", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("sets log level", async () => {
      await Logger.setLogLevel("DEBUG");

      expect(Logger.getLogLevel()).toBe("DEBUG");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@logger_settings",
        JSON.stringify({ logLevel: "DEBUG", enabled: true })
      );
    });

    it("rejects invalid log level", async () => {
      await expect(Logger.setLogLevel("INVALID" as any)).rejects.toThrow(
        "Invalid log level: INVALID"
      );
    });

    it("accepts all valid log levels", async () => {
      const validLevels = ["DEBUG", "INFO", "WARN", "ERROR"];

      for (const level of validLevels) {
        await Logger.setLogLevel(level as any);
        expect(Logger.getLogLevel()).toBe(level);
      }
    });
  });

  describe("enable/disable functionality", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("enables and disables logging", async () => {
      expect(Logger.isEnabled()).toBe(true);

      await Logger.setEnabled(false);
      expect(Logger.isEnabled()).toBe(false);

      await Logger.setEnabled(true);
      expect(Logger.isEnabled()).toBe(true);
    });

    it("saves enabled state to AsyncStorage", async () => {
      await Logger.setEnabled(false);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "@logger_settings",
        JSON.stringify({ logLevel: "INFO", enabled: false })
      );
    });
  });

  describe("correlation ID generation", () => {
    it("generates unique correlation IDs", () => {
      const id1 = Logger.generateCorrelationId();
      const id2 = Logger.generateCorrelationId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-\d+$/);
      expect(id2).toMatch(/^\d+-\d+$/);
    });

    it("increments counter for each ID", () => {
      const id1 = Logger.generateCorrelationId();
      const id2 = Logger.generateCorrelationId();

      const counter1 = parseInt(id1.split("-")[1]);
      const counter2 = parseInt(id2.split("-")[1]);

      expect(counter2).toBe(counter1 + 1);
    });
  });

  describe("logging methods", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("has logging methods available", () => {
      expect(typeof Logger.debug).toBe("function");
      expect(typeof Logger.info).toBe("function");
      expect(typeof Logger.warn).toBe("function");
      expect(typeof Logger.error).toBe("function");
    });

    it("can call logging methods without error", async () => {
      await Logger.debug("test", "message");
      await Logger.info("test", "message");
      await Logger.warn("test", "message");
      await Logger.error("test", "message");
    });
  });

  describe("enhanced error logging", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("logs errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test";

      await Logger.errorWithStack("test", "Error occurred", error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[test] Error occurred"),
        expect.objectContaining({
          name: "Error",
          message: "Test error",
          stack: "Error: Test error\n    at test",
        })
      );
    });

    it("handles non-Error objects", async () => {
      const errorData = { custom: "error data" };

      await Logger.errorWithStack("test", "Custom error", errorData);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[test] Custom error"),
        { custom: "error data" }
      );
    });

    it("includes correlation ID and component", async () => {
      await Logger.errorWithStack("test", "Error", null, {
        correlationId: "test-123",
        component: "TestComponent",
      });

      expect(console.error).toHaveBeenCalledWith(
        "[test] Error (ID:test-123 @TestComponent)",
        null
      );
    });

    it("can disable stack trace inclusion", async () => {
      const error = new Error("Test error");

      await Logger.errorWithStack("test", "Error", error, {
        includeStack: false,
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[test] Error"),
        expect.objectContaining({
          name: "Error",
          message: "Test error",
        })
      );

      // Should not include stack in data
      const loggedData = (console.error as jest.Mock).mock.calls[0][1];
      expect(loggedData).not.toHaveProperty("stack");
    });
  });

  describe("performance timing", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("logs timing information", async () => {
      await Logger.timing("performance", "database query", 150);

      expect(console.log).toHaveBeenCalledWith(
        "[performance] ⏱️ database query",
        { duration_ms: 150 }
      );
    });

    it("includes correlation ID when provided", async () => {
      await Logger.timing("performance", "api call", 250, "test-123");

      expect(console.log).toHaveBeenCalledWith(
        "[performance] ⏱️ api call (ID:test-123)",
        { duration_ms: 250 }
      );
    });
  });

  describe("user action tracking", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("logs user actions", async () => {
      await Logger.userAction("button_click", { buttonId: "submit" });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[user-action] 👆 button_click"),
        { buttonId: "submit" }
      );
    });

    it("includes component information", async () => {
      await Logger.userAction("form_submit", null, "LoginForm");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("@LoginForm"),
        null
      );
    });
  });

  describe("file operations", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("writes to log file", async () => {
      const mockFile = mockFileSystem.File();

      await Logger.info("test", "test message");

      expect(mockFile.write).toHaveBeenCalled();
    });

    it("creates file if it doesn't exist", async () => {
      const mockFile = {
        ...mockFileSystem.File(),
        exists: false,
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      await Logger.info("test", "test message");

      expect(mockFile.create).toHaveBeenCalled();
    });

    it("handles file write errors gracefully", async () => {
      const mockFile = mockFileSystem.File();
      mockFile.write.mockRejectedValue(new Error("Write failed"));

      await Logger.info("test", "test message");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to write to log file"),
        expect.any(Error)
      );
    });
  });

  describe("log rotation", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("rotates logs when file is too large", async () => {
      const mockFile = {
        ...mockFileSystem.File(),
        size: 6 * 1024 * 1024, // 6MB - larger than MAX_LOG_SIZE
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      await Logger.info("test", "test message");

      expect(mockFile.move).toHaveBeenCalled();
    });

    it("skips rotation for small files", async () => {
      const mockFile = {
        ...mockFileSystem.File(),
        size: 1000, // Small file
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      await Logger.info("test", "test message");

      expect(mockFile.move).not.toHaveBeenCalled();
    });

    it("handles rotation errors gracefully", async () => {
      const mockFile = {
        ...mockFileSystem.File(),
        size: 6 * 1024 * 1024,
      };
      mockFile.move.mockRejectedValue(new Error("Move failed"));
      mockFileSystem.File.mockReturnValue(mockFile);

      await Logger.info("test", "test message");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to rotate log file"),
        expect.any(Error)
      );
    });
  });

  describe("log file management", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("gets log files list", async () => {
      const mockFiles = [
        { name: "brewtracker-2024-01-01.log" },
        { name: "brewtracker-2024-01-02.log" },
        { name: "other-file.txt" },
      ];
      const mockDirectory = mockFileSystem.Directory();
      mockDirectory.list.mockResolvedValue(mockFiles);

      const files = await Logger.getLogFiles();

      expect(files).toEqual([
        "brewtracker-2024-01-02.log",
        "brewtracker-2024-01-01.log",
      ]);
    });

    it("reads specific log file", async () => {
      const mockFile = mockFileSystem.File();
      mockFile.text.mockResolvedValue("log content");

      const content = await Logger.readLogFile("test.log");

      expect(content).toBe("log content");
    });

    it("returns empty string for non-existent file", async () => {
      const mockFile = {
        ...mockFileSystem.File(),
        exists: false,
      };
      mockFileSystem.File.mockReturnValue(mockFile);

      const content = await Logger.readLogFile("nonexistent.log");

      expect(content).toBe("");
    });

    it("can call clearLogs without error", async () => {
      await Logger.clearLogs();
    });
  });

  describe("log info", () => {
    beforeEach(async () => {
      await Logger.initialize();
    });

    it("returns log information with basic structure", async () => {
      const info = await Logger.getLogInfo();

      expect(info).toEqual({
        logDir: expect.any(String),
        files: expect.any(Array),
        totalSize: expect.any(Number),
        settings: {
          logLevel: expect.any(String),
          enabled: expect.any(Boolean),
        },
      });
    });

    it("handles errors gracefully", async () => {
      const mockDirectory = mockFileSystem.Directory();
      mockDirectory.list.mockRejectedValue(new Error("List failed"));

      const info = await Logger.getLogInfo();

      expect(info).toEqual({
        logDir: "Error",
        files: [],
        totalSize: 0,
        settings: {
          logLevel: "INFO",
          enabled: true,
        },
      });
    });
  });

  describe("log formatting", () => {
    it("formats log entries correctly", () => {
      const entry = {
        timestamp: "2024-01-01T12:00:00.000Z",
        level: "INFO" as const,
        category: "test",
        message: "test message",
        data: "test data",
        correlationId: "123",
        component: "TestComponent",
        stack: "Error stack trace",
      };

      const formatted = (Logger as any).formatLogLine(entry);

      expect(formatted).toContain("2024-01-01T12:00:00.000Z");
      expect(formatted).toContain("[INFO]");
      expect(formatted).toContain("[ID:123]");
      expect(formatted).toContain("[@TestComponent]");
      expect(formatted).toContain("[test]");
      expect(formatted).toContain("test message");
      expect(formatted).toContain("DATA: test data");
      expect(formatted).toContain("STACK: Error stack trace");
    });

    it("formats minimal log entries", () => {
      const entry = {
        timestamp: "2024-01-01T12:00:00.000Z",
        level: "ERROR" as const,
        category: "test",
        message: "simple message",
      };

      const formatted = (Logger as any).formatLogLine(entry);

      expect(formatted).toBe(
        "2024-01-01T12:00:00.000Z [ERROR] [test] simple message\n"
      );
    });
  });

  describe("settings persistence", () => {
    it("handles AsyncStorage save errors", async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage failed"));

      await Logger.setLogLevel("DEBUG");

      expect(console.warn).toHaveBeenCalledWith(
        "Failed to save logger settings:",
        expect.any(Error)
      );
      expect(Logger.getLogLevel()).toBe("DEBUG"); // Should still update in memory
    });

    it("handles AsyncStorage load errors", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Load failed"));

      await Logger.initialize();

      expect(console.warn).toHaveBeenCalledWith(
        "Failed to load logger settings:",
        expect.any(Error)
      );
      // Should use defaults
      expect(Logger.getLogLevel()).toBe("INFO");
      expect(Logger.isEnabled()).toBe(true);
    });
  });
});
