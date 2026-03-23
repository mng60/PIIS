import React from "react";
import { getAchievementDefinitions, getUserAchievements } from "@/api/achievements";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Star } from "lucide-react";
import { RARITY_CONFIG } from "@/lib/levels";

const METRIC_LABELS = {
  plays_count: "partidas",
  best_score: "puntos",
  wins_count: "victorias",
  single_run_score: "puntos en una partida"
};

export default function AchievementsSection({ gameId, user }) {
  const { data: definitions = [] } = useQuery({
    queryKey: ["achievementDefs", gameId],
    queryFn: async () => {
      const all = await getAchievementDefinitions();
      return all
        .filter(a => a.game_id === gameId || !a.game_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
    enabled: !!gameId
  });

  const { data: userAchievements = [] } = useQuery({
    queryKey: ["userAchievements", user?.email],
    queryFn: getUserAchievements,
    enabled: !!user
  });

  if (definitions.length === 0) return null;

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        Logros ({definitions.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {definitions.map(def => {
          const ua = userAchievements.find(u => u.achievement_id === def.id);
          const unlocked = ua?.unlocked || false;
          const threshold = Number(def.threshold || 0);
          const rawProgress = Number(ua?.progress || 0);
          const progress = threshold > 0 ? Math.min(rawProgress, threshold) : rawProgress;
          const pct = threshold > 0 ? Math.min(100, Math.round((progress / threshold) * 100)) : 0;

          const cfg = RARITY_CONFIG[def.rarity ?? 'bronze'];
          return (
            <div
              key={def.id}
              className="p-4 rounded-lg border transition-all"
              style={unlocked
                ? { backgroundColor: cfg.color + '18', borderColor: cfg.color + '55' }
                : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${!unlocked && "opacity-30"}`}>
                  {def.icon_url ? (
                    <img src={def.icon_url} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <Trophy className="w-7 h-7" style={{ color: unlocked ? cfg.color : '#6b7280' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate" style={unlocked ? { color: cfg.color } : { color: 'white' }}>
                      {def.title}
                    </p>
                    {unlocked && <Star className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color, fill: cfg.color }} />}
                  </div>
                  {def.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{def.description}</p>
                  )}
                  {user && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>
                          {Number.isInteger(progress) ? progress : progress.toFixed(1)} / {threshold} {METRIC_LABELS[def.metric]}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: unlocked ? cfg.color : '#a855f7' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}