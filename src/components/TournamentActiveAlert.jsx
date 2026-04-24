import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Trophy, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getMyActiveMatch } from '@/api/tournaments';

export default function TournamentActiveAlert() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const prevMatchIdRef = useRef(null);
  const isFirstFetch = useRef(true);
  const notificationToastIdRef = useRef(null);

  const { data: activeData } = useQuery({
    queryKey: ['myActiveMatch'],
    queryFn: getMyActiveMatch,
    refetchInterval: 15_000,
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  const isOnGamePage = location.pathname.startsWith('/games/');
  const isOnTournamentPage = location.pathname.startsWith('/tournaments/');

  useEffect(() => {
    if (!activeData) {
      // No hay partida activa — cerrar notificación persistente si existía
      if (notificationToastIdRef.current) {
        toast.dismiss(notificationToastIdRef.current);
        notificationToastIdRef.current = null;
      }

      if (!isFirstFetch.current) prevMatchIdRef.current = null;
      isFirstFetch.current = false;
      return;
    }

    const { match, tournament, game } = activeData;
    const matchId = match.id;

    if (isFirstFetch.current) {
      // Primera carga: usuario volvió (estaba offline) → solo mostrar notificación
      isFirstFetch.current = false;
      prevMatchIdRef.current = matchId;
      showPersistentNotification(activeData);
      return;
    }

    if (prevMatchIdRef.current !== matchId) {
      // Partida nueva detectada → usuario estaba online cuando empezó el torneo
      prevMatchIdRef.current = matchId;

      if (!isOnGamePage) {
        // Redirigir directamente a la sala
        toast.success(`¡Tu partida en "${tournament.title}" ha comenzado!`, { duration: 4000 });
        navigate(`/games/${tournament.game_id}?room=${match.room_code}&tournament=${tournament.id}`);
      }
      return;
    }

    // Misma partida de antes: mostrar/mantener notificación persistente si no estamos en la sala ni en el torneo
    if (!isOnGamePage && !isOnTournamentPage) {
      showPersistentNotification(activeData);
    }
  }, [activeData, isOnGamePage, isOnTournamentPage]);

  // Cerrar notificación si el usuario entra a la sala del juego o a la página del torneo
  useEffect(() => {
    if ((isOnGamePage || isOnTournamentPage) && notificationToastIdRef.current) {
      toast.dismiss(notificationToastIdRef.current);
      notificationToastIdRef.current = null;
    }
  }, [isOnGamePage, isOnTournamentPage]);

  function showPersistentNotification({ match, tournament }) {
    if (isOnGamePage || isOnTournamentPage) return;
    if (notificationToastIdRef.current) return; // ya se muestra

    const toastId = toast.custom(
      (t) => (
        <div
          className="flex items-start gap-3 p-4 rounded-xl border border-purple-500/40 bg-[#0d0d1a] shadow-xl shadow-purple-900/30 min-w-[280px] max-w-xs"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">Torneo en curso</p>
            <p className="text-gray-400 text-xs mt-0.5 truncate">{tournament.title}</p>
            <p className="text-purple-300 text-xs mt-1">Tienes una partida esperándote</p>
            <button
              onClick={() => {
                toast.dismiss(t);
                notificationToastIdRef.current = null;
                navigate(`/tournaments/${tournament.id}?autoplay=1`);
              }}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-200 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Ir al torneo
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'bottom-right',
        id: `tournament-alert-${match.id}`,
      }
    );

    notificationToastIdRef.current = toastId;
  }

  return null;
}
