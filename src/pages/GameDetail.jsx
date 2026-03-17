import React, { useState, useEffect, useRef } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2, ArrowLeft, Star, Play, Heart, Share2,
  Trophy, MessageSquare, Gamepad, MessageCircle, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SnakeGame from "@/components/games/SnakeGame";
import PongGame from "@/components/games/PongGame";
import ChessOnlineGame from "@/components/games/ChessOnlineGame";
import Leaderboard from "@/components/games/Leaderboard";
import CommentSection from "@/components/games/CommentSection";
import ChatSection from "@/components/games/ChatSection";
import AchievementsSection from "@/components/games/AchievementsSection";
import { evaluateAndUpdateAchievements } from "@/components/achievements";
import AgeGateDialog from "@/components/AgeGateDialog";
import OnlineGameMoveHistory from "@/components/games/OnlineGameMoveHistory";

const AGE_KEY = "playcraft_age_confirmed";

const categoryLabels = {
  accion: "Acción", puzzle: "Puzzle", arcade: "Arcade", estrategia: "Estrategia",
};

export default function GameDetail() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite]       = useState(false);
  const [isPlaying, setIsPlaying]         = useState(false);   // solo para HTML5 / chess
  const [sessionStart, setSessionStart]   = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [ageGateOpen, setAgeGateOpen]     = useState(false);
  const [pendingStart, setPendingStart]   = useState(false);   // para reanudar tras age gate
  const [chessMoveHistory, setChessMoveHistory] = useState([]);
  const [iframeSrcDoc, setIframeSrcDoc]   = useState(null);

  const iframeRef           = useRef(null);
  const chessSessionRef     = useRef(null);
  const chessRoleRef        = useRef(null);
  const lastDeliveredIdxRef = useRef(-1);
  const whiteNotifiedRef    = useRef(false);

  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("id");

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => api.get(`/games/${gameId}`),
    enabled: !!gameId,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["scores", gameId],
    queryFn: () => api.get(`/scores?game_id=${gameId}&limit=10`),
    enabled: !!gameId,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["comments", gameId],
    queryFn: () => api.get(`/comments?game_id=${gameId}`),
    enabled: !!gameId,
  });

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: () => api.get("/favorites"),
    enabled: !!user,
  });

  useEffect(() => {
    if (favorites && gameId) setIsFavorite(favorites.some(f => f.game_id === gameId));
  }, [favorites, gameId]);

  // Carga HTML5
  useEffect(() => {
    if (game?.game_type !== "html5") return;
    if (game.html_content) { setIframeSrcDoc(game.html_content); return; }
    if (!game.game_url) return;
    let cancelled = false;
    fetch(game.game_url).then(r => r.text()).then(html => { if (!cancelled) setIframeSrcDoc(html); }).catch(console.error);
    return () => { cancelled = true; };
  }, [game?.html_content, game?.game_url, game?.game_type]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const doStart = async () => {
    const now = Date.now();
    setSessionStart(now);
    setChatSessionId(game?.game_code === "chess-online" ? null : `session_${now}`);
    setIsPlaying(true);
    if (game) {
      await api.post(`/games/${gameId}/play`);
      queryClient.invalidateQueries(["game", gameId]);
    }
  };

  // Para juegos HTML5/multiplayer: click en "Jugar" del overlay
  const handlePlay = async () => {
    if (!user) { toast.error("¡Inicia sesión para jugar!"); return; }
    if (user?.is_banned) { toast.error("Tu cuenta está baneada"); return; }
    if (game?.is_adult && localStorage.getItem(AGE_KEY) !== "yes") {
      setPendingStart(true);
      setAgeGateOpen(true);
      return;
    }
    doStart();
  };

  // Para juegos builtin single-player: lo llaman internamente al pulsar "Jugar"
  const handleGameStart = async () => {
    if (!user) { toast.error("¡Inicia sesión para jugar!"); return false; }
    if (user?.is_banned) { toast.error("Tu cuenta está baneada"); return false; }
    if (game?.is_adult && localStorage.getItem(AGE_KEY) !== "yes") {
      setPendingStart(true);
      setAgeGateOpen(true);
      return false;
    }
    await api.post(`/games/${gameId}/play`);
    queryClient.invalidateQueries(["game", gameId]);
    return true;
  };

  const handleToggleFavorite = async () => {
    if (!user) { toast.error("Inicia sesión para guardar favoritos"); return; }
    if (isFavorite) { await api.delete(`/favorites/${gameId}`); }
    else { await api.post("/favorites", { game_id: gameId }); }
    refetchFavorites();
    setIsFavorite(!isFavorite);
  };

  const handleScoreUpdate = async (score) => {
    if (!user) return;
    await api.post("/scores", { game_id: gameId, score });
    queryClient.invalidateQueries(["scores", gameId]);
    await evaluateAndUpdateAchievements({ userEmail: user.email, gameId });
    queryClient.invalidateQueries(["userAchievements", user.email]);
    queryClient.invalidateQueries(["userAchievementsAll", user.email]);
  };

  const handleShare = () => { navigator.clipboard.writeText(window.location.href); toast.success("¡Enlace copiado!"); };

  // Mensajes desde iframe (score, game-over)
  useEffect(() => {
    const handler = (event) => {
      const { data } = event;
      if (!data || typeof data !== "object") return;
      if ((data.type === "SCORE_UPDATE" || data.type === "GAME_OVER") && typeof data.score === "number") {
        handleScoreUpdate(data.score);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [user, gameId]);

  // Chess relay: CREATE_ROOM / JOIN_ROOM / CHESS_MOVE
  useEffect(() => {
    if (!isPlaying || !user) return;
    const handler = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "CREATE_ROOM") {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
          const session = await api.post("/sessions", { room_code: code, game_id: gameId, game_state: { moves: [] }, current_turn: "host" });
          chessSessionRef.current = session; chessRoleRef.current = "host";
          lastDeliveredIdxRef.current = -1; whiteNotifiedRef.current = false;
          iframeRef.current?.contentWindow?.postMessage({ type: "ROOM_CREATED", code }, "*");
        } catch (e) { console.error(e); }
      }
      if (msg.type === "JOIN_ROOM") {
        try {
          const session = await api.get(`/sessions/${msg.code}`);
          if (!session || session.status !== "waiting") {
            iframeRef.current?.contentWindow?.postMessage({ type: "ROOM_ERROR", message: "Sala no encontrada" }, "*"); return;
          }
          await api.patch(`/sessions/${msg.code}`, { guest_email: user.email, guest_name: user.full_name || user.email.split("@")[0], status: "playing" });
          chessSessionRef.current = { ...session, guest_email: user.email, status: "playing" };
          chessRoleRef.current = "guest"; lastDeliveredIdxRef.current = -1;
          iframeRef.current?.contentWindow?.postMessage({ type: "PLAYER_INFO", player: { name: user.full_name || user.email.split("@")[0], email: user.email }, color: "black", opponentName: session.host_name || "Rival" }, "*");
        } catch (e) { console.error(e); }
      }
      if (msg.type === "CHESS_MOVE" && chessSessionRef.current) {
        try {
          const s = chessSessionRef.current;
          const moves = [...(s.game_state?.moves || []), { from: msg.from, to: msg.to, promo: msg.promo, player: chessRoleRef.current }];
          await api.patch(`/sessions/${s.room_code}`, { game_state: { moves } });
          chessSessionRef.current = { ...s, game_state: { moves } };
        } catch (e) { console.error(e); }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isPlaying, user, gameId]);

  // Chess relay: polling
  useEffect(() => {
    if (!isPlaying || !user) return;
    const poll = async () => {
      const session = chessSessionRef.current;
      if (!session) return;
      try {
        const latest = await api.get(`/sessions/${session.room_code}`);
        if (!latest) return;
        chessSessionRef.current = latest;
        const moves = latest.game_state?.moves || [];
        const myColor = chessRoleRef.current;
        if (myColor === "host" && latest.status === "playing" && !whiteNotifiedRef.current) {
          whiteNotifiedRef.current = true;
          iframeRef.current?.contentWindow?.postMessage({ type: "PLAYER_INFO", player: { name: user.full_name || user.email.split("@")[0], email: user.email }, color: "white", opponentName: latest.guest_name || "Rival" }, "*");
        }
        for (let i = lastDeliveredIdxRef.current + 1; i < moves.length; i++) {
          if (moves[i].player !== myColor) {
            iframeRef.current?.contentWindow?.postMessage({ type: "CHESS_OPPONENT_MOVE", from: moves[i].from, to: moves[i].to, promo: moves[i].promo }, "*");
          }
          lastDeliveredIdxRef.current = i;
        }
      } catch { /* silently ignore */ }
    };
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [isPlaying, user]);

  const handleIframeLoad = () => {
    if (iframeRef.current && user) {
      iframeRef.current.contentWindow?.postMessage({ type: "PLAYER_INFO", player: { name: user.full_name || user.email.split("@")[0], email: user.email } }, "*");
    }
  };

  // ── Loading / Not found ────────────────────────────────────────────────────

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
        <Link to={createPageUrl("Home")}><Button className="bg-gradient-to-r from-purple-600 to-cyan-500">Volver al inicio</Button></Link>
      </div>
    );
  }

  const rating = game.rating_count > 0 ? (game.rating_sum / game.rating_count).toFixed(1) : null;
  const isBuiltinSingle = game.game_type === "builtin" && !game.is_multiplayer;

  // ── Render del juego ───────────────────────────────────────────────────────

  const renderGameArea = () => {
    // Builtin single-player: siempre visible, el juego gestiona su propio estado
    if (game.game_code === "snake") {
      return <SnakeGame onScoreUpdate={handleScoreUpdate} onGameStart={handleGameStart} />;
    }
    if (game.game_code === "pong") {
      return <PongGame onScoreUpdate={handleScoreUpdate} onGameStart={handleGameStart} />;
    }

    // Chess (multiplayer builtin)
    if (game.game_code === "chess-online") {
      if (!isPlaying) return <GameCover game={game} onPlay={handlePlay} />;
      return (
        <ChessOnlineGame
          user={user}
          onScoreUpdate={handleScoreUpdate}
          onRoomCodeChange={code => setChatSessionId(code || null)}
          onMoveHistoryChange={moves => setChessMoveHistory(moves)}
        />
      );
    }

    // HTML5 iframe
    if (game.game_type === "html5") {
      if (!isPlaying) return <GameCover game={game} onPlay={handlePlay} />;
      if (!iframeSrcDoc) return (
        <div className="aspect-video flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      );
      return (
        <iframe
          ref={iframeRef}
          srcDoc={iframeSrcDoc}
          className="w-full aspect-video"
          sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock"
          allow="pointer-lock"
          title={game.title}
          onLoad={handleIframeLoad}
        />
      );
    }

    return <div className="aspect-video flex items-center justify-center"><p className="text-gray-500">Juego no disponible</p></div>;
  };

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <AgeGateDialog
        open={ageGateOpen}
        onConfirm={() => {
          localStorage.setItem(AGE_KEY, "yes");
          setAgeGateOpen(false);
          if (pendingStart) { setPendingStart(false); doStart(); }
        }}
        onDeny={() => { setAgeGateOpen(false); setPendingStart(false); toast.error("Debes ser mayor de 18 años."); }}
      />

      <Link to={createPageUrl("Home")} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
      </Link>

      <div className="space-y-6">

        {/* Cabecera */}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{game.title}</h1>
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
              <span>Por <span className="text-gray-300">{game.publisher || "Anónimo"}</span></span>
              {user && (user.role === "admin" || user.role === "empresa") && (
                <span className="flex items-center gap-1">
                  <Play className="w-3 h-3" /> {game.plays_count || 0} partidas
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={handleToggleFavorite}
              className={`border-white/10 ${isFavorite ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-gray-400 hover:text-white"}`}>
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} className="border-white/10 text-gray-400 hover:text-white">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Área del juego */}
        <div className={`grid gap-4 ${game.is_multiplayer && isPlaying ? "lg:grid-cols-[1fr_320px]" : ""}`}>
          {isBuiltinSingle ? (
            /* Sin tarjeta: el juego se centra y usa su propio estilo visual */
            <div className="flex justify-center py-2">
              <div className="w-full max-w-[520px]">
                {renderGameArea()}
              </div>
            </div>
          ) : (
            <div className="bg-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden">
              {renderGameArea()}
            </div>
          )}

          {/* Chat multijugador — al lado en desktop, debajo en móvil */}
          {game.is_multiplayer && isPlaying && (
            <div className="flex flex-col gap-4">
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col flex-1" style={{ minHeight: 260 }}>
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2 flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-purple-400" /> Chat de partida
                </h2>
                <ChatSection gameId={gameId} user={user} sessionId={chatSessionId} key={chatSessionId || sessionStart} />
              </div>
              {chessMoveHistory.length > 0 && (
                <OnlineGameMoveHistory moves={chessMoveHistory} title="Historial de jugadas" emptyMessage="Aún no hay movimientos" maxHeight="220px" />
              )}
            </div>
          )}
        </div>

        {/* Descripción */}
        {(game.full_description || game.description) && (
          <div className="bg-white/5 rounded-xl border border-white/10 p-5">
            <h2 className="text-base font-semibold text-white mb-2">Descripción</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {game.full_description || game.description}
            </p>
          </div>
        )}

        {/* Top 5 + Logros en fila */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Top 5
            </h2>
            <Leaderboard scores={scores} />
          </div>
          <AchievementsSection gameId={gameId} user={user} />
        </div>

        {/* Comentarios */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Comentarios ({comments.length})
          </h2>
          <CommentSection gameId={gameId} comments={comments} user={user} onCommentAdded={refetchComments} />
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar: portada con botón Jugar (para HTML5 y chess)
function GameCover({ game, onPlay }) {
  return (
    <div className="relative aspect-video w-full">
      {game.thumbnail ? (
        <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-cyan-900/40 flex items-center justify-center">
          <Gamepad className="w-16 h-16 text-white/20" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
        <Button
          onClick={onPlay}
          className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-lg px-8 py-6 rounded-xl"
        >
          <Play className="w-6 h-6 mr-2 fill-white" /> Jugar
        </Button>
      </div>
    </div>
  );
}
