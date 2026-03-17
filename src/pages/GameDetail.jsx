import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Gamepad, Trophy, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameDetail } from '@/hooks/useGameDetail';
import GameHeader from '@/components/game-detail/GameHeader';
import GameArea from '@/components/game-detail/GameArea';
import Leaderboard from '@/components/games/Leaderboard';
import AchievementsSection from '@/components/games/AchievementsSection';
import CommentSection from '@/components/games/CommentSection';
import AgeGateDialog from '@/components/AgeGateDialog';
import { evaluateAndUpdateAchievements } from '@/components/achievements';
import { recordPlay } from '@/api/games';
import { submitScore } from '@/api/scores';

export default function GameDetail() {
  const { id: gameId } = useParams();
  const { user } = useAuth();
  const ageKey = user ? `playcraft_age_${user.email}_${gameId}` : null;
  const queryClient = useQueryClient();

  const { game, gameLoading, scores, comments, refetchComments, isFavorite, toggleFavorite, invalidateGame } =
    useGameDetail(gameId, user);

  const [isPlaying,       setIsPlaying]       = useState(false);
  const [sessionStart,    setSessionStart]     = useState(null);
  const [chatSessionId,   setChatSessionId]    = useState(null);
  const [ageGateOpen,     setAgeGateOpen]      = useState(false);
  const [pendingStart,    setPendingStart]     = useState(false);
  const [chessMoveHistory, setChessMoveHistory] = useState([]);

  const doStart = async () => {
    const now = Date.now();
    setSessionStart(now);
    setChatSessionId(game?.game_code === 'chess-online' ? null : `session_${now}`);
    setIsPlaying(true);
    if (game) { await recordPlay(gameId); invalidateGame(); }
  };

  const handlePlay = async () => {
    if (!user) { toast.error('¡Inicia sesión para jugar!'); return; }
    if (user.is_banned) { toast.error('Tu cuenta está baneada'); return; }
    if (game?.is_adult && localStorage.getItem(ageKey) !== 'yes') {
      setPendingStart(true); setAgeGateOpen(true); return;
    }
    doStart();
  };

  const handleGameStart = async () => {
    if (!user) { toast.error('¡Inicia sesión para jugar!'); return false; }
    if (user.is_banned) { toast.error('Tu cuenta está baneada'); return false; }
    if (game?.is_adult && localStorage.getItem(ageKey) !== 'yes') {
      setPendingStart(true); setAgeGateOpen(true); return false;
    }
    await recordPlay(gameId);
    invalidateGame();
    return true;
  };

  const handleScoreUpdate = async (score) => {
    if (!user) return;
    await submitScore(gameId, score);
    queryClient.invalidateQueries(['scores', gameId]);
    await evaluateAndUpdateAchievements({ userEmail: user.email, gameId });
    queryClient.invalidateQueries(['userAchievements', user.email]);
    queryClient.invalidateQueries(['userAchievementsAll', user.email]);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('¡Enlace copiado!');
  };

  if (gameLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Gamepad className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Juego no encontrado</h2>
        <p className="text-gray-400 mb-6">El juego que buscas no existe o fue eliminado.</p>
        <Link to="/"><Button className="bg-gradient-to-r from-purple-600 to-cyan-500">Volver al inicio</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <AgeGateDialog
        open={ageGateOpen}
        onConfirm={() => {
          localStorage.setItem(ageKey, 'yes');
          setAgeGateOpen(false);
          if (pendingStart) { setPendingStart(false); doStart(); }
        }}
        onDeny={() => { setAgeGateOpen(false); setPendingStart(false); toast.error('Debes ser mayor de 18 años.'); }}
      />

      <div className="space-y-6">
        <GameHeader
          game={game}
          user={user}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onShare={handleShare}
        />

        <GameArea
          game={game}
          user={user}
          gameId={gameId}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onScoreUpdate={handleScoreUpdate}
          onGameStart={handleGameStart}
          chatSessionId={chatSessionId}
          sessionStart={sessionStart}
          chessMoveHistory={chessMoveHistory}
          onChessMoveHistoryChange={setChessMoveHistory}
          onChatSessionIdChange={setChatSessionId}
        />

        {(game.full_description || game.description) && (
          <div className="bg-white/5 rounded-xl border border-white/10 p-5">
            <h2 className="text-base font-semibold text-white mb-2">Descripción</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {game.full_description || game.description}
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Top 5
            </h2>
            <Leaderboard scores={scores} />
          </div>
          <AchievementsSection gameId={gameId} user={user} />
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Comentarios ({comments.length})
          </h2>
          <CommentSection
            gameId={gameId}
            comments={comments}
            user={user}
            onCommentAdded={refetchComments}
          />
        </div>
      </div>
    </div>
  );
}
