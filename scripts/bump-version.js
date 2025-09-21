#!/usr/bin/env node

/**
 * Version Bump Script for BrewTracker Android
 *
 * Synchronizes version information across:
 * - package.json (semver)
 * - app.json (expo config)
 * - android/app/build.gradle (Android versionCode & versionName)
 *
 * Usage: node scripts/bump-version.js <patch|minor|major>
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function exitWithError(message) {
  console.error(`❌ Error: ${message}`);
  process.exit(1);
}

function validateFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    exitWithError(`${description} not found at ${filePath}`);
  }
}

function readJsonFile(filePath, description) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    exitWithError(`Failed to read ${description}: ${error.message}`);
  }
}

function writeJsonFile(filePath, data, description) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    console.log(`✅ Updated ${description}`);
  } catch (error) {
    exitWithError(`Failed to write ${description}: ${error.message}`);
  }
}

function updateGradleFile(filePath, version, versionCode) {
  try {
    let gradle = fs.readFileSync(filePath, "utf8");

    // Update versionCode and versionName
    gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
    gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${version}"`);

    fs.writeFileSync(filePath, gradle);
    console.log(
      `✅ Updated build.gradle (versionCode: ${versionCode}, versionName: ${version})`
    );
  } catch (error) {
    exitWithError(`Failed to update build.gradle: ${error.message}`);
  }
}

function bumpVersion(type) {
  // Validate bump type
  if (!["patch", "minor", "major"].includes(type)) {
    exitWithError(`Invalid bump type "${type}". Use: patch, minor, or major`);
  }

  // File paths
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const appJsonPath = path.join(process.cwd(), "app.json");
  const gradlePath = path.join(process.cwd(), "android/app/build.gradle");

  // Validate files exist
  validateFile(packageJsonPath, "package.json");
  validateFile(appJsonPath, "app.json");
  validateFile(gradlePath, "android/app/build.gradle");

  console.log(`🚀 Bumping ${type} version...`);

  try {
    // 1. Bump npm version (this updates package.json)
    console.log(`📦 Running npm version ${type}...`);
    execSync(`npm version ${type} --no-git-tag-version`, { stdio: "inherit" });

    // 2. Read updated package.json
    const pkg = readJsonFile(packageJsonPath, "package.json");
    const newVersion = pkg.version;
    console.log(`📋 New version: ${newVersion}`);

    // 3. Update app.json
    const app = readJsonFile(appJsonPath, "app.json");

    if (!app.expo) {
      exitWithError("app.json is missing expo configuration");
    }

    if (!app.expo.android) {
      exitWithError("app.json is missing expo.android configuration");
    }

    // Update version fields
    app.expo.version = newVersion;
    app.expo.runtimeVersion = newVersion;

    // Increment versionCode
    const currentVersionCode = app.expo.android.versionCode || 1;
    const newVersionCode = currentVersionCode + 1;
    app.expo.android.versionCode = newVersionCode;

    writeJsonFile(appJsonPath, app, "app.json");

    // 4. Update Android build.gradle
    updateGradleFile(gradlePath, newVersion, newVersionCode);

    // 5. Success summary
    console.log("\n🎉 Version bump completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   • Version: ${newVersion}`);
    console.log(`   • Android versionCode: ${newVersionCode}`);
    console.log(`   • Files updated: package.json, app.json, build.gradle`);
  } catch (error) {
    exitWithError(`Version bump failed: ${error.message}`);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error("Usage: node scripts/bump-version.js <patch|minor|major>");
    console.error("");
    console.error("Examples:");
    console.error("  node scripts/bump-version.js patch   # 1.0.0 → 1.0.1");
    console.error("  node scripts/bump-version.js minor   # 1.0.0 → 1.1.0");
    console.error("  node scripts/bump-version.js major   # 1.0.0 → 2.0.0");
    process.exit(1);
  }

  const bumpType = args[0];
  bumpVersion(bumpType);
}

// Run only if called directly
if (require.main === module) {
  main();
}

module.exports = { bumpVersion };
