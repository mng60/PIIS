import React, { useMemo } from "react";
import { getGames, getMyGames } from "@/api/games";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import NewGamesSlider from "@/components/home/NewGamesSlider";
import GamingNews from "@/components/home/GamingNews";
import TournamentsSection from "@/components/home/TournamentsSection";
import GameCard from "@/components/games/GameCard";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";
import "@/styles/StylesLevels/level1.css";

export default function Home() {
  const { user } = useAuth();
  const { data: { games = [] } = {}, isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames("?limit=100"),
  });
  const { data: companyGamesData = {} } = useQuery({
    queryKey: ["companyHomeGames", user?.email],
    queryFn: getMyGames,
    enabled: user?.role === "empresa",
  });

  const featuredGames = useMemo(() => games.filter((g) => g.is_featured), [games]);
  const newGames = useMemo(() => games.slice(0, 8), [games]);
  const companyGames = companyGamesData.games || [];
  const isCompanyUser = user?.role === "empresa";
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const userLevel = isRegularUser ? getLevelFromXP(user.xp ?? 0).level : null;
  const isLevel1User = userLevel === 1;
  const isLevel2User = userLevel === 2;
  const isLevel3User = userLevel === 3;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-8 sm:gap-10 md:gap-12 ${isLevel1User ? "user-level-1-home" : ""} ${isLevel2User ? "user-level-2-home" : ""} ${isLevel3User ? "user-level-3-home" : ""}`}>
      <div className="text-center mb-6 sm:mb-8 order-1">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 px-2">
          <span className={isLevel1User ? "user-level-1-home-title" : isLevel2User ? "user-level-2-home-title" : isLevel3User ? "user-level-3-home-title" : "bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-pulse-neon"}>
            Bienvenido a PlayCraft
          </span>
        </h1>
        <p className={`text-gray-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto px-4 ${isLevel1User ? "user-level-1-home-subtitle" : ""} ${isLevel2User ? "user-level-2-home-subtitle" : ""} ${isLevel3User ? "user-level-3-home-subtitle" : ""}`}>
          Tu plataforma de juegos web favorita. Explora, juega y compite con jugadores de todo el mundo.
        </p>
      </div>

      {featuredGames.length > 0 && (
        <section className="order-2">
          <h2 className={`text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3 ${isLevel1User ? "user-level-1-featured-heading" : ""} ${isLevel2User ? "user-level-2-section-heading" : ""} ${isLevel3User ? "user-level-3-section-heading" : ""}`}>
            <span className={`${isLevel1User ? "user-level-1-featured-icon" : ""} ${isLevel2User ? "user-level-2-section-icon" : ""} ${isLevel3User ? "user-level-3-section-icon" : ""}`}>★</span>
            <span>Juegos Destacados</span>
          </h2>
          <FeaturedCarousel games={featuredGames} />
        </section>
      )}

      {newGames.length > 0 && (
        <section className="order-3">
          <NewGamesSlider games={newGames} />
        </section>
      )}

      {isCompanyUser && (
        <section className="order-4">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <span>🎮</span>
            <span>Mis Juegos</span>
          </h2>
          {companyGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {companyGames.slice(0, 4).map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <Gamepad2 className="w-10 h-10 mx-auto text-gray-500 mb-3" />
                <p className="text-white font-semibold">Aún no tienes juegos subidos</p>
                <p className="text-sm text-gray-400 mt-1">Cuando publiques juegos, aparecerán aquí debajo de Novedades.</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      <section className="order-5">
        <TournamentsSection />
      </section>

      <section className="order-6">
        <GamingNews />
      </section>

      <section className={`order-7 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-white/10 rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 text-center ${isLevel1User ? "user-level-1-highlight-section" : ""} ${isLevel2User ? "user-level-2-highlight-section" : ""} ${isLevel3User ? "user-level-3-widget" : ""}`}>
        <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 ${isLevel1User ? "user-level-1-highlight-title" : ""} ${isLevel2User ? "user-level-2-section-heading" : ""} ${isLevel3User ? "user-level-3-section-heading" : ""}`}>
          ¿Listo para jugar?
        </h2>
        <p className={`text-gray-300 text-base sm:text-lg mb-5 sm:mb-6 max-w-2xl mx-auto px-2 ${isLevel1User ? "user-level-1-highlight-copy" : ""} ${isLevel2User ? "user-level-2-highlight-copy" : ""} ${isLevel3User ? "user-level-3-copy" : ""}`}>
          Explora nuestro catálogo completo con {games.length} juegos disponibles
        </p>
        <Link to="/games">
          <Button className={`${isLevel1User ? "user-level-1-hero-button" : isLevel2User ? "user-level-2-hero-button" : isLevel3User ? "user-level-3-button" : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"} text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6`}>
            Ver Catálogo Completo
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
