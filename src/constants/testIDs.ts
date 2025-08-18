/**
 * Centralized Test IDs for BrewTracker Android
 *
 * This module contains all test identifiers used throughout the application
 * to ensure consistency and avoid duplication across components.
 */

const sanitizeId = (input: string): string => {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

function makeId<P extends string, S extends string>(
  prefix: P,
  suffix: S
): (val: string) => `${P}${string}${S}`;
function makeId(prefix: string, suffix: string) {
  return (val: string) => `${prefix}${toSlug(val)}${suffix}`;
}

const slugCache = new Map<string, string>();
const MAX_SLUG_CACHE_ENTRIES = 200;

export const toSlug = (value: string): string => {
  if (slugCache.has(value)) {
    return slugCache.get(value)!;
  }
  const slug = sanitizeId(value) || "unknown";
  slugCache.set(value, slug);
  if (slugCache.size > MAX_SLUG_CACHE_ENTRIES) {
    const firstKey = slugCache.keys().next().value as string | undefined;
    if (firstKey !== undefined) slugCache.delete(firstKey);
  }
  return slug;
};

type PatternFns = {
  themeOption: (val: string) => ThemeOptionTestId;
  unitOption: (val: string) => UnitOptionTestId;
  metricValue: (val: string) => MetricValueTestId;
  contextMenuAction: (val: string) => ContextMenuActionTestId;
};

const PATTERN_GENERATORS = {
  themeOption: makeId("theme-", "-option"),
  unitOption: makeId("unit-", "-option"),
  metricValue: makeId("metric-", "-value"),
  contextMenuAction: makeId("context-menu-action-", ""),
} satisfies PatternFns;

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
  patterns: PATTERN_GENERATORS,
} as const;

export type TestIDs = typeof TEST_IDS;
