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

// Template literal types for dynamic test IDs
export type ThemeOptionTestId = `theme-${string}-option`;
export type UnitOptionTestId = `unit-${string}-option`;
export type MetricValueTestId = `metric-${string}-value`;
export type ContextMenuActionTestId = `context-menu-action-${string}`;

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

  // Context Menu Elements
  contextMenu: {
    modal: "context-menu-modal",
    overlay: "context-menu-overlay",
    container: "context-menu-container",
    header: "context-menu-header",
    title: "context-menu-title",
    subtitle: "context-menu-subtitle",
    actionsList: "context-menu-actions-list",
    cancelButton: "context-menu-cancel-button",
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
    themeOption: (theme: string): ThemeOptionTestId => {
      const s = sanitizeId(theme) || 'unknown'
      return `theme-${s}-option` as ThemeOptionTestId
    },
    unitOption: (unit: string): UnitOptionTestId => {
      const s = sanitizeId(unit) || 'unknown'
      return `unit-${s}-option` as UnitOptionTestId
    },
    metricValue: (metric: string): MetricValueTestId => {
      const s = sanitizeId(metric) || 'unknown'
      return `metric-${s}-value` as MetricValueTestId
    },
    contextMenuAction: (actionId: string): ContextMenuActionTestId => {
      const s = sanitizeId(actionId) || 'unknown'
      return `context-menu-action-${s}` as ContextMenuActionTestId
    },
  },
} as const;

export type TestIDs = typeof TEST_IDS;