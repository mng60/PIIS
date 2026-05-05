import { useRef, useState, useEffect } from 'react';
import { Loader2, Gamepad, Play, MessageCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SnakeGame from '@/components/games/SnakeGame';
import PongGame from '@/components/games/PongGame';
import ChessOnlineGame from '@/components/games/ChessOnlineGame';
import DiceRaceOnlineGame from '@/components/games/DiceRaceOnlineGame';
import ChatSection from '@/components/games/ChatSection';
import OnlineGameMoveHistory from '@/components/games/OnlineGameMoveHistory';
import { useChessGame } from '@/hooks/useChessGame';
import ParchisOnlineGame from '@/components/games/ParchisOnlineGame';
import { useLevelTheme } from '@/lib/useLevelTheme';

const DIFFICULTY_LABELS = { 1: "Principiante", 2: "Intermedio", 3: "Avanzado", 4: "Maestro" };

function buildVsAiIntroMessage(diff) {
  return { type: "info", text: `Juegas con blancas contra el entrenador (${DIFFICULTY_LABELS[diff]}).` };
}

export default function GameArea({
  game,
  user,
  gameId,
  isPlaying,
  onPlay,
  onScoreUpdate,
  onGameStart,
  chatSessionId,
  sessionStart,
  chessMoveHistory,
  onChessMoveHistoryChange,
  onChatSessionIdChange,
  serverBestScore,
  myEloRating,
  onEloApplied,
  initialRoomCode,
  onLeave,
}) {
  const iframeRef = useRef(null);
  const [iframeSrcDoc, setIframeSrcDoc] = useState(null);
  const [vsAiMessages, setVsAiMessages] = useState([]);
  const [isVsAi, setIsVsAi] = useState(false);
  const [vsAiDifficulty, setVsAiDifficulty] = useState(null);
  const [vsAiAnalysisLoading, setVsAiAnalysisLoading] = useState(false);
  const vsAiChatContainerRef = useRef(null);
  const [iframeMoveHistory, setIframeMoveHistory] = useState([]);
  const { isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User } = useLevelTheme({ user });
  const gameSurfaceClass = isLevel1User
    ? 'user-level-1-game-surface'
    : isLevel2User
      ? 'user-level-2-game-surface'
      : isLevel3User
        ? 'user-level-3-game-surface'
        : isLevel4User
          ? 'user-level-4-game-surface'
          : isLevel5User
            ? 'user-level-5-game-surface'
            : '';
  const detailPanelClass = isLevel1User
    ? 'user-level-1-detail-panel'
    : isLevel2User
      ? 'user-level-2-detail-panel'
      : isLevel3User
        ? 'user-level-3-detail-panel'
        : isLevel4User
          ? 'user-level-4-detail-panel'
          : isLevel5User
            ? 'user-level-5-detail-panel'
            : '';
  const detailPanelTitleClass = isLevel1User
    ? 'user-level-1-detail-panel-title'
    : isLevel2User
      ? 'user-level-2-detail-panel-title'
      : isLevel3User
        ? 'user-level-3-detail-panel-title'
        : isLevel4User
          ? 'user-level-4-detail-panel-title'
          : isLevel5User
            ? 'user-level-5-detail-panel-title'
            : '';
  const detailIconClass = isLevel1User
    ? 'user-level-1-detail-icon-blue'
    : isLevel2User
      ? 'user-level-2-detail-icon-blue'
      : isLevel3User
        ? 'user-level-3-detail-icon-blue'
        : isLevel4User
          ? 'user-level-4-detail-icon-blue'
          : isLevel5User
            ? 'user-level-5-detail-icon-blue'
            : '';
  const historyClass = isLevel1User
    ? 'user-level-1-history'
    : isLevel2User
      ? 'user-level-2-history'
      : isLevel3User
        ? 'user-level-3-history'
        : isLevel4User
          ? 'user-level-4-history'
          : isLevel5User
            ? 'user-level-5-history'
            : '';

  useEffect(() => {
    if (vsAiChatContainerRef.current) {
      vsAiChatContainerRef.current.scrollTop = vsAiChatContainerRef.current.scrollHeight;
    }
  }, [vsAiMessages]);

  const handleVsAiChange = (active, diff) => {
    setIsVsAi(active);
    setVsAiDifficulty(diff);
    setVsAiAnalysisLoading(false);
    if (active) {
      setVsAiMessages([buildVsAiIntroMessage(diff)]);
    } else {
      setVsAiMessages([]);
    }
  };

  const handleVsAiRestore = ({ difficulty: diff, messages }) => {
    setIsVsAi(true);
    setVsAiDifficulty(diff);
    setVsAiAnalysisLoading(false);
    setVsAiMessages(messages?.length ? messages : [buildVsAiIntroMessage(diff)]);
  };

  useChessGame({ isPlaying, user, gameId, iframeRef, onRoomCodeChange: onChatSessionIdChange });

  // Reset iframe move history when a new session starts
  useEffect(() => { setIframeMoveHistory([]); }, [chatSessionId]);

  // For HTML5 games with inline content, use srcDoc; otherwise use src directly
  useEffect(() => {
    if (game?.game_type !== 'html5') return;
    if (game.html_content) { setIframeSrcDoc(game.html_content); return; }
    setIframeSrcDoc(null);
  }, [game?.html_content, game?.game_type]);

  // Forward score/game-over/move messages from the iframe to the parent handler
  useEffect(() => {
    const handler = (event) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;
      if ((data.type === 'SCORE_UPDATE' || data.type === 'GAME_OVER') && typeof data.score === 'number') {
        onScoreUpdate(data.score);
      }
      // MOVE_UPDATE: { type: 'MOVE_UPDATE', move: { player, move, timestamp } }
      if (data.type === 'MOVE_UPDATE' && data.move) {
        setIframeMoveHistory(prev => [...prev, data.move]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onScoreUpdate]);

  const handleIframeLoad = () => {
    if (iframeRef.current && user) {
      iframeRef.current.contentWindow?.postMessage({
        type: 'PLAYER_INFO',
        player: { name: user.full_name || user.email.split('@')[0], email: user.email },
      }, '*');
    }
  };

  const isBuiltinSingle = game.game_type === 'builtin' && !game.is_multiplayer;

  const renderGame = () => {
    if (game.game_code === 'snake') {
      return <SnakeGame onScoreUpdate={onScoreUpdate} onGameStart={onGameStart} user={user} serverBestScore={serverBestScore} />;
    }
    if (game.game_code === 'pong') {
      return <PongGame onScoreUpdate={onScoreUpdate} onGameStart={onGameStart} user={user} />;
    }
    if (game.game_code === 'chess-online') {
      if (!isPlaying) return <GameCover game={game} onPlay={onPlay} isLevel1User={isLevel1User} isLevel2User={isLevel2User} isLevel3User={isLevel3User} isLevel4User={isLevel4User} isLevel5User={isLevel5User} />;
      return (
        <ChessOnlineGame
          user={user}
          gameId={gameId}
          myEloRating={myEloRating}
          onEloApplied={onEloApplied}
          onScoreUpdate={onScoreUpdate}
          onRoomCodeChange={code => onChatSessionIdChange(code || null)}
          onMoveHistoryChange={onChessMoveHistoryChange}
          initialRoomCode={initialRoomCode}
          onLeave={onLeave}
          onVsAiChange={handleVsAiChange}
          onVsAiRestore={handleVsAiRestore}
          onVsAiMessage={(type, text) => setVsAiMessages(prev => [...prev, { type, text }])}
          onVsAiAnalysisLoading={setVsAiAnalysisLoading}
        />
      );
    }
    if (game.game_code === 'parchis-online') {
      if (!isPlaying) return <GameCover game={game} onPlay={onPlay} isLevel1User={isLevel1User} isLevel2User={isLevel2User} isLevel3User={isLevel3User} isLevel4User={isLevel4User} isLevel5User={isLevel5User} />;
      return (
        <ParchisOnlineGame
          user={user}
          gameId={gameId}
          isPlaying={isPlaying}
          onRoomCodeChange={code => onChatSessionIdChange(code || null)}
          onMoveHistoryChange={onChessMoveHistoryChange}
          onScoreUpdate={onScoreUpdate}
          initialRoomCode={initialRoomCode}
          onLeave={onLeave}
        />
      );
    }
    if (game.game_code === 'dados-online') {
      if (!isPlaying) return <GameCover game={game} onPlay={onPlay} isLevel1User={isLevel1User} isLevel2User={isLevel2User} isLevel3User={isLevel3User} isLevel4User={isLevel4User} isLevel5User={isLevel5User} />;
      return (
        <DiceRaceOnlineGame
          user={user}
          game={game}
          gameId={gameId}
          onScoreUpdate={onScoreUpdate}
          onRoomCodeChange={code => onChatSessionIdChange(code || null)}
          onMoveHistoryChange={onChessMoveHistoryChange}
          initialRoomCode={initialRoomCode}
          onLeave={onLeave}
        />
      );
    }
    if (game.game_type === 'html5') {
      if (!isPlaying) return <GameCover game={game} onPlay={onPlay} isLevel1User={isLevel1User} isLevel2User={isLevel2User} isLevel3User={isLevel3User} isLevel4User={isLevel4User} isLevel5User={isLevel5User} />;
      if (!iframeSrcDoc && !game.game_url) return (
        <div className="aspect-video flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      );
      return (
        <iframe
          ref={iframeRef}
          {...(iframeSrcDoc ? { srcDoc: iframeSrcDoc } : { src: game.game_url })}
          className="w-full aspect-video"
          sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-same-origin allow-popups"
          allow="pointer-lock *"
          title={game.title}
          onLoad={handleIframeLoad}
        />
      );
    }
    return (
      <div className="aspect-video flex items-center justify-center">
        <p className="text-gray-500">Juego no disponible</p>
      </div>
    );
  };

  return (
    <div className={`grid gap-4 ${game.is_multiplayer && isPlaying ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
      {isBuiltinSingle ? (
        <div className="flex justify-center py-2">
          <div className="w-full max-w-[520px]">{renderGame()}</div>
        </div>
      ) : (
        <div className={`bg-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden ${gameSurfaceClass}`}>
          {renderGame()}
        </div>
      )}

      {game.is_multiplayer && isPlaying && (
        <div className="flex flex-col gap-2 h-full">
          {/* Chat: 65% */}
          <div className={`bg-white/5 rounded-xl border border-white/10 p-3 flex flex-col min-h-0 ${detailPanelClass}`} style={{ flex: '13 0 0' }}>
            <h2 className={`text-sm font-semibold text-white mb-2 flex items-center gap-2 flex-shrink-0 ${detailPanelTitleClass}`}>
              {isVsAi ? <Bot className={`w-4 h-4 text-purple-400 ${detailIconClass}`} /> : <MessageCircle className={`w-4 h-4 text-purple-400 ${detailIconClass}`} />}
              Chat de partida
              {isVsAi && vsAiAnalysisLoading && <Loader2 className={`w-3 h-3 animate-spin text-purple-400 ml-auto ${detailIconClass}`} />}
            </h2>
            {isVsAi ? (
              <div ref={vsAiChatContainerRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {vsAiMessages.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-lg ${
                    msg.type === "error"    ? "bg-red-500/10 border border-red-500/20"
                    : msg.type === "success"  ? "bg-green-500/10 border border-green-500/20"
                    : msg.type === "analysis" ? "bg-cyan-500/10 border border-cyan-500/20"
                    : msg.type === "coach"    ? "bg-purple-500/10 border border-purple-500/20"
                    : "bg-white/5 border border-white/10"
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="w-3 h-3 text-purple-400 flex-shrink-0" />
                      <span className="font-semibold text-white text-sm">
                        Entrenador ({DIFFICULTY_LABELS[vsAiDifficulty]})
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm break-words leading-snug">{msg.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <ChatSection
                gameId={gameId}
                user={user}
                sessionId={chatSessionId}
                key={chatSessionId || sessionStart}
              />
            )}
          </div>
          {/* History: 35% */}
          <div className="min-h-0" style={{ flex: '7 0 0' }}>
            <OnlineGameMoveHistory
              moves={game.game_type === 'html5' ? iframeMoveHistory : chessMoveHistory}
              title="Historial de jugadas"
              className={historyClass}
              emptyMessage="Aún no hay movimientos"
              chessPairs={game.game_code === 'chess-online'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GameCover({ game, onPlay, isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User }) {
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
          className={`${isLevel2User ? 'user-level-2-game-launch' : `bg-gradient-to-r ${isLevel1User ? 'from-amber-800 to-orange-900' : isLevel3User ? 'user-level-3-game-launch' : isLevel4User ? 'user-level-4-game-launch' : isLevel5User ? 'user-level-5-game-launch' : 'from-purple-600 to-cyan-500'}`} hover:opacity-90 text-lg px-8 py-6 rounded-xl`}
        >
          <Play className="w-6 h-6 mr-2 fill-white" /> Jugar
        </Button>
      </div>
    </div>
  );
}
