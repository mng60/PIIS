import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getGameById } from '@/api/games';
import { getGameScores } from '@/api/scores';
import { getGameComments } from '@/api/comments';
import { getFavorites, addFavorite, removeFavorite } from '@/api/favorites';

export function useGameDetail(gameId, user) {
  const queryClient = useQueryClient();

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGameById(gameId),
    enabled: !!gameId,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['scores', gameId],
    queryFn: () => getGameScores(gameId),
    enabled: !!gameId,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', gameId],
    queryFn: () => getGameComments(gameId),
    enabled: !!gameId,
  });

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites', user?.email],
    queryFn: getFavorites,
    enabled: !!user,
  });

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (favorites && gameId) setIsFavorite(favorites.some(f => f.game_id === gameId));
  }, [favorites, gameId]);

  const toggleFavorite = async () => {
    if (!user) { toast.error('Inicia sesión para guardar favoritos'); return; }
    if (isFavorite) { await removeFavorite(gameId); }
    else { await addFavorite(gameId); }
    refetchFavorites();
    setIsFavorite(prev => !prev);
  };

  const invalidateGame = () => queryClient.invalidateQueries(['game', gameId]);

  return {
    game,
    gameLoading,
    scores,
    comments,
    refetchComments,
    isFavorite,
    toggleFavorite,
    invalidateGame,
  };
}
