import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { LEVELS, getLevelFromXP } from "@/lib/levels";
import { useTheme } from "@/lib/ThemeContext";

function clampLevel(level) {
  if (!Number.isInteger(level)) return 1;
  return Math.min(Math.max(level, 1), LEVELS.length);
}

export function useLevelTheme(options = {}) {
  const { user: authUser } = useAuth();
  const { isDark, selectedLevelTheme, setSelectedLevelTheme, resetLevelTheme } = useTheme();

  return useMemo(() => {
    const user = options.user ?? authUser;
    const isRegularUser = !!user && user.role !== "admin" && user.role !== "empresa";
    const inferredPremium = !!(user?.premium_until && new Date(user.premium_until) > new Date());
    const isPremium = options.isPremium ?? inferredPremium;
    const actualLevelData = isRegularUser
      ? options.actualLevelData ?? getLevelFromXP(user?.xp ?? 0, isPremium)
      : null;
    const actualLevel = isRegularUser
      ? clampLevel(options.actualLevel ?? actualLevelData?.level ?? 1)
      : null;
    const unlockedMaxLevel = isRegularUser ? actualLevel : null;
    const availableLevels = isRegularUser
      ? LEVELS.filter((level) => level.level <= unlockedMaxLevel)
      : [];
    const visualLevel = isRegularUser
      ? clampLevel(
        selectedLevelTheme === "auto"
          ? unlockedMaxLevel
          : Math.min(selectedLevelTheme, unlockedMaxLevel)
      )
      : null;
    const activeLevel = !isDark && isRegularUser ? visualLevel : null;
    const visualLevelData = visualLevel
      ? LEVELS.find((level) => level.level === visualLevel) ?? actualLevelData
      : null;

    return {
      isDark,
      isRegularUser,
      actualLevel,
      actualLevelData,
      unlockedMaxLevel,
      availableLevels,
      selectedLevelTheme,
      setSelectedLevelTheme,
      resetLevelTheme,
      visualLevel,
      visualLevelData,
      activeLevel,
      isLevelUser: activeLevel >= 1 && activeLevel <= LEVELS.length,
      isLevel1User: activeLevel === 1,
      isLevel2User: activeLevel === 2,
      isLevel3User: activeLevel === 3,
      isLevel4User: activeLevel === 4,
      isLevel5User: activeLevel === 5,
    };
  }, [
    authUser,
    isDark,
    options.actualLevel,
    options.actualLevelData,
    options.isPremium,
    options.user,
    resetLevelTheme,
    selectedLevelTheme,
    setSelectedLevelTheme,
  ]);
}
