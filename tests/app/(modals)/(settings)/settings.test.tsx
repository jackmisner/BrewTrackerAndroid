import React from "react";
import { render } from "@testing-library/react-native";

// Mock Context providers needed by Settings screen

// Mock MaterialIcons properly - remove per-file mock to rely on global stub

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
  },
}));

// Mock the context hooks that require API access
jest.mock("@contexts/UnitContext", () => ({
  useUnits: jest.fn(() => ({
    unitSystem: "imperial",
    updateUnitSystem: jest.fn(),
    loading: false,
  })),
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: jest.fn(() => ({
    theme: "light",
    isDark: false,
    setTheme: jest.fn(),
    colors: {
      primary: "#007AFF",
      background: "#FFFFFF",
      textPrimary: "#000000",
      textSecondary: "#666666",
      textMuted: "#999999",
      backgroundSecondary: "#F5F5F5",
    },
  })),
}));

jest.mock("@contexts/DeveloperContext", () => ({
  useDeveloper: jest.fn(() => ({
    isDeveloperMode: false,
    networkSimulationMode: false,
    setNetworkSimulationMode: jest.fn(),
  })),
}));

// Mock styles
jest.mock("@styles/modals/settingsStyles", () => ({
  settingsStyles: jest.fn(() => ({
    container: {},
    header: {},
    backButton: {},
    headerTitle: {},
    headerSpacer: {},
    scrollView: {},
    section: {},
    sectionTitle: {},
    settingGroup: {},
    groupTitle: {},
    groupContent: {},
    optionItem: {},
    optionContent: {},
    optionTitle: {},
    optionSubtitle: {},
    radioButton: {},
    menuItem: {},
    menuContent: {},
    menuText: {},
    menuSubtext: {},
    bottomSpacing: {},
  })),
}));

import SettingsScreen from "../../../../app/(modals)/(settings)/settings";
import { TEST_IDS } from "../../../../src/constants/testIDs";

describe("SettingsScreen", () => {
  it("should render without crashing", () => {
    expect(() => render(<SettingsScreen />)).not.toThrow();
  });

  it("should display the Settings title", () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText("Settings")).toBeTruthy();
  });

  it("should display main section headings", () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText("Appearance")).toBeTruthy();
    expect(getByText("Brewing")).toBeTruthy();
    expect(getByText("Notifications")).toBeTruthy();
    expect(getByText("Data")).toBeTruthy();
    expect(getByText("About")).toBeTruthy();
  });

  it("should display theme options", () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId(TEST_IDS.settings.themeLabel)).toBeTruthy();
    expect(getByTestId(TEST_IDS.patterns.themeOption("light"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.patterns.themeOption("dark"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.patterns.themeOption("system"))).toBeTruthy();
  });

  it("should display unit system options", () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId(TEST_IDS.settings.unitLabel)).toBeTruthy();
    expect(getByTestId(TEST_IDS.patterns.unitOption("imperial"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.patterns.unitOption("metric"))).toBeTruthy();
  });
});
