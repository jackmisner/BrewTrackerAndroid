#!/usr/bin/env node

/**
 * Development Log Server for BrewTracker Android
 *
 * Receives logs from the mobile app and writes them to files on the host computer
 * Run this alongside your Expo dev server for development logging
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;
const LOG_DIR = path.join(process.cwd(), "dev-logs");

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`📁 Created log directory: ${LOG_DIR}`);
}

// Middleware
app.use(express.json({ limit: "10mb" }));

// CORS for Expo dev server
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  next();
});

// Handle preflight requests
app.options("/dev-logs", (_req, res) => {
  res.sendStatus(200);
});

// Log endpoint
app.post("/dev-logs", async (req, res) => {
  try {
    const { timestamp, level, category, message, data, deviceInfo } = req.body;

    if (!timestamp || !level || !category || !message) {
      return res.status(400).json({ error: "Missing required log fields" });
    }

    // Create log entry
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      ...(data && { data }),
      ...(deviceInfo && { device: deviceInfo }),
    };

    // Format log line
    const logLine = formatLogEntry(logEntry);

    // Write to daily log file (using UTC date)
    const today = new Date().toISOString().split("T")[0];
    const logFile = path.join(LOG_DIR, `brewtracker-android-${today}.log`);

    // Write to both files concurrently
    const latestFile = path.join(LOG_DIR, "brewtracker-android-latest.log");
    await Promise.all([
      fs.promises.appendFile(logFile, logLine + "\n"),
      fs.promises.appendFile(latestFile, logLine + "\n"),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error writing log:", error);
    res.status(500).json({ error: "Failed to write log" });
  }
});
// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    logDir: LOG_DIR,
    files: fs.readdirSync(LOG_DIR).filter(f => f.endsWith(".log")),
  });
});

// List log files
app.get("/logs", (_req, res) => {
  try {
    const files = fs
      .readdirSync(LOG_DIR)
      .filter(f => f.endsWith(".log"))
      .map(f => ({
        name: f,
        size: fs.statSync(path.join(LOG_DIR, f)).size,
        modified: fs.statSync(path.join(LOG_DIR, f)).mtime,
      }))
      .sort((a, b) => b.modified - a.modified);

    res.json({ files });
  } catch {
    res.status(500).json({ error: "Failed to list log files" });
  }
});

// Get log file content
app.get("/logs/:filename", (req, res) => {
  try {
    const filename = req.params.filename;

    // Prevent path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(LOG_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Log file not found" });
    }

    const content = fs.readFileSync(filePath, "utf8");
    res.json({ content });
  } catch (error) {
    console.error("Error reading log file:", error);
    res.status(500).json({ error: "Failed to read log file" });
  }
});

// Format log entry for file writing
function formatLogEntry(entry) {
  // Ensure timestamp is in a consistent format (convert to UTC if needed)
  let formattedTimestamp = entry.timestamp;
  try {
    const date = new Date(entry.timestamp);
    formattedTimestamp = date.toISOString();
  } catch {
    // If timestamp parsing fails, use current UTC time
    formattedTimestamp = new Date().toISOString();
  }

  const parts = [
    formattedTimestamp,
    `[${entry.level}]`,
    `[${entry.category}]`,
    entry.message,
  ];

  if (entry.data) {
    parts.push(`DATA: ${entry.data}`);
  }

  if (entry.device) {
    parts.push(`DEVICE: ${JSON.stringify(entry.device)}`);
  }

  return parts.join(" ");
}

// Cleanup old log files (keep last 10)
function cleanupOldLogs() {
  try {
    const files = fs
      .readdirSync(LOG_DIR)
      .filter(f => f.endsWith(".log") && f !== "brewtracker-android-latest.log")
      .map(f => ({
        name: f,
        path: path.join(LOG_DIR, f),
        modified: fs.statSync(path.join(LOG_DIR, f)).mtime,
      }))
      .sort((a, b) => b.modified - a.modified);

    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Deleted old log file: ${file.name}`);
      });
    }
  } catch (error) {
    console.warn("Failed to cleanup old logs:", error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log("📱🖥️ BrewTracker Android Dev Log Server");
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`📁 Logs directory: ${LOG_DIR}`);
  console.log("");
  console.log("📄 Log files will be created as:");
  console.log(`  - Daily: brewtracker-android-YYYY-MM-DD.log`);
  console.log(`  - Latest: brewtracker-android-latest.log (always current)`);
  console.log("");
  console.log("🔗 Endpoints:");
  console.log(`  - Health: http://localhost:${PORT}/health`);
  console.log(`  - List logs: http://localhost:${PORT}/logs`);
  console.log(`  - View log: http://localhost:${PORT}/logs/{filename}`);
  console.log("");
  console.log("🎯 Ready to receive logs from BrewTracker Android!");

  // Cleanup old logs on startup
  cleanupOldLogs();
});

// Cleanup old logs daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n📱🖥️ Shutting down dev log server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n📱🖥️ Shutting down dev log server...");
  process.exit(0);
});
