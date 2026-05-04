import { createContext, useContext, useState, useEffect } from "react";

const LEVEL_THEME_STORAGE_KEY = "playcraft-level-theme";

function parseStoredLevelTheme(value) {
  if (value === "auto") return "auto";
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : "auto";
}

const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
  setDark: () => {},
  selectedLevelTheme: "auto",
  setSelectedLevelTheme: () => {},
  resetLevelTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("playcraft-theme");
    return saved ? saved === "dark" : false;
  });
  const [selectedLevelTheme, setSelectedLevelThemeState] = useState(() =>
    parseStoredLevelTheme(localStorage.getItem(LEVEL_THEME_STORAGE_KEY))
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("playcraft-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem(LEVEL_THEME_STORAGE_KEY, String(selectedLevelTheme));
  }, [selectedLevelTheme]);

  const setSelectedLevelTheme = (value) => {
    setSelectedLevelThemeState(parseStoredLevelTheme(value));
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme: () => setIsDark((d) => !d),
        setDark: (value) => setIsDark(value),
        selectedLevelTheme,
        setSelectedLevelTheme,
        resetLevelTheme: () => setSelectedLevelThemeState("auto"),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
