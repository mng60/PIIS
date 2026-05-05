import { Link } from "react-router-dom";
import { ArrowLeft, Star, Play, Heart, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLevelTheme } from "@/lib/useLevelTheme";

const categoryLabels = {
  accion: "Accion",
  puzzle: "Puzzle",
  arcade: "Arcade",
  estrategia: "Estrategia",
};

export default function GameHeader({ game, user, isFavorite, onToggleFavorite, onShare }) {
  const rating = game.rating_count > 0
    ? (game.rating_sum / game.rating_count).toFixed(1)
    : null;
  const { isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User } = useLevelTheme({ user });

  return (
    <>
      <Link
        to="/games"
        className={`inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm ${isLevel1User ? "user-level-1-game-detail-link" : ""} ${isLevel2User ? "user-level-2-game-detail-link" : ""} ${isLevel3User ? "user-level-3-game-detail-link" : ""} ${isLevel4User ? "user-level-4-game-detail-link" : ""} ${isLevel5User ? "user-level-5-game-detail-link" : ""}`}
      >
        <ArrowLeft className="w-4 h-4" /> Volver al catalogo
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className={`${isLevel1User ? "user-level-1-game-detail-chip" : ""} ${isLevel2User ? "user-level-2-game-detail-chip" : ""} ${isLevel3User ? "user-level-3-game-detail-chip" : ""} ${isLevel4User ? "user-level-4-game-detail-chip" : ""} ${isLevel5User ? "user-level-5-game-detail-chip" : ""} bg-white/10 text-white border-white/20`}>
              {categoryLabels[game.category] || game.category}
            </Badge>
            {game.is_multiplayer && (
              <Badge className={`${isLevel1User ? "user-level-1-game-detail-multi" : ""} ${isLevel2User ? "user-level-2-game-detail-multi" : ""} ${isLevel3User ? "user-level-3-game-detail-multi" : ""} ${isLevel4User ? "user-level-4-game-detail-multi" : ""} ${isLevel5User ? "user-level-5-game-detail-multi" : ""} bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1`}>
                <Users className="w-3 h-3" /> Multijugador
              </Badge>
            )}
            {game.is_adult && (
              <Badge className={`${isLevel1User ? "user-level-1-game-detail-adult" : ""} ${isLevel2User ? "user-level-2-game-detail-adult" : ""} ${isLevel3User ? "user-level-3-game-detail-adult" : ""} ${isLevel4User ? "user-level-4-game-detail-adult" : ""} ${isLevel5User ? "user-level-5-game-detail-adult" : ""} bg-red-500/20 text-red-400 border-red-500/30`}>
                +18
              </Badge>
            )}
          </div>

          <h1 className={`text-2xl sm:text-3xl font-bold text-white ${isLevel1User ? "user-level-1-game-detail-title" : ""} ${isLevel2User ? "user-level-2-game-detail-title" : ""} ${isLevel3User ? "user-level-3-game-detail-title" : ""} ${isLevel4User ? "user-level-4-game-detail-title" : ""} ${isLevel5User ? "user-level-5-game-detail-title" : ""}`}>
            {game.title}
          </h1>

          <div className={`flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400 ${isLevel1User ? "user-level-1-game-detail-meta" : ""} ${isLevel2User ? "user-level-2-game-detail-meta" : ""} ${isLevel3User ? "user-level-3-game-detail-meta" : ""} ${isLevel4User ? "user-level-4-game-detail-meta" : ""} ${isLevel5User ? "user-level-5-game-detail-meta" : ""}`}>
            {rating ? (
              <span className={`flex items-center gap-1 ${isLevel1User ? "user-level-1-detail-rating" : ""} ${isLevel2User ? "user-level-2-detail-rating" : ""} ${isLevel3User ? "user-level-3-detail-rating" : ""} ${isLevel4User ? "user-level-4-detail-rating" : ""} ${isLevel5User ? "user-level-5-detail-rating" : ""}`}>
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className={`text-white font-medium ${isLevel1User ? "user-level-1-detail-rating" : ""} ${isLevel2User ? "user-level-2-detail-rating" : ""} ${isLevel3User ? "user-level-3-detail-rating" : ""} ${isLevel4User ? "user-level-4-detail-rating" : ""} ${isLevel5User ? "user-level-5-detail-rating" : ""}`}>
                  {rating}
                </span>
                <span>({game.rating_count} votos)</span>
              </span>
            ) : (
              <span
                className={`text-gray-600 ${isLevel1User ? "user-level-1-detail-rating" : ""} ${isLevel2User ? "user-level-2-game-detail-unrated" : ""} ${isLevel3User ? "user-level-3-game-detail-meta" : ""} ${isLevel4User ? "user-level-4-game-detail-meta" : ""} ${isLevel5User ? "user-level-5-game-detail-meta" : ""}`}
              >
                Sin valoraciones
              </span>
            )}
            <span>
              Por{" "}
              <span className={`text-gray-300 ${isLevel1User ? "user-level-1-game-detail-publisher" : ""} ${isLevel2User ? "user-level-2-game-detail-publisher" : ""} ${isLevel3User ? "user-level-3-game-detail-publisher" : ""} ${isLevel4User ? "user-level-4-game-detail-publisher" : ""} ${isLevel5User ? "user-level-5-game-detail-publisher" : ""}`}>
                {game.publisher || "Anonimo"}
              </span>
            </span>
            {user && (user.role === "admin" || user.role === "empresa") && (
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" /> {game.plays_count || 0} partidas
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleFavorite}
            className={`border-white/10 ${
              isLevel5User ? `user-level-5-game-detail-action ${isFavorite ? "user-level-5-game-detail-action-favorite" : ""}` :
              isLevel4User ? `user-level-4-game-detail-action ${isFavorite ? "user-level-4-game-detail-action-favorite" : ""}` :
              isLevel3User ? `user-level-3-game-detail-action ${isFavorite ? "user-level-3-game-detail-action-favorite" : ""}` :
              isLevel2User ? `user-level-2-game-detail-action ${isFavorite ? "user-level-2-game-detail-action-favorite" : ""}` :
              isLevel1User ? `user-level-1-game-detail-action ${isFavorite ? "user-level-1-game-detail-action-favorite" : ""}` :
              isFavorite ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-gray-400 hover:text-white"
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className={`border-white/10 ${
              isLevel5User ? "user-level-5-game-detail-action user-level-5-game-detail-action-share" :
              isLevel4User ? "user-level-4-game-detail-action user-level-4-game-detail-action-share" :
              isLevel3User ? "user-level-3-game-detail-action user-level-3-game-detail-action-share" :
              isLevel2User ? "user-level-2-game-detail-action user-level-2-game-detail-action-share" :
              isLevel1User ? "user-level-1-game-detail-action user-level-1-game-detail-action-share" :
              "text-gray-400 hover:text-white"
            }`}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
