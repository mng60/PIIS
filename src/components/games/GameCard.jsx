import React from "react";
import { Link } from "react-router-dom";
import { Star, Play, Gamepad } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function GameCard({ game }) {
  const rating = game.rating_count > 0 
    ? (game.rating_sum / game.rating_count).toFixed(1) 
    : "N/A";

  return (
    <Link
      to={`/games/${game.id}`}
      className="group block"
    >
      <div className="game-card relative bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-purple-500/50">
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
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
            {game.title}
          </h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2 h-10">
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