#!/usr/bin/env node

/**
 * Build Information Script for BrewTracker
 *
 * This script displays current build configuration and environment information
 */

const fs = require("fs");
const path = require("path");

function getBuildInfo() {
  const packagePath = path.join(__dirname, "..", "package.json");
  const appConfigPath = path.join(__dirname, "..", "app.json");
  const easConfigPath = path.join(__dirname, "..", "eas.json");
  const envPath = path.join(__dirname, "..", ".env");

  console.log("🍺 BrewTracker Build Information\n");

  // Package info
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    console.log(`📦 Package: ${pkg.name} v${pkg.version}`);
  }

  // App config
  if (fs.existsSync(appConfigPath)) {
    const app = JSON.parse(fs.readFileSync(appConfigPath, "utf8"));
    console.log(`📱 App: ${app.expo.name} (${app.expo.slug})`);
    console.log(
      `🏷️  Version: ${app.expo.version} (${app.expo.android.versionCode})`
    );
    console.log(`📦 Package: ${app.expo.android.package}`);
    if (app.expo.extra?.eas?.projectId) {
      console.log(`🔧 EAS Project ID: ${app.expo.extra.eas.projectId}`);
    }
  }

  // Current environment
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const apiUrl = envContent.match(/EXPO_PUBLIC_API_URL=(.+)/)?.[1];
    const environment = envContent.match(/EXPO_PUBLIC_ENVIRONMENT=(.+)/)?.[1];
    const debugMode = envContent.match(/EXPO_PUBLIC_DEBUG_MODE=(.+)/)?.[1];

    console.log("\n🌍 Current Environment:");
    console.log(`   Environment: ${environment || "unknown"}`);
    console.log(`   API URL: ${apiUrl || "not set"}`);
    console.log(`   Debug Mode: ${debugMode || "unknown"}`);
  }

  // EAS build profiles
  if (fs.existsSync(easConfigPath)) {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, "utf8"));
    console.log("\n🔨 Available Build Profiles:");

    Object.keys(easConfig.build || {}).forEach(profile => {
      const config = easConfig.build[profile];
      const apiUrl = config.env?.EXPO_PUBLIC_API_URL;
      const environment = config.env?.EXPO_PUBLIC_ENVIRONMENT;

      console.log(`   ${profile}:`);
      console.log(`     API: ${apiUrl || "not set"}`);
      console.log(`     Environment: ${environment || "unknown"}`);
      console.log(`     Build Type: ${config.android?.buildType || "apk"}`);
    });
  }

  console.log("\n🚀 Available Commands:");
  console.log("   npm run build:dev     - Development build (local backend)");
  console.log("   npm run build:preview - Preview build (Fly.io backend)");
  console.log("   npm run build:prod    - Production build (Fly.io backend)");
  console.log("   npm run dev:ip        - Show current local IP");
  console.log("   node scripts/detect-ip.js - Update development IP");
}

if (require.main === module) {
  getBuildInfo();
}

module.exports = { getBuildInfo };
