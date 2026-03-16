import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import NewGamesSlider from "@/components/home/NewGamesSlider";
import GamingNews from "@/components/home/GamingNews";
import TournamentsSection from "@/components/home/TournamentsSection";

export default function Home() {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => base44.entities.Game.filter({ is_active: true }, "-created_date"),
  });

  // Featured games (admin seleccionados con is_featured)
  const featuredGames = useMemo(() => {
    return games.filter(g => g.is_featured);
  }, [games]);

  // Nuevos juegos (últimos 8 añadidos)
  const newGames = useMemo(() => {
    return games.slice(0, 8);
  }, [games]);

  // Total de partidas jugadas
  const totalPlays = useMemo(() => {
    return games.reduce((sum, game) => sum + (game.plays_count || 0), 0);
  }, [games]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 md:space-y-12">
      {/* Hero Section */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 px-2">
          <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-pulse-neon">
            Bienvenido a PlayCraft
          </span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto px-4">
          Tu plataforma de juegos web favorita. Explora, juega y compite con jugadores de todo el mundo.
        </p>
      </div>

      {/* Featured Carousel */}
      {featuredGames.length > 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
            ⭐ Juegos Destacados
          </h2>
          <FeaturedCarousel games={featuredGames} />
        </section>
      )}

      {/* New Games Slider */}
      {newGames.length > 0 && (
        <section>
          <NewGamesSlider games={newGames} />
        </section>
      )}

      {/* Tournaments */}
      <section>
        <TournamentsSection />
      </section>

      {/* Gaming News */}
      <section>
        <GamingNews />
      </section>

      {/* CTA to Games catalog */}
      <section className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-white/10 rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
          ¿Listo para jugar?
        </h2>
        <p className="text-gray-300 text-base sm:text-lg mb-5 sm:mb-6 max-w-2xl mx-auto px-2">
          Explora nuestro catálogo completo con {games.length} juegos disponibles
        </p>
        <Link to={createPageUrl("Games")}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6">
            Ver Catálogo Completo
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </Link>
      </section>
    </div>
  );
}