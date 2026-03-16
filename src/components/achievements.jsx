import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Evaluates relevant achievement definitions for a user/game
 * and creates/updates UserAchievement records accordingly.
 * - Caps progress at threshold (no more 12/10)
 * - Fires a toast when a new achievement is unlocked
 */
export async function evaluateAndUpdateAchievements({ userEmail, gameId }) {
  try {
    const allDefinitions = await base44.entities.AchievementDefinition.filter({ is_active: true });
    const relevant = allDefinitions.filter((a) => a.game_id === gameId || !a.game_id);
    if (relevant.length === 0) return;

    const [gameScores, allScores] = await Promise.all([
      base44.entities.Score.filter({ user_email: userEmail, game_id: gameId }),
      base44.entities.Score.filter({ user_email: userEmail }),
    ]);

    const existing = await base44.entities.UserAchievement.filter({ user_email: userEmail });

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

      // IMPORTANT: cap progress so UI never shows 12/10, 15/10, etc.
      const progress = threshold > 0 ? Math.min(rawProgress, threshold) : rawProgress;

      const found = existing.find((ua) => ua.achievement_id === def.id);

      if (found) {
        const wasUnlocked = !!found.unlocked;
        const prevProgress = Number(found.progress || 0);
        const progressChanged = Math.abs(progress - prevProgress) > 1e-6;
        const unlockedChanged = unlocked !== wasUnlocked;

        if (progressChanged || unlockedChanged) {
          const updateData = { progress, unlocked };

          if (unlocked && !wasUnlocked) {
            updateData.unlocked_date = new Date().toISOString();
            toast.success(`🏆 ${def.title} completado`, { duration: 5000 });
          }

          await base44.entities.UserAchievement.update(found.id, updateData);
        }
      } else {
        const createData = {
          achievement_id: def.id,
          user_email: userEmail,
          // Para logros globales guardamos game_id null (así luego podemos agrupar como "Generales")
          game_id: def.game_id ? def.game_id : null,
          progress,
          unlocked,
        };

        if (unlocked) {
          createData.unlocked_date = new Date().toISOString();
          toast.success(`🏆 ${def.title} completado`, { duration: 5000 });
        }

        await base44.entities.UserAchievement.create(createData);
      }
    }
  } catch (e) {
    console.error("[achievements] evaluateAndUpdateAchievements error:", e);
  }
}