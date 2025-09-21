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
    throw new Error(`Failed to read ${description}: ${error.message}`);
  }
}

function writeJsonFile(filePath, data, description) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    console.log(`✅ Updated ${description}`);
  } catch (error) {
    throw new Error(`Failed to write ${description}: ${error.message}`);
  }
}

function updateGradleFile(filePath, version, versionCode) {
  try {
    let gradle = fs.readFileSync(filePath, "utf8");
    // Find defaultConfig with brace-balanced scan (handles nested blocks, strings, comments)
    const startIdx = gradle.indexOf("defaultConfig");
    if (startIdx === -1) {
      throw new Error("build.gradle: defaultConfig block not found");
    }
    const openIdx = gradle.indexOf("{", startIdx);
    if (openIdx === -1) {
      throw new Error(
        "build.gradle: opening brace for defaultConfig not found"
      );
    }
    let i = openIdx + 1;
    let depth = 1;
    let inSQ = false,
      inDQ = false,
      inLC = false,
      inBC = false;
    while (i < gradle.length && depth > 0) {
      const c = gradle[i];
      const n = gradle[i + 1];
      if (inLC) {
        if (c === "\n") {
          inLC = false;
        }
        i++;
        continue;
      }
      if (inBC) {
        if (c === "*" && n === "/") {
          inBC = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }
      if (!inSQ && !inDQ && c === "/" && n === "/") {
        inLC = true;
        i += 2;
        continue;
      }
      if (!inSQ && !inDQ && c === "/" && n === "*") {
        inBC = true;
        i += 2;
        continue;
      }
      if (!inDQ && c === "'" && gradle[i - 1] !== "\\") {
        inSQ = !inSQ;
        i++;
        continue;
      }
      if (!inSQ && c === '"' && gradle[i - 1] !== "\\") {
        inDQ = !inDQ;
        i++;
        continue;
      }
      if (!inSQ && !inDQ) {
        if (c === "{") {
          depth++;
        } else if (c === "}") {
          depth--;
        }
      }
      i++;
    }
    if (depth !== 0) {
      throw new Error("build.gradle: unmatched braces in defaultConfig");
    }
    const blockStart = openIdx + 1;
    const blockEnd = i - 1; // index of closing brace
    const block = gradle.slice(blockStart, blockEnd);
    const vcRe = /\bversionCode\s+\d+\b/;
    const vnRe = /\bversionName\s*=?\s*["'][^"']+["']/;
    if (!vcRe.test(block)) {
      throw new Error(
        "build.gradle: versionCode pattern not found in defaultConfig"
      );
    }
    if (!vnRe.test(block)) {
      throw new Error(
        "build.gradle: versionName pattern not found in defaultConfig"
      );
    }
    const updatedBlock = block
      .replace(vcRe, `versionCode ${versionCode}`)
      .replace(vnRe, `versionName "${version}"`);
    gradle =
      gradle.slice(0, blockStart) + updatedBlock + gradle.slice(blockEnd);
    console.log(
      `✅ Updated build.gradle (versionCode: ${versionCode}, versionName: ${version})`
    );
  } catch (error) {
    throw new Error(`Failed to update build.gradle: ${error.message}`);
  }
}

function bumpVersion(type) {
  // Validate bump type
  if (!["patch", "minor", "major"].includes(type)) {
    exitWithError(`Invalid bump type "${type}". Use: patch, minor, or major`);
  }
  // File paths
  const repoRoot = path.resolve(__dirname, "..");
  const packageJsonPath = path.join(repoRoot, "package.json");
  const appJsonPath = path.join(repoRoot, "app.json");
  const gradlePath = path.join(repoRoot, "android/app/build.gradle");
  // Validate files exist
  validateFile(packageJsonPath, "package.json");
  validateFile(appJsonPath, "app.json");
  validateFile(gradlePath, "android/app/build.gradle");
  console.log(`🚀 Bumping ${type} version...`);
  // Snapshot originals for rollback
  const snapshots = {};
  const readIfExists = p =>
    fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  snapshots.packageJson = readIfExists(packageJsonPath);
  snapshots.packageLock = readIfExists(
    path.join(repoRoot, "package-lock.json")
  );
  snapshots.appJson = readIfExists(appJsonPath);
  snapshots.gradle = readIfExists(gradlePath);
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
    const currentVersionCodeApp = Number(app.expo.android.versionCode) || 0;
    const gradleContent = fs.readFileSync(gradlePath, "utf8");
    const vcMatch = gradleContent.match(
      /defaultConfig[\s\S]*?\bversionCode\s+(\d+)/m
    );
    const currentVersionCodeGradle = vcMatch ? parseInt(vcMatch[1], 10) : 0;
    const newVersionCode =
      Math.max(currentVersionCodeApp, currentVersionCodeGradle) + 1;
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
    // Best-effort rollback
    try {
      if (snapshots.packageJson !== null) {
        fs.writeFileSync(packageJsonPath, snapshots.packageJson);
      }
      const packageLockPath = path.join(repoRoot, "package-lock.json");
      if (snapshots.packageLock !== null) {
        fs.writeFileSync(packageLockPath, snapshots.packageLock);
      }
      if (snapshots.appJson !== null) {
        fs.writeFileSync(appJsonPath, snapshots.appJson);
      }
      if (snapshots.gradle !== null) {
        fs.writeFileSync(gradlePath, snapshots.gradle);
      }
      console.error("↩️ Rolled back files after failure.");
    } catch (rbErr) {
      console.error(`⚠️ Rollback encountered issues: ${rbErr.message}`);
    }
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
