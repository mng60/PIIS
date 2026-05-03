import { Link } from 'react-router-dom';
import { ArrowLeft, Star, Play, Heart, Share2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLevelFromXP } from '@/lib/levels';

const categoryLabels = {
  accion: 'Acción', puzzle: 'Puzzle', arcade: 'Arcade', estrategia: 'Estrategia',
};

export default function GameHeader({ game, user, isFavorite, onToggleFavorite, onShare , useLevelTheme = true}) {
  const rating = game.rating_count > 0
    ? (game.rating_sum / game.rating_count).toFixed(1)
    : null;
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const userLevel = isRegularUser ? getLevelFromXP(user.xp ?? 0).level : null;
    const isLevel1User = useLevelTheme && userLevel === 1;
  const isLevel2User = useLevelTheme && userLevel === 2;
  const isLevel3User = useLevelTheme && userLevel === 3;
  const isLevel4User = useLevelTheme && userLevel === 4;
  const isLevel5User = useLevelTheme && userLevel === 5;

  return (
    <>
      <Link to="/games" className={`inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm ${isLevel1User ? "user-level-1-game-detail-link" : ""} ${isLevel2User ? "user-level-2-game-detail-link" : ""} ${isLevel3User ? "user-level-3-game-detail-link" : ""} ${isLevel4User ? "user-level-4-game-detail-link" : ""} ${isLevel5User ? "user-level-5-game-detail-link" : ""}`}>
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className="bg-white/10 text-white border-white/20">
              {categoryLabels[game.category] || game.category}
            </Badge>
            {game.is_multiplayer && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1">
                <Users className="w-3 h-3" /> Multijugador
              </Badge>
            )}
            {game.is_adult && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">+18</Badge>
            )}
          </div>

          <h1 className={`text-2xl sm:text-3xl font-bold text-white ${isLevel2User ? "user-level-2-game-detail-title" : ""}`}>{game.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
            {rating ? (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-white font-medium">{rating}</span>
                <span>({game.rating_count} votos)</span>
              </span>
            ) : (
              <span className="text-gray-600">Sin valoraciones</span>
            )}
            <span>Por <span className="text-gray-300">{game.publisher || 'Anónimo'}</span></span>
            {user && (user.role === 'admin' || user.role === 'empresa') && (
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
            className={`border-white/10 ${isLevel2User ? `user-level-2-game-detail-action ${isFavorite ? 'user-level-2-game-detail-action-favorite' : ''}` : ''} ${isFavorite ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className={`border-white/10 text-gray-400 hover:text-white ${isLevel2User ? "user-level-2-game-detail-action user-level-2-game-detail-action-share" : ""}`}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
