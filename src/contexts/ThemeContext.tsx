import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "../styles/common/colors";

// Theme types
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  primary: string;
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
}

// Theme context interface
export interface ThemeContextValue {
  // Current theme state
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;

  // Actions
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

// Provider props interface
interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = "@brewtracker_theme_preference";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const getSystemTheme = (): "light" | "dark" => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
};

const getEffectiveTheme = (themeMode: ThemeMode): "light" | "dark" => {
  if (themeMode === "system") {
    return getSystemTheme();
  }
  return themeMode;
};

const getThemeColors = (effectiveTheme: "light" | "dark"): ThemeColors => {
  return effectiveTheme === "dark" ? darkColors : lightColors;
};

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