import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUserScores } from "@/api/scores";
import { getGames } from "@/api/games";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import GameCard from "./GameCard";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";

export default function RecommendationSection({ userEmail, currentGameId = null }) {
  const { user } = useAuth();
  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ["user-scores", userEmail],
    queryFn: () => getUserScores(userEmail),
    enabled: !!userEmail,
  });

  const { data: { games = [] } = {}, isLoading: gamesLoading } = useQuery({
    queryKey: ["games-active"],
    queryFn: () => getGames("?limit=200"),
  });

  const recommendations = useMemo(() => {
    if (!userEmail || games.length === 0 || scores.length === 0) return [];

    const RATING_THRESHOLD = 3;
    const MAX_RECS = 6;

    const playedGameIds = new Set(scores.map((s) => s.game_id));
    const categoryCount = {};
    for (const game of games) {
      if (playedGameIds.has(game.id)) {
        categoryCount[game.category] = (categoryCount[game.category] || 0) + 1;
      }
    }

    const playedCategories = new Set(Object.keys(categoryCount));
    if (playedCategories.size === 0) return [];

    let favoriteCategory = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCount)) {
      if (count > maxCount) { maxCount = count; favoriteCategory = cat; }
    }

    const candidates = games
      .filter((g) => g.id !== currentGameId)
      .filter((g) => !playedGameIds.has(g.id))
      .filter((g) => playedCategories.has(g.category));

    const ratedGood = [];
    const unrated = [];
    for (const g of candidates) {
      const count = Number(g.rating_count || 0);
      const sum = Number(g.rating_sum || 0);
      if (count > 0) {
        if (sum / count >= RATING_THRESHOLD) ratedGood.push(g);
      } else {
        unrated.push(g);
      }
    }

    const sortFn = (a, b) => {
      const aFav = a.category === favoriteCategory ? 1 : 0;
      const bFav = b.category === favoriteCategory ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      const aAvg = a.rating_count > 0 ? a.rating_sum / a.rating_count : -1;
      const bAvg = b.rating_count > 0 ? b.rating_sum / b.rating_count : -1;
      if (aAvg !== bAvg) return bAvg - aAvg;
      return (b.plays_count || 0) - (a.plays_count || 0);
    };

    ratedGood.sort(sortFn);
    unrated.sort(sortFn);

    const finalList = [...ratedGood];
    for (const g of unrated) {
      if (finalList.length >= MAX_RECS) break;
      finalList.push(g);
    }
    return finalList.slice(0, MAX_RECS);
  }, [scores, games, userEmail, currentGameId]);

  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const isLevel1User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 1;

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows, recommendations.length]);

  const scrollByOne = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const first = el.querySelector('[data-carousel-item="true"]');
    const gapPx = parseFloat(getComputedStyle(el).gap || "0");
    const step = (first ? first.getBoundingClientRect().width : el.clientWidth) + gapPx;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (!userEmail || scoresLoading || gamesLoading || recommendations.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className={`w-5 h-5 ${isLevel1User ? "user-level-1-games-icon" : "text-purple-400"}`} />
        <h2 className={`text-2xl font-bold text-white ${isLevel1User ? "user-level-1-games-title" : ""}`}>Recomendado para ti</h2>
      </div>
      <div className="relative">
        {recommendations.length > 3 && (
          <>
            <button type="button" aria-label="Anterior" onClick={() => scrollByOne(-1)} disabled={!canLeft}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-black/50 backdrop-blur border border-white/10 hover:bg-black/70 transition ${!canLeft ? "opacity-30 cursor-not-allowed" : "opacity-100"}`}>
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button type="button" aria-label="Siguiente" onClick={() => scrollByOne(1)} disabled={!canRight}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-black/50 backdrop-blur border border-white/10 hover:bg-black/70 transition ${!canRight ? "opacity-30 cursor-not-allowed" : "opacity-100"}`}>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}
        <div ref={scrollRef} onScroll={updateArrows}
          className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pr-1">
          {recommendations.map((game) => (
            <div key={game.id} data-carousel-item="true" className="shrink-0 snap-start basis-full sm:basis-1/2 lg:basis-1/3">
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
