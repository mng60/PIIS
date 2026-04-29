import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";

const categoryLabels = {
  accion: "Accion",
  puzzle: "Puzzle",
  arcade: "Arcade",
  estrategia: "Estrategia"
};

function getLevel1CategoryClass(category) {
  if (category === "arcade") return "user-level-1-category-arcade";
  if (category === "estrategia") return "user-level-1-category-estrategia";
  return "user-level-1-category-default";
}

function getLevel2CategoryClass() {
  return "user-level-2-featured-badge";
}

export default function FeaturedCarousel({ games }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const userLevel = isRegularUser ? getLevelFromXP(user.xp ?? 0).level : null;
  const isLevel1User = userLevel === 1;
  const isLevel2User = userLevel === 2;
  const isLevel3User = userLevel === 3;

  useEffect(() => {
    if (!isAutoPlaying || games.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % games.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [games.length, isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % games.length);
  };

  if (!games || games.length === 0) return null;

  const currentGame = games[currentIndex];

  return (
    <div className={`relative rounded-2xl md:rounded-3xl overflow-hidden group ${isLevel1User ? "user-level-1-featured-card" : ""} ${isLevel2User ? "user-level-2-featured-card" : ""} ${isLevel3User ? "user-level-3-widget user-level-3-featured-card" : ""}`}>
      <div className={`relative aspect-video md:aspect-[21/9] bg-gradient-to-br from-purple-900/50 to-cyan-900/50 ${isLevel2User ? "user-level-2-widget-media" : ""} ${isLevel3User ? "user-level-3-widget-media" : ""}`}>
        {currentGame.thumbnail ? (
          <img
            src={currentGame.thumbnail}
            alt={currentGame.title}
            className="w-full h-full object-cover"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-12">
          <div className="mb-2 md:mb-3">
            <Badge className={`${isLevel1User ? getLevel1CategoryClass(currentGame.category) : isLevel2User ? getLevel2CategoryClass(currentGame.category) : "bg-gradient-to-r from-purple-600 to-cyan-500"} border-0 text-white text-xs`}>
              {categoryLabels[currentGame.category] || currentGame.category}
            </Badge>
            {currentGame.is_adult && (
              <Badge className={`ml-2 text-white font-bold text-xs ${isLevel1User ? "user-level-1-adult-badge" : "bg-red-600/80 border-red-500/50"}`}>
                +18
              </Badge>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 md:mb-3 line-clamp-2">
            {currentGame.title}
          </h2>

          <p className="text-gray-200 text-sm sm:text-base md:text-lg mb-3 md:mb-6 max-w-2xl line-clamp-2 hidden sm:block">
            {currentGame.description || currentGame.full_description}
          </p>

          <Link to={`/games/${currentGame.id}`}>
            <Button className={`${isLevel1User ? "user-level-1-hero-button" : isLevel2User ? "user-level-2-featured-button" : isLevel3User ? "user-level-3-button" : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"} text-sm sm:text-base md:text-lg px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-6`}>
              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 fill-white" />
              Jugar Ahora
            </Button>
          </Link>
        </div>

        {games.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}

        {games.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {games.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsAutoPlaying(false);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? "w-8 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
