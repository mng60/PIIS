import React from "react";
import { Trophy, Medal } from "lucide-react";
import PremiumUsername from "@/components/ui/PremiumUsername";

export default function Leaderboard({ scores, isMultiplayer = false }) {
  if (!scores || scores.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aún no hay puntuaciones</p>
        <p className="text-sm">¡Sé el primero en jugar!</p>
      </div>
    );
  }

  const uniqueScores = isMultiplayer
    ? [...scores].sort((a, b) => (b.wins_count || 0) - (a.wins_count || 0))
    : [...scores].sort((a, b) => (b.best_score || 0) - (a.best_score || 0));

  const getMedalColor = (index) => {
    switch (index) {
      case 0: return "text-yellow-500";
      case 1: return "text-gray-400";
      case 2: return "text-amber-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="space-y-2">
      {uniqueScores.slice(0, 5).map((score, index) => (
        <div
          key={score.id}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            index < 3 
              ? "bg-gradient-to-r from-white/10 to-transparent border border-white/10" 
              : "bg-white/5"
          }`}
        >
          <div className={`w-8 text-center font-bold ${getMedalColor(index)}`}>
            {index < 3 ? (
              <Medal className="w-5 h-5 mx-auto" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {score.is_premium ? (
              <PremiumUsername
                name={score.user_name
                  ? score.user_name.includes('@') ? score.user_name.split('@')[0] : score.user_name
                  : "Anónimo"}
                className="font-medium truncate block"
              />
            ) : (
              <p className="font-medium text-white truncate">
                {score.user_name
                  ? score.user_name.includes('@') ? score.user_name.split('@')[0] : score.user_name
                  : "Anónimo"}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className={`font-bold ${index === 0 ? "text-yellow-500" : "text-white"}`}>
              {isMultiplayer
                ? `${score.wins_count || 0} vic.`
                : (score.best_score || 0).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}