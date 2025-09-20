#!/usr/bin/env node

/**
 * Cross-platform Build Helper for BrewTracker
 *
 * Handles environment file copying, validation, and IP detection
 * for build processes across Windows/macOS/Linux
 */

const fs = require("fs");
const path = require("path");
const { detectLocalIP, updateEnvFile } = require("./detect-ip");

const ENV_FILES = {
  development: ".env.development",
  production: ".env.production",
};

function validateEnvFileExists(envType) {
  const envFile = ENV_FILES[envType];
  const envPath = path.join(__dirname, "..", envFile);

  if (!fs.existsSync(envPath)) {
    const error = new Error(`${envFile} does not exist!`);
    error.details = `Please create ${envFile} file before running the build.\nYou can copy from .env.example: cp .env.example ${envFile}`;
    throw error;
  }

  console.log(`✅ Found ${envFile}`);
  return envPath;
}

function copyEnvFile(sourcePath, targetPath) {
  try {
    const content = fs.readFileSync(sourcePath, "utf8");
    fs.writeFileSync(targetPath, content);
    console.log(
      `✅ Copied ${path.basename(sourcePath)} to ${path.basename(targetPath)}`
    );
    return true;
  } catch (error) {
    const err = new Error(`Error copying environment file: ${error.message}`);
    err.originalError = error;
    throw err;
  }
}
function setupBuildEnvironment(envType, options = {}) {
  console.log(`🔧 Setting up ${envType} build environment...`);

  // Validate source environment file exists
  const sourcePath = validateEnvFileExists(envType);
  const targetPath = path.join(__dirname, "..", ".env");

  // Copy environment file
  copyEnvFile(sourcePath, targetPath);

  // Handle IP detection for development builds
  if (envType === "development") {
    if (options.updateIP !== false) {
      console.log("🔍 Detecting local IP address...");
      const detectedIP = detectLocalIP();
      console.log(`📡 Detected IP: ${detectedIP}`);

      // Update the copied .env file with detected IP
      if (updateEnvFile(targetPath, detectedIP)) {
        console.log(`✅ Updated API URL to: http://${detectedIP}:5000/api`);
      }

      return detectedIP;
    }
  }

  console.log(`✅ Build environment ready for ${envType}`);
  return null;
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
BrewTracker Build Helper

Usage:
  node scripts/build-helper.js <environment> [options]

Environments:
  development     Setup development environment (.env.development → .env)
  production      Setup production environment (.env.production → .env)

Options:
  --no-ip         Skip IP detection and update (development only)
  --validate-only Only validate environment files, don't copy
  --help, -h      Show this help message

Examples:
  node scripts/build-helper.js development
  node scripts/build-helper.js production
  node scripts/build-helper.js development --no-ip
  node scripts/build-helper.js production --validate-only
    `);
    return;
  }

  const envType = args[0];

  if (!envType || !ENV_FILES[envType]) {
    console.error("❌ Error: Invalid or missing environment type");
    console.error("Valid options: development, production");
    process.exit(1);
  }

  if (args.includes("--validate-only")) {
    validateEnvFileExists(envType);
    console.log(`✅ Environment validation complete for ${envType}`);
    return;
  }

  const options = {
    updateIP: !args.includes("--no-ip"),
  };

  const result = setupBuildEnvironment(envType, options);

  // Output IP for potential use by calling scripts
  if (result && envType === "development") {
    console.log(`DETECTED_IP=${result}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  setupBuildEnvironment,
  validateEnvFileExists,
  copyEnvFile,
};
