/**
 * Centralized Test IDs for BrewTracker Android
 *
 * This module contains all test identifiers used throughout the application
 * to ensure consistency and avoid duplication across components.
 *
 * ## Pattern-Based TestIDs
 *
 * Use the dynamic pattern generators for consistent, reusable testIDs:
 * - `TEST_IDS.patterns.inputField(name)` - Form inputs (name-input)
 * - `TEST_IDS.patterns.touchableOpacityAction(name)` - Touchable buttons (name-button)
 * - `TEST_IDS.patterns.scrollAction(name)` - Scrollable components (name-scroll-view)
 * - `TEST_IDS.patterns.iconElement(name)` - Icons (icon-name)
 * - `TEST_IDS.patterns.sectionContainer(name)` - Sections (name-section)
 * - `TEST_IDS.patterns.modalComponent(name)` - Modals (name-modal)
 * - `TEST_IDS.patterns.contextMenuAction(name)` - Context menu actions (context-menu-action-name)
 * - `TEST_IDS.patterns.themeOption(name)` - Theme options (theme-name-option)
 * - `TEST_IDS.patterns.unitOption(name)` - Unit options (unit-name-option)
 * - `TEST_IDS.patterns.metricValue(name)` - Metrics (metric-name-value)
 *
 * ## Examples
 * ```typescript
 * // Instead of hardcoded strings:
 * testID="recipe-name-input"
 *
 * // Use patterns:
 * testID={TEST_IDS.patterns.inputField("recipe-name")}
 *
 * // For buttons:
 * testID={TEST_IDS.patterns.touchableOpacityAction("save")}
 *
 * // For scrollable content:
 * testID={TEST_IDS.patterns.scrollAction("recipe-list")}
 * ```
 */

// Keep test IDs reasonably short and predictable
export const MAX_SLUG_LENGTH = 80;
const sanitizeId = (input: string): string => {
  // Guard against engines (e.g. Hermes) without normalize()
  const normalized =
    typeof String.prototype.normalize === "function"
      ? String.prototype.normalize.call(input, "NFKD")
      : input;
  return normalized
    .replace(/\p{M}+/gu, "") // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
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

/**
 * Converts a string to a slug format suitable for test IDs.
 * Caches results to improve performance and reduce redundant processing.
 *
 * @param value - The input string to convert.
 * @returns A sanitized slug version of the input string.
 */

export const toSlug = (value: string): string => {
  if (slugCache.has(value)) {
    // Refresh recency by reinserting the entry
    const cached = slugCache.get(value)!;
    slugCache.delete(value);
    slugCache.set(value, cached);
    return cached;
  }
  const slug = sanitizeId(value) || "unknown";
  slugCache.set(value, slug);
  if (slugCache.size > MAX_SLUG_CACHE_ENTRIES) {
    const firstKey = slugCache.keys().next().value as string | undefined;
    if (firstKey !== undefined) {
      slugCache.delete(firstKey);
    }
  }
  return slug;
};

type PatternFns = {
  themeOption: (val: string) => ThemeOptionTestId;
  unitOption: (val: string) => UnitOptionTestId;
  metricValue: (val: string) => MetricValueTestId;
  contextMenuAction: (val: string) => ContextMenuActionTestId;
  scrollAction: (val: string) => ScrollActionTestId;
  touchableOpacityAction: (val: string) => TouchableOpacityActionTestId;
  inputField: (val: string) => InputFieldTestId;
  modalComponent: (val: string) => ModalComponentTestId;
  sectionContainer: (val: string) => SectionContainerTestId;
  iconElement: (val: string) => IconElementTestId;
  modalHeaderAction: (
    modalName: string,
    action: string
  ) => ModalHeaderActionTestId;
};

const PATTERN_GENERATORS = {
  themeOption: makeId("theme-", "-option"),
  unitOption: makeId("unit-", "-option"),
  metricValue: makeId("metric-", "-value"),
  contextMenuAction: makeId("context-menu-action-", ""),
  scrollAction: makeId("", "-scroll-view"),
  touchableOpacityAction: makeId("", "-button"),
  inputField: makeId("", "-input"),
  modalComponent: makeId("", "-modal"),
  sectionContainer: makeId("", "-section"),
  iconElement: makeId("icon-", ""),
  modalHeaderAction: (modalName: string, action: string) =>
    `${toSlug(modalName)}-${toSlug(action)}-button` as ModalHeaderActionTestId,
} satisfies PatternFns;

// Template literal types for dynamic test IDs
export type ThemeOptionTestId = `theme-${string}-option`;
export type UnitOptionTestId = `unit-${string}-option`;
export type MetricValueTestId = `metric-${string}-value`;
export type ContextMenuActionTestId = `context-menu-action-${string}`;
export type ScrollActionTestId = `${string}-scroll-view`;
export type TouchableOpacityActionTestId = `${string}-button`;
export type InputFieldTestId = `${string}-input`;
export type ModalComponentTestId = `${string}-modal`;
export type SectionContainerTestId = `${string}-section`;
export type IconElementTestId = `icon-${string}`;
export type ModalHeaderActionTestId = `${string}-${string}-button`;

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

  // Form inputs - Use patterns.inputField(name) for dynamic input testIDs

  // Buttons
  buttons: {
    saveButton: "save-button",
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

  // Icons - Use patterns.iconElement(name) for dynamic icon testIDs

  // Charts
  charts: {
    fermentationChart: "fermentation-chart",
    fermentationData: "fermentation-data",
  },

  // BeerXML Import
  beerxml: {
    selectFileButton: "beerxml-select-file-button",
    loadingIndicator: "beerxml-loading-indicator",
    errorMessage: "beerxml-error-message",
    tryAgainButton: "beerxml-try-again-button",
    proceedButton: "beerxml-proceed-button",
    recipeOption: "beerxml-recipe-option",
    importButton: "beerxml-import-button",
    reviewContainer: "beerxml-review-container",
  },

  // Boil Timer - Use pattern functions in component code:
  // TEST_IDS.patterns.touchableOpacityAction("start-timer") etc.
  boilTimer: {
    screen: "boil-timer-screen",
    durationInput: "boil-duration-input", // Already matches component testID
    recipeSelector: "recipe-selector",
    timerDisplay: "timer-display",
    progressBar: "progress-bar",
    hopAddition: (index: number) => `hop-addition-${index}`,
    hopScheduleTitle: "hop-schedule-title",
    hopScheduleSubtitle: "hop-schedule-subtitle",
  },

  // Dynamic Pattern Generators
  patterns: PATTERN_GENERATORS,
} as const;

export type TestIDs = typeof TEST_IDS;
