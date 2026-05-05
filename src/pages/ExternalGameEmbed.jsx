import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import GameArea from '@/components/game-detail/GameArea';

export default function ExternalGameEmbed() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') || '';
  const title = searchParams.get('title') || 'Juego Externo';
  const externalId = searchParams.get('id') || 'external-embed';

  const game = {
    title,
    game_code: externalId,
    game_type: 'html5',
    game_url: url,
    is_multiplayer: true,
    thumbnail: null,
    show_leaderboard: false,
    show_achievements: false,
  };

  const [isPlaying, setIsPlaying] = useState(Boolean(searchParams.get('autoplay')));
  const [sessionStart, setSessionStart] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);

  const doStart = () => {
    const now = Date.now();
    setSessionStart(now);
    setChatSessionId(`session_${now}`);
    setIsPlaying(true);
  };

  const onPlay = () => {
    if (!user) { alert('Inicia sesión para jugar'); return; }
    doStart();
  };

  const onScoreUpdate = (score) => {
    // Placeholder: integrate with scores API if desired
    console.log('ExternalGame score update:', score);
  };

  const onGameStart = async () => {
    if (!user) { alert('Inicia sesión para jugar'); return false; }
    doStart();
    return true;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <GameArea
        game={game}
        user={user}
        gameId={externalId}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onScoreUpdate={onScoreUpdate}
        onGameStart={onGameStart}
        chatSessionId={chatSessionId}
        sessionStart={sessionStart}
        onChatSessionIdChange={setChatSessionId}
      />
    </div>
  );
}
