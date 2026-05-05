import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, ExternalLink, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getMyActiveSessions } from '@/api/sessions';
import { useFloatingPanels } from '@/lib/FloatingPanelsContext';

function displayName(name) {
  if (!name) return 'Jugador';
  return name.includes('@') ? name.split('@')[0] : name;
}

function getStatusLabel(session) {
  if (session.status === 'waiting') {
    return `${session.player_count}/${session.max_players} jug. · Esperando inicio`;
  }
  return `${session.player_count} jugadores · En partida`;
}

export default function ActiveMultiplayerGamesAlert() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);

  const {
    isAssistantOpen,
    isMultiplayerAlertOpen,
    openMultiplayerAlert,
    closeMultiplayerAlert,
  } = useFloatingPanels();

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
    queryClient.invalidateQueries({ queryKey: ['myActiveSessions'] });
  }, [isAuthenticated, location.pathname, queryClient, user]);

  useEffect(() => {
    if (!isMultiplayerAlertOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeMultiplayerAlert();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeMultiplayerAlert, isMultiplayerAlertOpen]);

  const currentRoomCode = new URLSearchParams(location.search).get('room');
  const visibleSessions = sessions.filter(s => s.room_code !== currentRoomCode);

  useEffect(() => {
    if (!visibleSessions.length) closeMultiplayerAlert();
  }, [closeMultiplayerAlert, visibleSessions.length]);

  if (!visibleSessions.length || isAssistantOpen) return null;

  return isMultiplayerAlertOpen ? (
    <div ref={containerRef} className="fixed bottom-6 left-20 z-50">
      <SessionsCard
        sessions={visibleSessions}
        onNavigate={(s) => {
          closeMultiplayerAlert();
          if (s.game?.id) navigate(`/games/${s.game.id}?room=${s.room_code}`);
        }}
        onClose={closeMultiplayerAlert}
      />
    </div>
  ) : (
    <button
      onClick={openMultiplayerAlert}
      className="fixed bottom-24 left-20 z-50 h-12 w-12 rounded-full border border-cyan-500/40 bg-[#0d0d1a] shadow-lg shadow-cyan-900/30 hover:scale-105 transition-transform"
      title={visibleSessions.length === 1 ? 'Tienes 1 partida multijugador activa' : `Tienes ${visibleSessions.length} partidas multijugador activas`}
    >
      <span className="relative flex h-full w-full items-center justify-center">
        <Users className="w-5 h-5 text-cyan-400" />
        <span className="absolute -right-1 -top-1 min-w-[20px] h-5 px-1 rounded-full bg-cyan-500 text-[11px] font-bold text-black flex items-center justify-center">
          {visibleSessions.length > 9 ? '9+' : visibleSessions.length}
        </span>
      </span>
    </button>
  );
}

function SessionsCard({ sessions, onNavigate, onClose }) {
  return (
    <div className="w-[320px] rounded-xl border border-cyan-500/40 bg-[#0d0d1a] shadow-xl shadow-cyan-900/30 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-cyan-400 text-sm font-semibold">
              {sessions.length === 1 ? '1 partida activa' : `${sessions.length} partidas activas`}
            </p>
            <p className="text-white font-semibold text-base leading-tight mt-1">Partidas multijugador</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" title="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-2 flex flex-col gap-1">
        {sessions.map(s => (
          <button
            key={s.room_code}
            onClick={() => onNavigate(s)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left w-full group"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {s.game?.title || 'Partida multijugador'}
              </p>
              <p className="text-gray-500 text-[11px]">{getStatusLabel(s)}</p>
              {s.player_names?.length > 0 && (
                <p className="text-gray-600 text-[11px] truncate">
                  {s.player_names.map(displayName).join(', ')}
                </p>
              )}
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
