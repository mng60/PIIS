import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Swords, ExternalLink, Bot, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getMyActiveChessGames } from '@/api/chess';
import { useFloatingPanels } from '@/lib/FloatingPanelsContext';

function displayName(name) {
  if (!name) return 'Rival';
  return name.includes('@') ? name.split('@')[0] : name;
}

function getModeLabel(game) {
  if (game.is_vs_ai) return 'Entrenador';
  return game.game_mode === 'ranked' ? 'Ranked' : 'Normal';
}

function getTurnLabel(game) {
  if (game.is_vs_ai) {
    return game.is_my_turn ? 'Tu turno' : 'El entrenador está pensando';
  }
  return game.is_my_turn ? 'Tu turno' : 'Turno del rival';
}

export default function ActiveChessGamesAlert() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const {
    isAssistantOpen,
    isChessAlertOpen,
    openChessAlert,
    closeChessAlert,
  } = useFloatingPanels();

  const { data: games = [] } = useQuery({
    queryKey: ['myActiveChessGames'],
    queryFn: getMyActiveChessGames,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    queryClient.invalidateQueries({ queryKey: ['myActiveChessGames'] });
  }, [isAuthenticated, location.pathname, queryClient, user]);

  useEffect(() => {
    if (!isChessAlertOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeChessAlert();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeChessAlert, isChessAlertOpen]);

  const currentRoomCode = new URLSearchParams(location.search).get('room');
  const visibleGames = games.filter(g => g.room_code !== currentRoomCode);

  useEffect(() => {
    if (!visibleGames.length) closeChessAlert();
  }, [closeChessAlert, visibleGames.length]);

  if (!visibleGames.length || isAssistantOpen) return null;

  return isChessAlertOpen ? (
    <div ref={containerRef} className="fixed bottom-6 left-6 z-50">
      <ChessGamesCard
        games={visibleGames}
        onNavigate={(game) => {
          closeChessAlert();
          if (game.game_id) navigate(`/games/${game.game_id}?room=${game.room_code}`);
        }}
        onClose={closeChessAlert}
      />
    </div>
  ) : (
    <button
      onClick={openChessAlert}
      className="fixed bottom-24 left-6 z-50 h-12 w-12 rounded-full border border-emerald-500/40 bg-[#0d0d1a] shadow-lg shadow-emerald-900/30 hover:scale-105 transition-transform"
      title={visibleGames.length === 1 ? 'Tienes 1 partida activa' : `Tienes ${visibleGames.length} partidas activas`}
    >
      <span className="relative flex h-full w-full items-center justify-center">
        <Swords className="w-5 h-5 text-emerald-400" />
        <span className="absolute -right-1 -top-1 min-w-[20px] h-5 px-1 rounded-full bg-emerald-500 text-[11px] font-bold text-black flex items-center justify-center">
          {visibleGames.length > 9 ? '9+' : visibleGames.length}
        </span>
      </span>
    </button>
  );
}

function ChessGamesCard({ games, onNavigate, onClose }) {
  const count = games.length;
  const pendingCount = games.filter(g => g.is_my_turn).length;

  return (
    <div className="w-[320px] rounded-xl border border-emerald-500/40 bg-[#0d0d1a] shadow-xl shadow-emerald-900/30 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-emerald-400 text-sm font-semibold">
              {pendingCount > 0
                ? `${pendingCount} esperando tu movimiento`
                : count === 1
                  ? '1 partida en curso'
                  : `${count} partidas en curso`}
            </p>
            <p className="text-white font-semibold text-base leading-tight mt-1">Partidas de ajedrez</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {count === 1 ? 'Tienes 1 partida pendiente' : `Tienes ${count} partidas pendientes`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-2 flex flex-col gap-1">
        {games.map(game => (
          <button
            key={game.room_code}
            onClick={() => onNavigate(game)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left w-full group"
          >
            {game.opponent_avatar ? (
              <img src={game.opponent_avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : game.is_vs_ai ? (
              <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-300" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName(game.opponent_name)}</p>
              <p className="text-gray-500 text-[11px]">
                {getModeLabel(game)} ·{' '}
                {game.is_my_turn
                  ? <span className="text-emerald-400">{getTurnLabel(game)}</span>
                  : getTurnLabel(game)}
              </p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
