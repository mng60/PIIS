import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, Gamepad, Trophy, MessageSquare, TrendingUp } from 'lucide-react';
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
import { submitScore, recordGamePlay, getUserGameScores, getUserScores } from '@/api/scores';
import { getEloLeaderboard } from '@/api/elo';
import { getLevelFromXP } from '@/lib/levels';
import { evaluateMedals } from '@/lib/medals';

export default function GameDetail() {
  const { id: gameId } = useParams();
  const { user, updateUserData } = useAuth();
  const ageKey = user ? `playcraft_age_${user.email}_${gameId}` : null;
  const queryClient = useQueryClient();

  const { game, gameLoading, scores, comments, refetchComments, isFavorite, toggleFavorite, invalidateGame } =
    useGameDetail(gameId, user);

  const { data: userGameStatsArr = [] } = useQuery({
    queryKey: ['userGameStats', user?.email, gameId],
    queryFn: () => getUserGameScores(user.email, gameId),
    enabled: !!user && !!gameId,
  });
  const serverBestScore = userGameStatsArr[0]?.best_score ?? 0;

  const { data: eloLeaderboard = [] } = useQuery({
    queryKey: ['eloLeaderboard', gameId],
    queryFn: () => getEloLeaderboard(gameId),
    enabled: !!gameId && !!game?.elo_enabled,
  });

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

  const toMedalInput = (stats, xp) => ({
    totalPlays:      stats.reduce((s, r) => s + (r.plays_count || 0), 0),
    totalWins:       stats.reduce((s, r) => s + (r.wins_count || 0), 0),
    totalTimePlayed: stats.reduce((s, r) => s + (r.time_played || 0), 0),
    bestScore:       stats.length ? Math.max(...stats.map(r => r.best_score || 0)) : 0,
    gamesPlayed:     stats.length,
    level:           getLevelFromXP(xp).level,
  });

  const checkNewMedals = async (prevMedalIds, newXp, baseDelay = 0) => {
    try {
      const newStats  = await getUserScores(user.email);
      const fresh     = evaluateMedals(toMedalInput(newStats, newXp)).filter(m => !prevMedalIds.has(m.id));
      fresh.forEach((medal, i) => {
        const isUrl = /^https?:\/\/|^\/|^data:/.test(medal.icon) || /\.(png|svg|jpg|webp|gif)$/i.test(medal.icon);
        setTimeout(() => toast.custom(() => (
          <div style={{ backgroundColor: '#0d0d1a', border: `2px solid ${medal.color}`, borderRadius: '1rem', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '320px', boxShadow: `0 0 30px ${medal.color}44` }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: medal.color + '22', border: `2px solid ${medal.color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isUrl ? <img src={medal.icon} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                     : <span style={{ fontSize: 24 }}>{medal.icon}</span>}
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>¡Medalla desbloqueada!</p>
              <p style={{ color: medal.color, fontWeight: 800, fontSize: '1.1rem', margin: '2px 0 0' }}>{medal.name}</p>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '3px 0 0' }}>{medal.description}</p>
            </div>
          </div>
        ), { duration: 5000 }), baseDelay + i * 3000);
      });
    } catch {
      // silencioso — las medallas no son críticas
    }
  };

  const showLevelUpIfNeeded = (oldLevel, newLevel, delay = 0) => {
    if (newLevel.level <= oldLevel.level) return false;
    setTimeout(() => toast.custom(() => (
      <div style={{ backgroundColor: '#0d0d1a', border: `2px solid ${newLevel.color}`, borderRadius: '1rem', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '18px', minWidth: '340px', boxShadow: `0 0 40px ${newLevel.color}55` }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: newLevel.color + '22', border: `2px solid ${newLevel.color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 26 }}>
          ⬆️
        </div>
        <div>
          <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.78rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>¡Subida de nivel!</p>
          <p style={{ color: newLevel.color, fontWeight: 800, fontSize: '1.25rem', margin: '2px 0 0', lineHeight: 1.2 }}>Nv.{newLevel.level} {newLevel.name}</p>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '4px 0 0' }}>Sigue jugando para llegar más lejos</p>
        </div>
      </div>
    ), { duration: 6000 }), delay);
    return true;
  };

  const handleScoreUpdate = async (score) => {
    if (!user) return;
    const timePlayed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
    const minimal = game?.show_leaderboard === false && game?.show_achievements === false;

    const oldLevel = getLevelFromXP(user.xp ?? 0);
    const prevStats = await getUserScores(user.email).catch(() => []);
    const prevMedalIds = new Set(evaluateMedals(toMedalInput(prevStats, user.xp ?? 0)).map(m => m.id));

    if (minimal) {
      const result = await recordGamePlay(gameId, timePlayed);
      if (result?.xpGained) {
        const newXp = (user.xp ?? 0) + result.xpGained;
        updateUserData({ xp: newXp });
        showLevelUpIfNeeded(oldLevel, getLevelFromXP(newXp), 0);
        checkNewMedals(prevMedalIds, newXp);
      }
      return;
    }

    let totalXp = 0;
    const result = await submitScore(gameId, score, timePlayed);
    totalXp += result?.xpGained ?? 0;

    queryClient.invalidateQueries(['scores', gameId]);
    queryClient.invalidateQueries(['userGameStats', user?.email, gameId]);
    const achievementToasts = await evaluateAndUpdateAchievements({
      userEmail: user.email,
      gameId,
      onXpGained: (xp) => { totalXp += xp; },
    });
    const newXp = (user.xp ?? 0) + totalXp;
    const leveledUp = totalXp > 0
      ? showLevelUpIfNeeded(oldLevel, getLevelFromXP(newXp), (achievementToasts ?? 0) * 3000)
      : false;
    if (totalXp > 0) updateUserData({ xp: newXp });
    checkNewMedals(prevMedalIds, newXp, ((achievementToasts ?? 0) + (leveledUp ? 1 : 0)) * 3000);
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
          serverBestScore={serverBestScore}
          myEloRating={userGameStatsArr[0]?.elo_rating ?? 1200}
          onEloApplied={() => queryClient.invalidateQueries(['userGameStats', user?.email, gameId])}
        />

        {(game.full_description || game.description) && (
          <div className="bg-white/5 rounded-xl border border-white/10 p-5">
            <h2 className="text-base font-semibold text-white mb-2">Descripción</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {game.full_description || game.description}
            </p>
          </div>
        )}

        {(game.show_leaderboard !== false || game.show_achievements !== false) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {game.show_leaderboard !== false && (
              <div className="bg-white/5 rounded-xl border border-white/10 p-5">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" /> Top 5
                </h2>
                <Leaderboard scores={scores} />
              </div>
            )}
            {game.show_achievements !== false && (
              <AchievementsSection gameId={gameId} user={user} />
            )}
          </div>
        )}

        {game.elo_enabled && eloLeaderboard.length > 0 && (
          <div className="bg-white/5 rounded-xl border border-white/10 p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Ranking ELO
            </h2>
            <div className="space-y-2">
              {eloLeaderboard.slice(0, 10).map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                  <span className="text-xs text-gray-500 w-5 text-right">{i + 1}</span>
                  <span className="flex-1 text-sm text-white truncate">{entry.user_name}</span>
                  <span className="text-sm font-mono font-semibold text-cyan-400">{entry.elo_rating}</span>
                  <span className="text-xs text-gray-500">{entry.elo_games} partidas</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
