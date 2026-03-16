import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Loader2, Heart, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameCard from "@/components/games/GameCard";

export default function Favorites() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsLoading(false);
    } catch (e) {
      window.location.replace('/Home');
    }
  };

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ user_email: user.email }),
    enabled: !!user
  });

  const { data: allGames = [] } = useQuery({
    queryKey: ["games"],
    queryFn: () => base44.entities.Game.filter({ is_active: true }),
    enabled: !!user
  });

  const favoriteGames = allGames.filter(game => 
    favorites.some(f => f.game_id === game.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión</h2>
        <p className="text-gray-400 mb-6">
          Necesitas iniciar sesión para ver tus juegos favoritos
        </p>
        <Button
          onClick={() => base44.auth.redirectToLogin()}
          className="bg-gradient-to-r from-purple-600 to-cyan-500"
        >
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          Mis Favoritos
        </h1>
        <p className="text-gray-400">
          {favoriteGames.length} juegos guardados
        </p>
      </div>

      {favoriteGames.length === 0 ? (
        <div className="text-center py-16">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">
            No tienes favoritos
          </h3>
          <p className="text-gray-500">
            Explora el catálogo y añade juegos a tu lista
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoriteGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}