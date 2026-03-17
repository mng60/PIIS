import React from "react";
import { Link } from "react-router-dom";
import { Star, Play, Sparkles, Gamepad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const categoryLabels = {
  accion: "Acción",
  puzzle: "Puzzle",
  arcade: "Arcade",
  estrategia: "Estrategia"
};

export default function FeaturedGame({ game }) {
  if (!game) return null;

  const rating = game.rating_count > 0 
    ? (game.rating_sum / game.rating_count).toFixed(1) 
    : "N/A";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/30 via-[#0f0f18] to-cyan-900/30 border border-white/10">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
      </div>

      <div className="relative grid md:grid-cols-2 gap-8 p-6 md:p-10">
        {/* Content */}
        <div className="flex flex-col justify-center order-2 md:order-1">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse-neon" />
            <span className="text-sm font-medium text-yellow-500 uppercase tracking-wider">
              Juego Destacado
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 neon-text">
            {game.title}
          </h2>

          <div className="flex items-center gap-4 mb-4">
            <Badge className="bg-white/10 text-white border-white/20">
              {categoryLabels[game.category] || game.category}
            </Badge>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-white font-medium">{rating}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Play className="w-4 h-4" />
              <span className="text-sm">{game.plays_count || 0} partidas</span>
            </div>
          </div>

          <p className="text-gray-300 mb-6 line-clamp-3">
            {game.full_description || game.description || "Descubre este increíble juego y desafía tus habilidades."}
          </p>

          <Link to={`/games/${game.id}`}>
            <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-white px-8 py-6 text-lg font-medium rounded-xl neon-glow">
              <Play className="w-5 h-5 mr-2 fill-white" />
              Jugar Ahora
            </Button>
          </Link>
        </div>

        {/* Image */}
        <div className="relative order-1 md:order-2">
          <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 neon-glow">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                alt={game.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-cyan-900/50 flex items-center justify-center">
                <Gamepad className="w-20 h-20 text-white/30" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}