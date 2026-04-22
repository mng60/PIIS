import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Swords, ExternalLink, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getMyActiveChessGames } from '@/api/chess';

export default function ActiveChessGamesAlert() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toastIdRef = useRef(null);

  const { data: games = [] } = useQuery({
    queryKey: ['myActiveChessGames'],
    queryFn: getMyActiveChessGames,
    refetchInterval: 15_000,
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  const isOnChessPage = location.pathname.startsWith('/games/') && location.search.includes('room=');

  useEffect(() => {
    if (isOnChessPage && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [isOnChessPage]);

  useEffect(() => {
    const count = games.length;

    if (count === 0) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    if (isOnChessPage) return;

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    toastIdRef.current = toast.custom(
      () => (
        <ChessGamesCard
          games={games}
          onNavigate={(game) => {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
            if (game.game_id) {
              navigate(`/games/${game.game_id}?room=${game.room_code}`);
            }
          }}
        />
      ),
      {
        duration: Infinity,
        position: 'bottom-left',
        id: 'active-chess-games',
      }
    );
  }, [games, isOnChessPage]);

  return null;
}

function ChessGamesCard({ games, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const count = games.length;

  return (
    // flex-col-reverse: el header queda anclado abajo y la lista se expande hacia arriba
    <div
      className="flex flex-col-reverse gap-2 p-4 rounded-xl border border-emerald-500/40 bg-[#0d0d1a] shadow-xl shadow-emerald-900/30 min-w-[280px] max-w-xs"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header — primer elemento DOM = visualmente abajo */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center">
          <Swords className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">Partidas de ajedrez</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {count === 1 ? 'Tienes 1 partida en curso' : `Tienes ${count} partidas en curso`}
          </p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {/* Invertidos porque col-reverse: arriba = colapsar, abajo = expandir */}
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Enlace rápido (1 partida) o botón "ver partidas" — aparece encima del header */}
      {!expanded && count === 1 && (
        <button
          onClick={() => onNavigate(games[0])}
          className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-200 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {games[0].is_my_turn ? 'Es tu turno — ir a jugar' : 'Ver partida'}
        </button>
      )}

      {!expanded && count > 1 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-200 transition-colors"
        >
          <Circle className="w-2 h-2 fill-emerald-400" />
          {games.filter(g => g.is_my_turn).length > 0
            ? `${games.filter(g => g.is_my_turn).length} esperando tu movimiento`
            : 'Ver partidas'}
        </button>
      )}

      {/* Lista expandida — aparece encima de todo con flex-col-reverse */}
      {expanded && (
        <div className="flex flex-col gap-1 border-b border-white/10 pb-2">
          {games.map(game => (
            <button
              key={game.room_code}
              onClick={() => onNavigate(game)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left w-full group"
            >
              {game.opponent_avatar ? (
                <img src={game.opponent_avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{game.opponent_name}</p>
                <p className="text-gray-500 text-[10px]">
                  {game.game_mode === 'ranked' ? 'Ranked' : 'Normal'} ·{' '}
                  {game.is_my_turn
                    ? <span className="text-emerald-400">Tu turno</span>
                    : 'Turno del rival'}
                </p>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
