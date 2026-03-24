import React from "react";
import { getAchievementDefinitions, getUserAchievements, upsertUserAchievement } from "@/api/achievements";
import { getUserGameScores, getUserScores } from "@/api/scores";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { RARITY_CONFIG } from "@/lib/levels";

/**
 * Lee UserGameStats en vez de registros de Score individuales.
 *
 * Para logros de juego concreto:  usa el stat del juego  (plays_count, best_score, wins_count)
 * Para logros globales:           agrega todos los stats del usuario
 */
export async function evaluateAndUpdateAchievements({ userEmail, gameId, onXpGained }) {
  let toastsShown = 0;
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
            const cfg = RARITY_CONFIG[def.rarity ?? 'bronze'];
            const delay = toastsShown * 3000;
            toastsShown++;
            setTimeout(() => toast.custom(() => (
              <div style={{ backgroundColor: '#12121f', border: `1px solid ${cfg.color}55`, borderRadius: '0.75rem', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', minWidth: '320px', boxShadow: `0 4px 24px ${cfg.color}33` }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: cfg.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trophy style={{ width: 22, height: 22, color: cfg.color }} />
                </div>
                <div>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>¡Logro desbloqueado!</p>
                  <p style={{ color: cfg.color, fontWeight: 600, fontSize: '0.85rem', margin: '2px 0 0' }}>{def.title}</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '1px 0 0' }}>{cfg.label} · +{cfg.xp} XP</p>
                </div>
              </div>
            ), { duration: 5000 }), delay);
          }
          const res = await upsertUserAchievement({
            achievement_id: def.id,
            game_id: def.game_id || null,
            progress,
            unlocked,
            unlocked_date: unlocked && !wasUnlocked ? new Date().toISOString() : undefined,
          });
          if (res?.xpGained && onXpGained) onXpGained(res.xpGained);
        }
      } else {
        if (unlocked) {
          const cfg = RARITY_CONFIG[def.rarity ?? 'bronze'];
          const delay = toastsShown * 3000;
          toastsShown++;
          setTimeout(() => toast.custom(() => (
            <div style={{ backgroundColor: '#12121f', border: `1px solid ${cfg.color}55`, borderRadius: '0.75rem', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', minWidth: '320px', boxShadow: `0 4px 24px ${cfg.color}33` }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: cfg.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trophy style={{ width: 22, height: 22, color: cfg.color }} />
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>¡Logro desbloqueado!</p>
                <p style={{ color: cfg.color, fontWeight: 600, fontSize: '0.85rem', margin: '2px 0 0' }}>{def.title}</p>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '1px 0 0' }}>{cfg.label} · +{cfg.xp} XP</p>
              </div>
            </div>
          ), { duration: 5000 }), delay);
        }
        const res = await upsertUserAchievement({
          achievement_id: def.id,
          user_email: userEmail,
          game_id: def.game_id || null,
          progress,
          unlocked,
          unlocked_date: unlocked ? new Date().toISOString() : undefined,
        });
        if (res?.xpGained && onXpGained) onXpGained(res.xpGained);
      }
    }
  } catch (e) {
    console.error("[achievements] evaluateAndUpdateAchievements error:", e);
  }
  return toastsShown;
}
