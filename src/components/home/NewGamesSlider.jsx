import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import GameCard from "@/components/games/GameCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";

export default function NewGamesSlider({ games }) {
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const isLevel1User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 1;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      const container = scrollRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      if (direction === "right" && container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else if (direction === "left" && container.scrollLeft <= 10) {
        container.scrollTo({ left: maxScroll, behavior: "smooth" });
      } else {
        container.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  if (!games || games.length === 0) return null;

  return (
    <div className="relative">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <Sparkles className={`w-7 h-7 ${isLevel1User ? "user-level-1-new-games-icon" : "text-cyan-400"}`} />
        <span className={isLevel1User ? "user-level-1-new-games-heading" : ""}>Novedades</span>
      </h2>
      
      {games.length > 4 && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="hidden lg:flex absolute -left-12 top-[60%] -translate-y-1/2 z-10 border-current bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="hidden lg:flex absolute -right-12 top-[60%] -translate-y-1/2 z-10 border-current bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {games.map((game) => (
          <div key={game.id} className="flex-shrink-0 w-64 sm:w-72">
            <GameCard game={game} />
          </div>
        ))}
      </div>
    </div>
  );
}
