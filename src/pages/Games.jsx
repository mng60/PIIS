import React, { useState, useMemo } from "react";
import { getGames } from "@/api/games";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Gamepad2, Search } from "lucide-react";
import GameCard from "@/components/games/GameCard";
import RecommendationSection from "@/components/games/RecommendationSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLevelFromXP } from "@/lib/levels";

const categories = [
  { value: "all", label: "Todas" },
  { value: "accion", label: "Accion" },
  { value: "puzzle", label: "Puzzle" },
  { value: "arcade", label: "Arcade" },
  { value: "estrategia", label: "Estrategia" },
];

export default function Games() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const userLevel = isRegularUser ? getLevelFromXP(user.xp ?? 0).level : null;
  const isLevel1User = userLevel === 1;
  const isLevel2User = userLevel === 2;
  const isLevel3User = userLevel === 3;

  const { data: { games = [] } = {}, isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames("?limit=200"),
  });

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch =
        game.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || game.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [games, searchQuery, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${isLevel1User ? "user-level-1-games-page" : ""} ${isLevel2User ? "user-level-2-games-page" : ""} ${isLevel3User ? "user-level-3-games-page" : ""}`}>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold text-white mb-2 flex items-center gap-3 ${isLevel1User ? "user-level-1-games-title" : ""} ${isLevel2User ? "user-level-2-section-heading" : ""} ${isLevel3User ? "user-level-3-section-heading" : ""}`}>
          <Gamepad2 className={`w-8 h-8 ${isLevel1User ? "user-level-1-games-icon" : "text-purple-400"} ${isLevel2User ? "user-level-2-section-icon" : ""} ${isLevel3User ? "user-level-3-section-icon" : ""}`} />
          Catalogo de Juegos
        </h1>
        <p className={`text-gray-400 ${isLevel1User ? "user-level-1-games-copy" : ""} ${isLevel2User ? "user-level-2-games-copy" : ""} ${isLevel3User ? "user-level-3-copy" : ""}`}>
          Explora nuestra coleccion de {games.length} juegos
        </p>
      </div>

      {user && <RecommendationSection userEmail={user.email} />}

      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isLevel1User ? "user-level-1-games-search-icon" : "text-gray-400"} ${isLevel2User ? "user-level-2-games-search-icon" : ""} ${isLevel3User ? "user-level-3-games-search-icon" : ""}`} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar juegos..."
            className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${isLevel1User ? "user-level-1-games-search" : ""} ${isLevel2User ? "user-level-2-games-search" : ""} ${isLevel3User ? "user-level-3-games-search" : ""}`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.value)}
              className={
                selectedCategory === category.value
                  ? isLevel1User
                    ? "user-level-1-games-filter-active"
                    : isLevel2User
                      ? "user-level-2-games-filter-active"
                      : isLevel3User
                        ? "user-level-3-games-filter-active"
                        : "bg-gradient-to-r from-purple-600 to-cyan-500 border-0"
                  : isLevel1User
                    ? "user-level-1-games-filter"
                    : isLevel2User
                      ? "user-level-2-games-filter"
                      : isLevel3User
                        ? "user-level-3-games-filter"
                        : "border-white/20 text-gray-300 hover:text-white hover:bg-white/5"
              }
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="text-center py-16">
          <Gamepad2 className={`w-16 h-16 mx-auto mb-4 ${isLevel1User ? "user-level-1-games-empty-icon" : "text-gray-600"} ${isLevel2User ? "user-level-2-games-empty-tone" : ""}`} />
          <h3 className={`text-xl font-medium text-gray-400 mb-2 ${isLevel1User ? "user-level-1-games-empty-title" : ""} ${isLevel2User ? "user-level-2-games-empty-tone" : ""}`}>
            No se encontraron juegos
          </h3>
          <p className={`text-gray-500 ${isLevel1User ? "user-level-1-games-empty-copy" : ""} ${isLevel2User ? "user-level-2-games-empty-tone" : ""}`}>
            Intenta con otros filtros o terminos de busqueda
          </p>
        </div>
      ) : (
        <>
          <div className={`mb-4 text-sm text-gray-400 ${isLevel1User ? "user-level-1-games-results" : ""} ${isLevel2User ? "user-level-2-games-results" : ""}`}>
            Mostrando {filteredGames.length} {filteredGames.length === 1 ? "juego" : "juegos"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
