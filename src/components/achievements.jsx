import { getAchievementDefinitions, getUserAchievements, upsertUserAchievement } from "@/api/achievements";
import { getUserGameScores, getUserScores } from "@/api/scores";
import { toast } from "sonner";

/**
 * Lee UserGameStats en vez de registros de Score individuales.
 *
 * Para logros de juego concreto:  usa el stat del juego  (plays_count, best_score, wins_count)
 * Para logros globales:           agrega todos los stats del usuario
 */
export async function evaluateAndUpdateAchievements({ userEmail, gameId }) {
  try {
    const allDefinitions = await getAchievementDefinitions();
    const relevant = allDefinitions.filter(a => a.game_id === gameId || !a.game_id);
    if (!relevant.length) return;

    const [gameStatsArr, allStats, existing] = await Promise.all([
      getUserGameScores(userEmail, gameId),  // [stat] o []
      getUserScores(userEmail, 1000),        // stats de todos los juegos del usuario
      getUserAchievements(),
    ]);

    const gameStat = gameStatsArr[0] ?? null;

    for (const def of relevant) {
      const isGlobal = !def.game_id;
      const scale = Number(def.score_scale ?? 1);
      const offset = Number(def.score_offset ?? 0);
      const threshold = Number(def.threshold || 0);

      let rawProgress = 0;

      if (isGlobal) {
        if (def.metric === "plays_count") {
          rawProgress = allStats.reduce((sum, s) => sum + (s.plays_count || 0), 0);
        } else if (def.metric === "best_score" || def.metric === "single_run_score") {
          rawProgress = allStats.length
            ? Math.max(...allStats.map(s => (s.best_score || 0) * scale + offset))
            : 0;
        } else if (def.metric === "wins_count") {
          rawProgress = allStats.reduce((sum, s) => sum + (s.wins_count || 0), 0);
        }
      } else {
        if (!gameStat) {
          rawProgress = 0;
        } else if (def.metric === "plays_count") {
          rawProgress = gameStat.plays_count || 0;
        } else if (def.metric === "best_score" || def.metric === "single_run_score") {
          rawProgress = (gameStat.best_score || 0) * scale + offset;
        } else if (def.metric === "wins_count") {
          rawProgress = gameStat.wins_count || 0;
        }
      }

      const unlocked = threshold > 0 && rawProgress >= threshold;
      const progress = threshold > 0 ? Math.min(rawProgress, threshold) : rawProgress;

      const found = existing.find(ua => ua.achievement_id === def.id);

      if (found) {
        const wasUnlocked = !!found.unlocked;
        const progressChanged = Math.abs(progress - Number(found.progress || 0)) > 1e-6;
        const unlockedChanged = unlocked !== wasUnlocked;

        if (progressChanged || unlockedChanged) {
          if (unlocked && !wasUnlocked) {
            toast.success(`🏆 ${def.title} completado`, { duration: 5000 });
          }
          await upsertUserAchievement({
            achievement_id: def.id,
            game_id: def.game_id || null,
            progress,
            unlocked,
            unlocked_date: unlocked && !wasUnlocked ? new Date().toISOString() : undefined,
          });
        }
      } else {
        if (unlocked) {
          toast.success(`🏆 ${def.title} completado`, { duration: 5000 });
        }
        await upsertUserAchievement({
          achievement_id: def.id,
          user_email: userEmail,
          game_id: def.game_id || null,
          progress,
          unlocked,
          unlocked_date: unlocked ? new Date().toISOString() : undefined,
        });
      }
    }
  } catch (e) {
    console.error("[achievements] evaluateAndUpdateAchievements error:", e);
  }
}
