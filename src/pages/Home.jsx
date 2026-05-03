import React, { useMemo } from "react";
import { getGames } from "@/api/games";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import NewGamesSlider from "@/components/home/NewGamesSlider";
import GamingNews from "@/components/home/GamingNews";
import TournamentsSection from "@/components/home/TournamentsSection";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";
import "@/styles/StylesLevels/level1.css";

export default function Home( { useLevelTheme = true }) {
  const { user } = useAuth();
  const { data: { games = [] } = {}, isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames("?limit=100"),
  });

  const featuredGames = useMemo(() => games.filter((g) => g.is_featured), [games]);
  const newGames = useMemo(() => games.slice(0, 8), [games]);
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const userLevel = isRegularUser ? getLevelFromXP(user.xp ?? 0).level : null;
   const isLevel1User = useLevelTheme && userLevel === 1;
  const isLevel2User = useLevelTheme && userLevel === 2;
  const isLevel3User = useLevelTheme && userLevel === 3;
  const isLevel4User = useLevelTheme && userLevel === 4;
  const isLevel5User = useLevelTheme && userLevel === 5;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 md:space-y-12 ${isLevel1User ? "user-level-1-home" : ""} ${isLevel2User ? "user-level-2-home" : ""} ${isLevel3User ? "user-level-3-home" : ""} ${isLevel4User ? "user-level-4-home" : ""} ${isLevel5User ? "user-level-5-home" : ""}`}>
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 px-2">
          <span className={isLevel1User ? "user-level-1-home-title" : isLevel2User ? "user-level-2-home-title" : isLevel3User ? "user-level-3-home-title" : isLevel4User ? "user-level-4-home-title" : isLevel5User ? "user-level-5-home-title" : "bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-pulse-neon"}>
            Bienvenido a PlayCraft
          </span>
        </h1>
        <p className={`text-gray-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto px-4 ${isLevel1User ? "user-level-1-home-subtitle" : ""} ${isLevel2User ? "user-level-2-home-subtitle" : ""} ${isLevel3User ? "user-level-3-home-subtitle" : ""} ${isLevel4User ? "user-level-4-home-subtitle" : ""} ${isLevel5User ? "user-level-5-home-subtitle" : ""}`}>
          Tu plataforma de juegos web favorita. Explora, juega y compite con jugadores de todo el mundo.
        </p>
      </div>

      {featuredGames.length > 0 && (
        <section>
          <h2 className={`text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3 ${isLevel1User ? "user-level-1-featured-heading" : ""} ${isLevel2User ? "user-level-2-section-heading" : ""}  ${isLevel4User ? "user-level-4-section-heading" : ""} ${isLevel5User ? "user-level-5-section-heading" : ""}`}>
            <span className={`${isLevel1User ? "user-level-1-featured-icon" : ""} ${isLevel2User ? "user-level-2-section-icon" : ""} ${isLevel3User ? "user-level-3-section-icon" : ""} ${isLevel4User ? "user-level-4-section-icon" : ""} ${isLevel5User ? "user-level-5-section-icon" : ""}`}>★</span>
            <span>Juegos Destacados</span>
          </h2>
          <FeaturedCarousel games={featuredGames} />
        </section>
      )}

      {newGames.length > 0 && (
        <section>
          <NewGamesSlider games={newGames} />
        </section>
      )}

      <section>
        <TournamentsSection />
      </section>

      <section>
        <GamingNews />
      </section>

      <section className={`bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-white/10 rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 text-center ${isLevel1User ? "user-level-1-highlight-section" : ""} ${isLevel2User ? "user-level-2-highlight-section" : ""} ${isLevel3User ? "user-level-3-widget" : ""} ${isLevel4User ? "user-level-4-widget" : ""} ${isLevel5User ? "user-level-5-widget" : ""}`}>
        <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 ${isLevel1User ? "user-level-1-highlight-title" : ""} ${isLevel2User ? "user-level-2-section-heading" : ""} ${isLevel3User ? "user-level-3-section-heading" : ""} ${isLevel4User ? "user-level-4-section-heading" : ""} ${isLevel5User ? "user-level-5-section-heading" : ""}`}>
          ¿Listo para jugar?
        </h2>
        <p className={`text-gray-300 text-base sm:text-lg mb-5 sm:mb-6 max-w-2xl mx-auto px-2 ${isLevel1User ? "user-level-1-highlight-copy" : ""} ${isLevel2User ? "user-level-2-highlight-copy" : ""} ${isLevel3User ? "user-level-3-copy" : ""} ${isLevel4User ? "user-level-4-copy" : ""} ${isLevel5User ? "user-level-5-copy" : ""}`}>
          Explora nuestro catalogo completo con {games.length} juegos disponibles
        </p>
        <Link to="/games">
          <Button className={`${isLevel1User ? "user-level-1-hero-button" : isLevel2User ? "user-level-2-hero-button" : isLevel3User ? "user-level-3-button" : isLevel4User ? "user-level-4-button" : isLevel5User ? "user-level-5-button" : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"} text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6`}>
            Ver Catalogo Completo
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
