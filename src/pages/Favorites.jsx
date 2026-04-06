import React from "react";
import { getGames } from "@/api/games";
import { getFavorites } from "@/api/favorites";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Heart, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameCard from "@/components/games/GameCard";
import { Link } from "react-router-dom";
import { getLevelFromXP } from "@/lib/levels";

export default function Favorites() {
  const { user, isLoadingAuth } = useAuth();
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const isLevel1User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 1;

  const { data: favorites = [], isLoading: favsLoading } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: getFavorites,
    enabled: !!user,
  });

  const { data: { games: allGames = [] } = {}, isLoading: gamesLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames("?limit=200"),
    enabled: !!user,
  });

  const favoriteGames = allGames.filter((game) =>
    favorites.some((f) => f.game_id === game.id)
  );

  if (isLoadingAuth || favsLoading || gamesLoading) {
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
        <h2 className="text-2xl font-bold text-white mb-2">Inicia sesion</h2>
        <p className="text-gray-400 mb-6">
          Necesitas iniciar sesion para ver tus juegos favoritos
        </p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            Ir al inicio
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${isLevel1User ? "user-level-1-favorites-page" : ""}`}>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold text-white mb-2 flex items-center gap-3 ${isLevel1User ? "user-level-1-favorites-title" : ""}`}>
          <Heart className={`w-8 h-8 ${isLevel1User ? "user-level-1-favorites-icon" : "text-red-500 fill-red-500"}`} />
          Mis Favoritos
        </h1>
        <p className={`text-gray-400 ${isLevel1User ? "user-level-1-favorites-count" : ""}`}>
          {favoriteGames.length} juegos guardados
        </p>
      </div>

      {favoriteGames.length === 0 ? (
        <div className="text-center py-16">
          <Gamepad2 className={`w-16 h-16 mx-auto mb-4 ${isLevel1User ? "user-level-1-favorites-empty-tone" : "text-gray-600"}`} />
          <h3 className={`text-xl font-medium text-gray-400 mb-2 ${isLevel1User ? "user-level-1-favorites-empty-tone" : ""}`}>
            No tienes favoritos
          </h3>
          <p className={`text-gray-500 ${isLevel1User ? "user-level-1-favorites-empty-tone" : ""}`}>
            Explora el catalogo y anade juegos a tu lista
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
