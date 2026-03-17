import React, { useState, useMemo } from "react";
import { getGames } from "@/api/games";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Gamepad2, Search, ShieldAlert } from "lucide-react";
import GameCard from "@/components/games/GameCard";
import RecommendationSection from "@/components/games/RecommendationSection";
import AgeGateDialog from "@/components/AgeGateDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AGE_KEY = "playcraft_age_confirmed";

const categories = [
  { value: "all", label: "Todas" },
  { value: "accion", label: "Acción" },
  { value: "puzzle", label: "Puzzle" },
  { value: "arcade", label: "Arcade" },
  { value: "estrategia", label: "Estrategia" },
];

export default function Games() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAdult, setShowAdult] = useState(() => localStorage.getItem(AGE_KEY) === "yes");
  const [ageGateOpen, setAgeGateOpen] = useState(false);

  const { data: { games = [] } = {}, isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames("?limit=200"),
  });

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (game.is_adult && !showAdult) return false;
      const matchesSearch =
        game.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || game.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [games, searchQuery, selectedCategory, showAdult]);

  const adultCount = useMemo(
    () => games.filter((g) => g.is_adult).length,
    [games]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <AgeGateDialog
        open={ageGateOpen}
        onConfirm={() => {
          localStorage.setItem(AGE_KEY, "yes");
          setShowAdult(true);
          setAgeGateOpen(false);
        }}
        onDeny={() => setAgeGateOpen(false)}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-purple-400" />
          Catálogo de Juegos
        </h1>
        <p className="text-gray-400">
          Explora nuestra colección de {games.length} juegos
        </p>
      </div>

      {user && <RecommendationSection userEmail={user.email} />}

      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar juegos..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
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
                  ? "bg-gradient-to-r from-purple-600 to-cyan-500 border-0"
                  : "border-white/20 text-gray-300 hover:text-white hover:bg-white/5"
              }
            >
              {category.label}
            </Button>
          ))}
        </div>

        {adultCount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-900/20 border border-red-500/20">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-300">
              {showAdult
                ? `Mostrando contenido +18 (${adultCount} juegos)`
                : `${adultCount} juegos con contenido para mayores de 18 están ocultos`}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-red-300 hover:text-white hover:bg-red-500/20 border border-red-500/30 text-xs"
              onClick={() => {
                if (showAdult) {
                  localStorage.removeItem(AGE_KEY);
                  setShowAdult(false);
                } else {
                  setAgeGateOpen(true);
                }
              }}
            >
              {showAdult ? "Ocultar +18" : "Ver contenido +18"}
            </Button>
          </div>
        )}
      </div>

      {filteredGames.length === 0 ? (
        <div className="text-center py-16">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">
            No se encontraron juegos
          </h3>
          <p className="text-gray-500">
            Intenta con otros filtros o términos de búsqueda
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-400">
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
