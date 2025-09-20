#!/usr/bin/env node

/**
 * Dynamic IP Detection Script for BrewTracker Development
 *
 * This script detects the current local IP address and updates the development
 * environment configuration to use the correct backend URL.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function detectLocalIP() {
  try {
    // Try different methods to get local IP
    const methods = [
      // macOS/Linux: Get first non-loopback IPv4 address
      () => {
        const result = execSync(
          "ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -1",
          { encoding: "utf8" }
        ).trim();
        return result;
      },
      // Alternative method for different systems
      () => {
        const result = execSync("hostname -I | awk '{print $1}'", {
          encoding: "utf8",
        }).trim();
        return result;
      },
      // Windows method
      () => {
        const result = execSync(
          "ipconfig | findstr IPv4 | findstr /V 127.0.0.1",
          { encoding: "utf8" }
        ).trim();
        const match = result.match(/(\d+\.\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
      },
    ];

    for (const method of methods) {
      try {
        const ip = method();
        if (ip && ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          return ip;
        }
      } catch (_e) {
        console.error("Error message:", _e);
        continue;
      }
    }

    // Fallback to common development IPs
    console.warn("Could not detect IP automatically, using fallback...");
    return "192.168.0.10"; // Current default
  } catch (error) {
    console.error("Error detecting IP:", error.message);
    return "127.0.0.1"; // Ultimate fallback
  }
}

function updateEnvFile(filePath, targetIP) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  const newApiUrl = `http://${targetIP}:5000/api`;
  const envLine = `EXPO_PUBLIC_API_URL=${newApiUrl}`;

  if (content.includes("EXPO_PUBLIC_API_URL=")) {
    // Replace existing line
    content = content.replace(/EXPO_PUBLIC_API_URL=.*/, envLine);
  } else {
    // Append new line, ensuring proper newline handling
    if (!content.endsWith("\n") && content.length > 0) {
      content += "\n";
    }
    content += envLine + "\n";
  }

  fs.writeFileSync(filePath, content);
  return true;
}

function updateDevelopmentEnv(detectedIP) {
  const envPath = path.join(__dirname, "..", ".env.development");

  if (!updateEnvFile(envPath, detectedIP)) {
    console.error(".env.development file not found!");
    process.exit(1);
  }

  console.log(
    `✅ Updated development API URL to: http://${detectedIP}:5000/api`
  );
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
BrewTracker IP Detection Script

Usage:
  node scripts/detect-ip.js [options]

Options:
  --detect-only    Only detect and print the IP, don't update files
  --ip <address>   Use a specific IP address instead of auto-detection
  --help, -h       Show this help message

Examples:
  node scripts/detect-ip.js                    # Auto-detect and update
  node scripts/detect-ip.js --detect-only      # Just show detected IP
  node scripts/detect-ip.js --ip 192.168.1.100 # Use specific IP
    `);
    return;
  }

  let targetIP;

  if (args.includes("--ip")) {
    const ipIndex = args.indexOf("--ip");
    targetIP = args[ipIndex + 1];
    if (!targetIP || !targetIP.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      console.error("Invalid IP address provided");
      process.exit(1);
    }
  } else {
    targetIP = detectLocalIP();
  }

  console.log(`🔍 Detected/Using IP: ${targetIP}`);

  if (args.includes("--detect-only")) {
    return;
  }

  updateDevelopmentEnv(targetIP);

  // Also update the current .env if it exists
  const currentEnvPath = path.join(__dirname, "..", ".env");
  if (updateEnvFile(currentEnvPath, targetIP)) {
    console.log(
      `✅ Updated current .env API URL to: http://${targetIP}:5000/api`
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = { detectLocalIP, updateDevelopmentEnv, updateEnvFile };
