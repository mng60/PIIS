import { api } from "@/api/client";
import { toast } from "sonner";

/**
 * Evaluates relevant achievement definitions for a user/game
 * and creates/updates UserAchievement records accordingly.
 */
export async function evaluateAndUpdateAchievements({ userEmail, gameId }) {
  try {
    const allDefinitions = await api.get("/achievements/definitions");
    const relevant = allDefinitions.filter((a) => a.game_id === gameId || !a.game_id);
    if (relevant.length === 0) return;

    const [gameScores, allScores, existing] = await Promise.all([
      api.get(`/scores?user_email=${userEmail}&game_id=${gameId}`),
      api.get(`/scores?user_email=${userEmail}`),
      api.get("/achievements/user"),
    ]);

    for (const def of relevant) {
      const scores = def.game_id ? gameScores : allScores;

      const scale = Number(def.score_scale ?? 1);
      const offset = Number(def.score_offset ?? 0);
      const threshold = Number(def.threshold || 0);

      let rawProgress = 0;
      if (def.metric === "plays_count") {
        rawProgress = scores.length;
      } else if (def.metric === "best_score" || def.metric === "single_run_score") {
        if (scores.length > 0) {
          rawProgress = Math.max(...scores.map((s) => Number(s.score) * scale + offset));
        }
      } else if (def.metric === "wins_count") {
        const winMin = Number(def.win_score_min ?? 0);
        rawProgress = scores.filter((s) => Number(s.score) >= winMin).length;
      }

      const unlocked = threshold > 0 && rawProgress >= threshold;
      const progress = threshold > 0 ? Math.min(rawProgress, threshold) : rawProgress;

      const found = existing.find((ua) => ua.achievement_id === def.id);

      if (found) {
        const wasUnlocked = !!found.unlocked;
        const progressChanged = Math.abs(progress - Number(found.progress || 0)) > 1e-6;
        const unlockedChanged = unlocked !== wasUnlocked;

        if (progressChanged || unlockedChanged) {
          if (unlocked && !wasUnlocked) {
            toast.success(`🏆 ${def.title} completado`, { duration: 5000 });
          }
          await api.post("/achievements/user", {
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
        await api.post("/achievements/user", {
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
