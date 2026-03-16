import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import GameCard from "./GameCard";

export default function RecommendationSection({ userEmail, currentGameId = null }) {
  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ["user-scores", userEmail],
    queryFn: () => base44.entities.Score.filter({ user_email: userEmail }),
    enabled: !!userEmail,
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ["games-active"],
    queryFn: () => base44.entities.Game.filter({ is_active: true }),
  });

  const recommendations = useMemo(() => {
    if (!userEmail || games.length === 0) return [];

    // Si el usuario no ha jugado nada aún, no recomendamos (sección oculta)
    if (scores.length === 0) return [];

    const RATING_THRESHOLD = 3; // "por encima de la mitad" en escala 1-5
    const MAX_RECS = 6; // <-- límite total de recomendaciones

    // 1) Juegos jugados (por existir un Score del usuario)
    const playedGameIds = new Set(scores.map((s) => s.game_id));

    // 2) Categorías jugadas + conteo para sacar favorita
    const categoryCount = {};
    for (const game of games) {
      if (playedGameIds.has(game.id)) {
        categoryCount[game.category] = (categoryCount[game.category] || 0) + 1;
      }
    }

    const playedCategories = new Set(Object.keys(categoryCount));
    if (playedCategories.size === 0) return [];

    // 3) Categoría favorita = la más jugada
    let favoriteCategory = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCount)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteCategory = cat;
      }
    }

    // 4) Candidatos: NO jugados, misma(s) categoría(s) jugada(s), no el actual
    const candidates = games
      .filter((g) => g.id !== currentGameId)
      .filter((g) => !playedGameIds.has(g.id))
      .filter((g) => playedCategories.has(g.category));

    // 5) Separar por rating:
    // - ratedGood: con votos y avg >= threshold
    // - unrated: sin votos (relleno si falta)
    const ratedGood = [];
    const unrated = [];

    for (const g of candidates) {
      const count = Number(g.rating_count || 0);
      const sum = Number(g.rating_sum || 0);

      if (count > 0) {
        const avg = sum / count;
        if (avg >= RATING_THRESHOLD) ratedGood.push(g);
      } else {
        unrated.push(g);
      }
    }

    // 6) Orden: favorita primero; luego rating desc; luego plays_count desc
    const sortFn = (a, b) => {
      const aFav = a.category === favoriteCategory ? 1 : 0;
      const bFav = b.category === favoriteCategory ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      const aCount = Number(a.rating_count || 0);
      const bCount = Number(b.rating_count || 0);

      const aAvg = aCount > 0 ? Number(a.rating_sum || 0) / aCount : -1;
      const bAvg = bCount > 0 ? Number(b.rating_sum || 0) / bCount : -1;

      // Rated primero
      const aRated = aCount > 0 ? 1 : 0;
      const bRated = bCount > 0 ? 1 : 0;
      if (aRated !== bRated) return bRated - aRated;

      // Si ambos rated: mejor rating primero
      if (aRated === 1 && bRated === 1 && aAvg !== bAvg) return bAvg - aAvg;

      // Popularidad como desempate
      const aPlays = Number(a.plays_count || 0);
      const bPlays = Number(b.plays_count || 0);
      if (aPlays !== bPlays) return bPlays - aPlays;

      // Estable: por título
      return String(a.title || "").localeCompare(String(b.title || ""));
    };

    ratedGood.sort(sortFn);
    unrated.sort(sortFn);

    // 7) Lista final: primero ratedGood, luego rellenar con unrated
    const finalList = [...ratedGood];
    for (const g of unrated) {
      if (finalList.length >= MAX_RECS) break;
      finalList.push(g);
    }

    return finalList.slice(0, MAX_RECS);
  }, [scores, games, userEmail, currentGameId]);

  // --- Carrusel (3 visibles en desktop, desliza 1 por click) ---
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateArrows, recommendations.length]);

  const scrollByOne = (dir) => {
    const el = scrollRef.current;
    if (!el) return;

    const first = el.querySelector('[data-carousel-item="true"]');
    const gapPx = parseFloat(getComputedStyle(el).gap || "0");
    const step = (first ? first.getBoundingClientRect().width : el.clientWidth) + gapPx;

    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (!userEmail || scoresLoading || gamesLoading) return null;
  if (recommendations.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-2xl font-bold text-white">Recomendado para ti</h2>
      </div>

      <div className="relative">
        {/* Flechas (solo si hay más de lo que cabe) */}
        {recommendations.length > 3 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => scrollByOne(-1)}
              disabled={!canLeft}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2
                bg-black/50 backdrop-blur border border-white/10
                hover:bg-black/70 transition
                ${!canLeft ? "opacity-30 cursor-not-allowed" : "opacity-100"}`}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>

            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => scrollByOne(1)}
              disabled={!canRight}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2
                bg-black/50 backdrop-blur border border-white/10
                hover:bg-black/70 transition
                ${!canRight ? "opacity-30 cursor-not-allowed" : "opacity-100"}`}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* Track */}
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pr-1"
        >
          {recommendations.map((game) => (
            <div
              key={game.id}
              data-carousel-item="true"
              className="shrink-0 snap-start basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}