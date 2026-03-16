import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Loader2, 
  ArrowLeft, 
  Star, 
  Play, 
  Heart, 
  Share2,
  Trophy,
  MessageSquare,
  Gamepad,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
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

const categoryLabels = {
  accion: "Acción",
  puzzle: "Puzzle",
  arcade: "Arcade",
  estrategia: "Estrategia"
};

export default function GameDetail() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const iframeRef = useRef(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [chessMoveHistory, setChessMoveHistory] = useState([]);

  // Chess relay refs (avoid stale closures in polling)
  const chessSessionRef = useRef(null);
  const chessRoleRef = useRef(null);
  const lastDeliveredIdxRef = useRef(-1);
  const whiteNotifiedRef = useRef(false);
  // srcdoc for HTML5 games (bypasses Supabase CSP and text/plain MIME)
  const [iframeSrcDoc, setIframeSrcDoc] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("id");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      setUser(null);
    }
  };

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const games = await base44.entities.Game.filter({ id: gameId });
      return games[0] || null;
    },
    enabled: !!gameId
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["scores", gameId],
    queryFn: () => base44.entities.Score.filter({ game_id: gameId }, "-score", 10),
    enabled: !!gameId
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["comments", gameId],
    queryFn: () => base44.entities.Comment.filter({ game_id: gameId }, "-created_date"),
    enabled: !!gameId
  });

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ user_email: user.email }),
    enabled: !!user
  });

  useEffect(() => {
    if (favorites && gameId) {
      setIsFavorite(favorites.some(f => f.game_id === gameId));
    }
  }, [favorites, gameId]);

  // Load HTML5 game: prioritize html_content, fallback to fetching game_url
  useEffect(() => {
    if (game?.game_type !== "html5") return;
    
    // Priority 1: html_content field
    if (game.html_content && game.html_content.length > 0) {
      setIframeSrcDoc(game.html_content);
      return;
    }
    
    // Priority 2: fetch from game_url
    if (!game.game_url) return;
    let cancelled = false;
    fetch(game.game_url)
      .then(r => r.text())
      .then(html => { if (!cancelled) setIframeSrcDoc(html); })
      .catch(err => console.error("[GameDetail] fetch srcdoc failed:", err));
    return () => { cancelled = true; };
  }, [game?.html_content, game?.game_url, game?.game_type]);

  const AGE_KEY = "playcraft_age_confirmed";

  const startGame = async () => {
    const scrollY = window.scrollY;
    const now = Date.now();
    setSessionStart(now);
    if (game?.game_code === "chess-online") {
      setChatSessionId(null);
    } else {
      setChatSessionId(`session_${now}`);
    }
    setIsPlaying(true);
    setTimeout(() => window.scrollTo({ top: scrollY, behavior: "instant" }), 50);
    if (game) {
      await base44.entities.Game.update(gameId, {
        plays_count: (game.plays_count || 0) + 1
      });
      queryClient.invalidateQueries(["game", gameId]);
    }
  };

  const handlePlay = async () => {
    if (!user) {
      toast.error("¡Inicia sesión para jugar!", {
        action: {
          label: "Iniciar Sesión",
          onClick: () => base44.auth.redirectToLogin(window.location.href),
        },
      });
      return;
    }
    if (user?.is_banned) {
      toast.error("Tu cuenta está baneada");
      return;
    }
    const bannedUntil = user?.play_banned_until ? new Date(user.play_banned_until) : null;
    if (bannedUntil && bannedUntil > new Date()) {
      toast.error(`No puedes jugar hasta ${format(bannedUntil, "dd/MM HH:mm")}`);
      return;
    }
    // Age gate for adult games
    if (game?.is_adult && localStorage.getItem(AGE_KEY) !== "yes") {
      setAgeGateOpen(true);
      return;
    }
    startGame();
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (isFavorite) {
      const fav = favorites.find(f => f.game_id === gameId);
      if (fav) {
        await base44.entities.Favorite.delete(fav.id);
      }
    } else {
      await base44.entities.Favorite.create({
        game_id: gameId,
        user_email: user.email
      });
    }
    refetchFavorites();
    setIsFavorite(!isFavorite);
  };

  const handleScoreUpdate = async (score) => {
    if (!user) return;
    
    await base44.entities.Score.create({
      game_id: gameId,
      user_email: user.email,
      user_name: user.full_name || user.email.split("@")[0],
      score
    });
    queryClient.invalidateQueries(["scores", gameId]);
    await evaluateAndUpdateAchievements({ userEmail: user.email, gameId });

    queryClient.invalidateQueries(["userAchievements", user.email]); // AchievementsSection (GameDetail)
    queryClient.invalidateQueries(["userAchievementsAll", user.email]); // Profile (por si vuelves luego)
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("¡Enlace copiado!");
  };

  // Listen for score/game-over messages from iframe games
  useEffect(() => {
    const handleGameMessage = (event) => {
      const { data } = event;
      if (!data || typeof data !== "object") return;
      if (
        (data.type === "SCORE_UPDATE" || data.type === "GAME_OVER") &&
        typeof data.score === "number"
      ) {
        handleScoreUpdate(data.score);
      }
    };
    window.addEventListener("message", handleGameMessage);
    return () => window.removeEventListener("message", handleGameMessage);
  }, [user, gameId]);

  // Chess relay: handle CREATE_ROOM, JOIN_ROOM, CHESS_MOVE from iframe
  useEffect(() => {
    if (!isPlaying || !user) return;
    const handleMsg = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "CREATE_ROOM") {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
          const session = await base44.entities.GameSession.create({
            room_code: code,
            game_id: gameId,
            white_email: user.email,
            white_name: user.full_name || user.email.split("@")[0],
            moves: [],
            status: "waiting",
          });
          chessSessionRef.current = session;
          chessRoleRef.current = "white";
          lastDeliveredIdxRef.current = -1;
          whiteNotifiedRef.current = false;
          iframeRef.current?.contentWindow?.postMessage({ type: "ROOM_CREATED", code }, "*");
        } catch (e) { console.error("CREATE_ROOM error:", e); }
      }

      if (msg.type === "JOIN_ROOM") {
        try {
          const all = await base44.entities.GameSession.filter({ room_code: msg.code });
          const session = all.find(s => s.status === "waiting");
          if (!session) {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "ROOM_ERROR", message: "Sala no encontrada o ya empezada" }, "*"
            );
            return;
          }
          await base44.entities.GameSession.update(session.id, {
            black_email: user.email,
            black_name: user.full_name || user.email.split("@")[0],
            status: "active",
          });
          chessSessionRef.current = {
            ...session,
            black_email: user.email,
            black_name: user.full_name || user.email.split("@")[0],
            status: "active",
          };
          chessRoleRef.current = "black";
          lastDeliveredIdxRef.current = -1;
          iframeRef.current?.contentWindow?.postMessage({
            type: "PLAYER_INFO",
            player: { name: user.full_name || user.email.split("@")[0], email: user.email },
            color: "black",
            opponentName: session.white_name || "Rival",
          }, "*");
        } catch (e) { console.error("JOIN_ROOM error:", e); }
      }

      if (msg.type === "CHESS_MOVE" && chessSessionRef.current) {
        try {
          const s = chessSessionRef.current;
          const moves = [
            ...(s.moves || []),
            { from: msg.from, to: msg.to, promo: msg.promo, player: chessRoleRef.current },
          ];
          await base44.entities.GameSession.update(s.id, { moves });
          chessSessionRef.current = { ...s, moves };
        } catch (e) { console.error("CHESS_MOVE save error:", e); }
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [isPlaying, user, gameId]);

  // Chess relay: poll GameSession and forward opponent moves to iframe
  useEffect(() => {
    if (!isPlaying || !user) return;
    const poll = async () => {
      const session = chessSessionRef.current;
      if (!session) return;
      try {
        const all = await base44.entities.GameSession.filter({ room_code: session.room_code });
        const latest = all[0];
        if (!latest) return;
        chessSessionRef.current = latest;
        const moves = latest.moves || [];
        const myColor = chessRoleRef.current;

        // Notify white once when black joins
        if (myColor === "white" && latest.status === "active" && !whiteNotifiedRef.current) {
          whiteNotifiedRef.current = true;
          iframeRef.current?.contentWindow?.postMessage({
            type: "PLAYER_INFO",
            player: { name: user.full_name || user.email.split("@")[0], email: user.email },
            color: "white",
            opponentName: latest.black_name || "Rival",
          }, "*");
        }

        // Deliver new moves from opponent
        for (let i = lastDeliveredIdxRef.current + 1; i < moves.length; i++) {
          if (moves[i].player !== myColor) {
            iframeRef.current?.contentWindow?.postMessage({
              type: "CHESS_OPPONENT_MOVE",
              from: moves[i].from,
              to: moves[i].to,
              promo: moves[i].promo,
            }, "*");
          }
          lastDeliveredIdxRef.current = i;
        }
      } catch (e) { /* silently ignore polling errors */ }
    };
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [isPlaying, user]);

  // Send player info to iframe once it loads
  const handleIframeLoad = () => {
    if (iframeRef.current && user) {
      iframeRef.current.contentWindow?.postMessage(
        {
          type: "PLAYER_INFO",
          player: {
            name: user.full_name || user.email.split("@")[0],
            email: user.email,
          },
        },
        "*"
      );
    }
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
        <Link to={createPageUrl("Home")}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            Volver al inicio
          </Button>
        </Link>
      </div>
    );
  }

  const rating = game.rating_count > 0 
    ? (game.rating_sum / game.rating_count).toFixed(1) 
    : "N/A";

  const renderGamePlayer = () => {
    if (game.game_code === "snake") {
      return <SnakeGame onScoreUpdate={handleScoreUpdate} />;
    }
    if (game.game_code === "pong") {
      return <PongGame onScoreUpdate={handleScoreUpdate} />;
    }
    if (game.game_code === "chess-online") {
      return (
        <ChessOnlineGame
          user={user}
          onScoreUpdate={handleScoreUpdate}
          onRoomCodeChange={(code) => setChatSessionId(code || null)}
          onMoveHistoryChange={(moves) => setChessMoveHistory(moves)}
        />
      );
    }
    if (game.game_type === "html5" && game.game_url) {
      if (!iframeSrcDoc) {
        return (
          <div className="aspect-video rounded-xl bg-white/5 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        );
      }
      return (
        <iframe
          ref={iframeRef}
          srcDoc={iframeSrcDoc}
          className="w-full aspect-video rounded-xl border border-white/10"
          sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock"
          allow="pointer-lock"
          title={game.title}
          onLoad={handleIframeLoad}
        />
      );
    }
    return (
      <div className="aspect-video rounded-xl bg-white/5 flex items-center justify-center">
        <p className="text-gray-500">Juego no disponible</p>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* Back Button */}
      <Link 
        to={createPageUrl("Home")} 
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al catálogo
      </Link>

      <AgeGateDialog
        open={ageGateOpen}
        onConfirm={() => {
          localStorage.setItem(AGE_KEY, "yes");
          setAgeGateOpen(false);
          startGame();
        }}
        onDeny={() => {
          setAgeGateOpen(false);
          toast.error("Debes ser mayor de 18 años para acceder a este juego.");
        }}
      />

      <div className="space-y-6">
        {/* Game Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex gap-2 mb-2 flex-wrap">
                <Badge className="bg-white/10 text-white border-white/20">
                  {categoryLabels[game.category] || game.category}
                </Badge>
                {game.is_adult && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    +18
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white break-words">
                {game.title}
              </h1>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleFavorite}
                className={`border-white/10 ${isFavorite ? "text-red-500 bg-red-500/10" : "text-gray-400"}`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                className="border-white/10 text-gray-400"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-white font-medium">{rating}</span>
              <span className="text-gray-500">({game.rating_count || 0} votos)</span>
            </div>
            {user && (user.role === "admin" || (user.role === "empresa" && game.created_by === user.email)) && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <Play className="w-4 h-4" />
                <span>{game.plays_count || 0} partidas</span>
              </div>
            )}
            <span className="text-gray-500">Por {game.publisher || "Anónimo"}</span>
          </div>
        </div>

        {/* Game Player + Chat */}
        {isPlaying ? (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
            {/* Canvas */}
            <div className="lg:col-span-2 bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/10 p-2 sm:p-4 w-full">
              {renderGamePlayer()}
            </div>
            {/* Chat al lado / debajo en móvil */}
            <div className="flex flex-col gap-4">
              <div className="bg-white/5 rounded-xl border border-white/10 p-3 sm:p-4 flex flex-col" style={{ minHeight: 260, maxHeight: 400 }}>
                <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2 flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-purple-400" />
                  Chat de partida
                </h2>
                <ChatSection
                  gameId={gameId}
                  user={user}
                  sessionId={chatSessionId}
                  key={chatSessionId || sessionStart}
                />
              </div>
              {game.game_code === "chess-online" && chessMoveHistory.length > 0 && (
                <OnlineGameMoveHistory
                  moves={chessMoveHistory}
                  title="Historial de jugadas"
                  emptyMessage="Aún no hay movimientos"
                  maxHeight="250px"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/10 p-6">
            <div className="relative aspect-video rounded-xl overflow-hidden">
              {game.thumbnail ? (
                <img
                  src={game.thumbnail}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-cyan-900/50 flex items-center justify-center">
                  <Gamepad className="w-20 h-20 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Button
                  onClick={handlePlay}
                  className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-lg px-8 py-6 rounded-xl neon-glow"
                >
                  <Play className="w-6 h-6 mr-2 fill-white" />
                  Jugar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Descripción</h2>
          <p className="text-gray-300 leading-relaxed">
            {game.full_description || game.description || "Sin descripción disponible."}
          </p>
        </div>

        {/* Top 5 */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top 5
          </h2>
          <Leaderboard scores={scores} />
        </div>

        {/* Achievements */}
        <AchievementsSection gameId={gameId} user={user} />

        {/* Comments */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comentarios ({comments.length})
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