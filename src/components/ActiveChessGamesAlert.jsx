import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Gamepad2, Swords, Users, Bot, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getMyActiveChessGames } from '@/api/chess';
import { getMyActiveSessions } from '@/api/sessions';
import { useFloatingPanels } from '@/lib/FloatingPanelsContext';

function displayName(name) {
  if (!name) return 'Jugador';
  return name.includes('@') ? name.split('@')[0] : name;
}

function getChessModeLabel(game) {
  if (game.is_vs_ai) return 'Entrenador';
  return game.game_mode === 'ranked' ? 'Ranked' : 'Normal';
}

function getChessTurnLabel(game) {
  if (game.is_vs_ai) {
    return game.is_my_turn ? 'Tu turno' : 'El entrenador está pensando';
  }
  return game.is_my_turn ? 'Tu turno' : 'Turno del rival';
}

function getSessionStatusLabel(session) {
  return `${session.player_count} jugadores · En partida`;
}

function getGroupIcon(type) {
  if (type === 'chess') return Swords;
  return Users;
}

export default function ActiveChessGamesAlert() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const {
    isAssistantOpen,
    isChessAlertOpen,
    openChessAlert,
    closeChessAlert,
  } = useFloatingPanels();

  const { data: chessGames = [] } = useQuery({
    queryKey: ['myActiveChessGames'],
    queryFn: getMyActiveChessGames,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['myActiveSessions'],
    queryFn: getMyActiveSessions,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    queryClient.invalidateQueries({ queryKey: ['myActiveChessGames'] });
    queryClient.invalidateQueries({ queryKey: ['myActiveSessions'] });
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

  const groups = useMemo(() => {
    const visibleChessGames = chessGames.filter(g => g.room_code !== currentRoomCode);
    const visibleSessions = sessions.filter(s => s.status === 'playing' && s.room_code !== currentRoomCode);

    const sessionGroups = visibleSessions.reduce((acc, session) => {
      const key = session.game?.game_code || `session-${session.game_id || 'unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          type: 'session',
          title: session.game?.title || 'Partida multijugador',
          subtitle: 'Partidas en curso',
          items: [],
        };
      }
      acc[key].items.push(session);
      return acc;
    }, {});

    const result = [];
    if (visibleChessGames.length) {
      result.push({
        key: 'chess-online',
        type: 'chess',
        title: 'Ajedrez Online',
        subtitle: visibleChessGames.some(game => game.is_my_turn)
          ? `${visibleChessGames.filter(game => game.is_my_turn).length} esperando tu movimiento`
          : 'Partidas en curso',
        items: visibleChessGames,
      });
    }

    return [
      ...result,
      ...Object.values(sessionGroups).sort((a, b) => b.items.length - a.items.length || a.title.localeCompare(b.title)),
    ];
  }, [chessGames, currentRoomCode, sessions]);

  const totalCount = groups.reduce((sum, group) => sum + group.items.length, 0);
  const selectedGroup = groups.find(group => group.key === selectedGroupKey) || null;

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupKey(null);
      closeChessAlert();
      return;
    }
    if (selectedGroupKey && !groups.some(group => group.key === selectedGroupKey)) {
      setSelectedGroupKey(null);
    }
  }, [closeChessAlert, groups, selectedGroupKey]);

  if (!groups.length || isAssistantOpen) return null;

  return isChessAlertOpen ? (
    <div ref={containerRef} className="fixed bottom-6 left-6 z-50">
      <GamesCard
        groups={groups}
        selectedGroup={selectedGroup}
        onBack={() => setSelectedGroupKey(null)}
        onSelectGroup={setSelectedGroupKey}
        onNavigate={(item, type) => {
          closeChessAlert();
          if (type === 'chess') {
            if (item.game_id) navigate(`/games/${item.game_id}?room=${item.room_code}`);
            return;
          }
          if (item.game?.id) navigate(`/games/${item.game.id}?room=${item.room_code}`);
        }}
        onClose={() => {
          setSelectedGroupKey(null);
          closeChessAlert();
        }}
      />
    </div>
  ) : (
    <button
      onClick={openChessAlert}
      className="fixed bottom-24 left-6 z-50 h-12 w-12 rounded-full border border-emerald-500/40 bg-[#0d0d1a] shadow-lg shadow-emerald-900/30 hover:scale-105 transition-transform"
      title={totalCount === 1 ? 'Tienes 1 partida activa' : `Tienes ${totalCount} partidas activas`}
    >
      <span className="relative flex h-full w-full items-center justify-center">
        <Gamepad2 className="w-5 h-5 text-emerald-400" />
        <span className="absolute -right-1 -top-1 min-w-[20px] h-5 px-1 rounded-full bg-emerald-500 text-[11px] font-bold text-black flex items-center justify-center">
          {totalCount > 9 ? '9+' : totalCount}
        </span>
      </span>
    </button>
  );
}

function GamesCard({ groups, selectedGroup, onBack, onSelectGroup, onNavigate, onClose }) {
  return (
    <div className="w-[320px] rounded-xl border border-emerald-500/40 bg-[#0d0d1a] shadow-xl shadow-emerald-900/30 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {selectedGroup && (
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors" title="Volver">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <p className="text-emerald-400 text-sm font-semibold">
                {selectedGroup ? `${selectedGroup.items.length} partidas` : 'Juegos abiertos'}
              </p>
            </div>
            <p className="text-white font-semibold text-base leading-tight mt-1">
              {selectedGroup ? selectedGroup.title : 'Partidas activas'}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {selectedGroup ? selectedGroup.subtitle : 'Selecciona un juego para ver sus salas'}
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
        {selectedGroup ? (
          selectedGroup.type === 'chess' ? (
            selectedGroup.items.map(game => (
              <button
                key={game.room_code}
                onClick={() => onNavigate(game, 'chess')}
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
                    {getChessModeLabel(game)} ·{' '}
                    {game.is_my_turn
                      ? <span className="text-emerald-400">{getChessTurnLabel(game)}</span>
                      : getChessTurnLabel(game)}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
              </button>
            ))
          ) : (
            selectedGroup.items.map(session => (
              <button
                key={session.room_code}
                onClick={() => onNavigate(session, 'session')}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left w-full group"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{session.room_code}</p>
                  <p className="text-gray-500 text-[11px]">{getSessionStatusLabel(session)}</p>
                  {session.player_names?.length > 0 && (
                    <p className="text-gray-600 text-[11px] truncate">
                      {session.player_names.map(displayName).join(', ')}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
              </button>
            ))
          )
        ) : (
          groups.map(group => {
            const Icon = getGroupIcon(group.type);
            return (
              <button
                key={group.key}
                onClick={() => onSelectGroup(group.key)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left w-full group"
              >
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  group.type === 'chess'
                    ? 'bg-emerald-500/15 border-emerald-500/30'
                    : 'bg-cyan-500/15 border-cyan-500/30'
                }`}>
                  <Icon className={`w-4 h-4 ${group.type === 'chess' ? 'text-emerald-300' : 'text-cyan-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{group.title}</p>
                  <p className="text-gray-500 text-[11px] truncate">{group.subtitle}</p>
                </div>
                <span className="min-w-[24px] h-6 px-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 flex items-center justify-center">
                  {group.items.length}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
