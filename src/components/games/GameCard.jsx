import React from "react";
import { Link } from "react-router-dom";
import { Star, Play, Gamepad, Crown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";

const categoryColors = {
  accion: "from-red-500 to-orange-500",
  puzzle: "from-blue-500 to-purple-500",
  arcade: "from-green-500 to-cyan-500",
  estrategia: "from-yellow-500 to-amber-500"
};

const categoryLabels = {
  accion: "Acción",
  puzzle: "Puzzle",
  arcade: "Arcade",
  estrategia: "Estrategia"
};

export default function GameCard({ game, isPremiumUser = false , useLevelTheme = true}) {
  const { user } = useAuth();
  const rating = game.rating_count > 0
    ? (game.rating_sum / game.rating_count).toFixed(1)
    : "N/A";
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const userLevel = isRegularUser ? getLevelFromXP(user.xp ?? 0).level : null;
 const isLevel1User = useLevelTheme && userLevel === 1;
  const isLevel2User = useLevelTheme && userLevel === 2;
  const isLevel3User = useLevelTheme && userLevel === 3;
  const isLevel4User = useLevelTheme && userLevel === 4;
  const isLevel5User = useLevelTheme && userLevel === 5;

  const isEarlyAccess = game.early_access_until && new Date(game.early_access_until) > new Date();
  const isLocked = isEarlyAccess && !isPremiumUser;

  return (
    <Link
      to={`/games/${game.id}`}
      className="group block"
    >
      <div className={`game-card relative bg-gradient-to-b from-white/5 to-white/[0.02] border rounded-2xl overflow-hidden transition-all duration-300 ${isLocked ? "border-yellow-500/40 opacity-75 hover:opacity-90" : isLevel1User ? "user-level-1-game-card" : isLevel3User ? "user-level-3-widget user-level-3-game-card border-white/10" : "border-white/10 hover:border-purple-500/50"} ${isLevel2User ? "user-level-2-game-card" : ""} ${isLevel4User ? "user-level-4-game-card" : ""} ${isLevel5User ? "user-level-5-game-card" : ""}`}>
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-cyan-900/50 flex items-center justify-center">
              <Gamepad className="w-12 h-12 text-white/30" />
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>

          {/* Category Badge */}
          <Badge 
            className={`absolute top-3 left-3 bg-gradient-to-r ${categoryColors[game.category]} border-0 text-white text-xs font-medium`}
          >
            {categoryLabels[game.category] || game.category}
          </Badge>
          {game.is_adult && (
            <Badge className="absolute top-3 right-3 bg-red-600/80 border-red-500/50 text-white text-xs font-bold">
              +18
            </Badge>
          )}
          {isEarlyAccess && (
            <Badge className="absolute bottom-3 left-3 bg-yellow-500/90 border-yellow-400/50 text-black text-xs font-bold flex items-center gap-1">
              {isLocked ? <Lock className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
              {isLocked ? "Solo Premium" : "Acceso anticipado"}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className={`font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1 ${isLevel2User ? "user-level-2-widget-title" : ""} ${isLevel3User ? "user-level-3-widget-title" : ""}`}>
            {game.title}
          </h3>
          <p className={`text-sm text-gray-400 mt-1 line-clamp-2 h-10 ${isLevel3User ? "user-level-3-copy" : ""}`}>
            {game.description || "Sin descripción"}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium text-white">{rating}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Play className="w-3.5 h-3.5" />
              <span className="text-xs">{game.plays_count || 0} partidas</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
