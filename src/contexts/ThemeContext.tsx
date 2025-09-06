/**
 * Theme Context for BrewTracker Android
 *
 * Provides comprehensive theme management with support for:
 * - Light and dark color schemes
 * - System theme detection and automatic switching
 * - Persistent theme preference storage
 * - Real-time theme switching with smooth transitions
 *
 * The context automatically responds to system theme changes when set to "system" mode
 * and persists user preferences using AsyncStorage.
 *
 * @example
 * ```typescript
 * const { colors, isDark, setTheme, toggleTheme } = useTheme();
 *
 * // Apply theme colors
 * <View style={{ backgroundColor: colors.background }}>
 *   <Text style={{ color: colors.text }}>Hello World</Text>
 * </View>
 *
 * // Toggle between light/dark
 * await toggleTheme();
 *
 * // Set specific theme
 * await setTheme('dark');
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "@styles/common/colors";

/**
 * Theme mode options
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 * - 'system': Follow system preference
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * Theme color palette interface
 * Defines all colors used throughout the app for consistent theming
 */
export interface ThemeColors {
  primary: string;
  primaryLight10: string;
  primaryLight20: string;
  primaryLight30: string;
  primaryLight40: string;
  primaryText: string;
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  inputBackground: string;
  shadow: string;
  gravityLine: string;
  temperatureLine: string;
}

/**
 * Theme context interface defining all available state and actions
 */
export interface ThemeContextValue {
  // Current theme state
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;

  // Actions
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

/**
 * Props for the ThemeProvider component
 */
interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = "@brewtracker_theme_preference";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Custom hook to access theme context
 * Must be used within a ThemeProvider
 *
 * @returns ThemeContextValue with all theme state and actions
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

/**
 * Gets the current system theme preference
 * @returns 'dark' if system is in dark mode, 'light' otherwise
 */
const getSystemTheme = (): "light" | "dark" => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
};

/**
 * Resolves the effective theme based on user preference and system theme
 * @param themeMode - User's theme preference
 * @returns Actual theme to apply ('light' or 'dark')
 */
const getEffectiveTheme = (themeMode: ThemeMode): "light" | "dark" => {
  if (themeMode === "system") {
    return getSystemTheme();
  }
  return themeMode;
};

/**
 * Gets the appropriate color palette for the given theme
 * @param effectiveTheme - The resolved theme ('light' or 'dark')
 * @returns Theme color object
 */
const getThemeColors = (effectiveTheme: "light" | "dark"): ThemeColors => {
  return effectiveTheme === "dark" ? darkColors : lightColors;
};

/**
 * Theme Provider Component
 *
 * Manages global theme state and provides theme context to child components.
 * Automatically loads saved theme preference and responds to system theme changes.
 * Persists theme changes for consistency across app sessions.
 *
 * @param children - Child components that need access to theme context
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(
    getSystemTheme()
  );

  // Load saved theme preference on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
          const themeMode = savedTheme as ThemeMode;
          setThemeState(themeMode);
          setEffectiveTheme(getEffectiveTheme(themeMode));
        }
      } catch (error) {
        console.error("Error loading theme preference:", error);
      }
    };

    loadThemePreference();
  }, []);

  // Listen to system theme changes when theme is set to "system"
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (theme === "system") {
        const newEffectiveTheme = colorScheme === "dark" ? "dark" : "light";
        setEffectiveTheme(newEffectiveTheme);
      }
    });

    return () => subscription?.remove();
  }, [theme]);

  const setTheme = async (newTheme: ThemeMode): Promise<void> => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
      setEffectiveTheme(getEffectiveTheme(newTheme));
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const toggleTheme = async (): Promise<void> => {
    const newTheme = effectiveTheme === "light" ? "dark" : "light";
    await setTheme(newTheme);
  };

  const contextValue: ThemeContextValue = {
    theme,
    colors: getThemeColors(effectiveTheme),
    isDark: effectiveTheme === "dark",
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
