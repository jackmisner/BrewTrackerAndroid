/**
 * Centralized Test IDs for BrewTracker Android
 * 
 * This module contains all test identifiers used throughout the application
 * to ensure consistency and avoid duplication across components.
 */

const sanitizeId = (input: string): string => {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const TEST_IDS = {
  // Navigation & Headers
  header: {
    backButton: "header-back-button",
  },

  // Authentication & Actions
  auth: {
    registerButton: "register-button",
    resetPasswordButton: "reset-password-button", 
    goToLoginButton: "go-to-login-button",
    resetPasswordTitle: "reset-password-title",
  },

  // Forms
  forms: {
    basicInfoForm: "basic-info-form",
    parametersForm: "parameters-form", 
    ingredientsForm: "ingredients-form",
    reviewForm: "review-form",
  },

  // Form Inputs
  inputs: {
    mashTimeInput: "mash-time-input",
    confirmPasswordInput: "confirm-password-input",
  },

  // Settings Interface
  settings: {
    themeLabel: "settings-theme-label",
    unitLabel: "settings-unit-label",
  },

  // Component Elements
  components: {
    closeButton: "close-button",
    progressIndicator: "progress-indicator",
    brewingMetricsDisplay: "brewing-metrics-display",
  },

  // Icons
  icons: {
    errorOutline: "icon-error-outline",
    analytics: "icon-analytics",
  },

  // Charts
  charts: {
    fermentationChart: "fermentation-chart",
    fermentationData: "fermentation-data",
  },

  // Dynamic Pattern Generators
  patterns: {
    themeOption: (theme: string) => `theme-${sanitizeId(theme)}-option`,
    unitOption: (unit: string) => `unit-${sanitizeId(unit)}-option`,
    metricValue: (metric: string) => `metric-${sanitizeId(metric)}-value`,
  },
} as const;

export type TestIDs = typeof TEST_IDS;