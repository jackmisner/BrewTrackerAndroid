/**
 * Color schemes for light and dark themes
 * Used throughout the BrewTracker mobile app
 */

export const lightColors = {
  // Primary colors
  primary: "#f4511e",
  primaryText: "#fff",
  errorBackground: "#fee2e2",
  successBackground: "#f0f9ff",

  // Background colors
  background: "#fff",
  backgroundSecondary: "#f9f9f9",

  // Text colors
  text: "#333",
  textSecondary: "#666",
  textMuted: "#999",

  // Border colors
  border: "#ddd",
  borderLight: "#e0e0e0",

  // Status colors
  error: "#ff4444",
  success: "#4caf50",
  warning: "#ff9800",
  info: "#2196f3",

  // Component specific
  inputBackground: "#f9f9f9",
  shadow: "#000",

  // Chart colors
  gravityLine: "#4A90E2",
  temperatureLine: "#FF6B35",
} as const;

export const darkColors = {
  // Primary colors (keep brand color consistent)
  primary: "#f4511e",
  primaryText: "#fff",
  errorBackground: "#fee2e2",
  successBackground: "#f0f9ff",

  // Background colors
  background: "#121212",
  backgroundSecondary: "#1e1e1e",

  // Text colors
  text: "#ffffff",
  textSecondary: "#cccccc",
  textMuted: "#999999",

  // Border colors
  border: "#333333",
  borderLight: "#444444",

  // Status colors
  error: "#ff6b6b",
  success: "#51cf66",
  warning: "#ffa726",
  info: "#42a5f5",

  // Component specific
  inputBackground: "#242424",
  shadow: "#000",

  // Chart colors
  gravityLine: "#4A90E2",
  temperatureLine: "#FF6B35",
} as const;

// Legacy export for backward compatibility (will be replaced by useTheme hook)
export const colors = lightColors;
