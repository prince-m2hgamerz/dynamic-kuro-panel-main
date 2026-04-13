import { useEffect, useState } from "react";

export type PanelTheme = "dark" | "light";

const THEME_STORAGE_KEY = "gta-theme";

const getStoredTheme = (): PanelTheme => {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export const usePanelTheme = () => {
  const [theme, setTheme] = useState<PanelTheme>(getStoredTheme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
    toggleTheme,
  };
};
