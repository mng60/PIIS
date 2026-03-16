import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const categoryLabels = {
  accion: "Acción",
  puzzle: "Puzzle",
  arcade: "Arcade",
  estrategia: "Estrategia"
};

export default function FeaturedCarousel({ games }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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
    <div className="relative rounded-2xl md:rounded-3xl overflow-hidden group">
      <div className="relative aspect-video md:aspect-[21/9] bg-gradient-to-br from-purple-900/50 to-cyan-900/50">
        {currentGame.thumbnail ? (
          <img
            src={currentGame.thumbnail}
            alt={currentGame.title}
            className="w-full h-full object-cover"
          />
        ) : null}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-12">
          <div className="mb-2 md:mb-3">
            <Badge className="bg-gradient-to-r from-purple-600 to-cyan-500 border-0 text-white text-xs">
              {categoryLabels[currentGame.category] || currentGame.category}
            </Badge>
            {currentGame.is_adult && (
              <Badge className="ml-2 bg-red-600/80 border-red-500/50 text-white font-bold text-xs">
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

          <Link to={createPageUrl(`GameDetail?id=${currentGame.id}`)}>
            <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-sm sm:text-base md:text-lg px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-6">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 fill-white" />
              Jugar Ahora
            </Button>
          </Link>
        </div>

        {/* Navigation Arrows */}
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

        {/* Indicators */}
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