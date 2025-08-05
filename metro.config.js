const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add path alias resolver
config.resolver = {
  ...config.resolver,
  alias: {
    "@": path.resolve(__dirname, "./"),
    "@src": path.resolve(__dirname, "./src"),
    "@contexts": path.resolve(__dirname, "./src/contexts"),
    "@styles": path.resolve(__dirname, "./src/styles"),
    "@services": path.resolve(__dirname, "./src/services"),
    "@types": path.resolve(__dirname, "./src/types"),
    "@utils": path.resolve(__dirname, "./src/utils"),
  },
};

module.exports = config;
