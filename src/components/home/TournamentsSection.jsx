import React, { useRef } from "react";
import { Trophy, Calendar, Users, ChevronLeft, ChevronRight, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TournamentsSection() {
  const scrollRef = useRef(null);

  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => api.get("/tournaments"),
  });

  const { data: { games = [] } = {} } = useQuery({
    queryKey: ["games"],
    queryFn: () => api.get("/games?limit=200"),
  });

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 350;
      const container = scrollRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (direction === "right" && container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else if (direction === "left" && container.scrollLeft <= 10) {
        container.scrollTo({ left: maxScroll, behavior: "smooth" });
      } else {
        container.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
      }
    }
  };

  if (!tournaments || tournaments.length === 0) return null;

  const activeTournaments = tournaments.filter(t => t.status !== "finished").slice(0, 6);

  return (
    <div className="relative">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <Trophy className="w-7 h-7 text-yellow-400" />
        Torneos
      </h2>

      {activeTournaments.length > 3 && (
        <>
          <Button variant="outline" size="icon" onClick={() => scroll("left")}
            className="hidden lg:flex absolute -left-12 top-[60%] -translate-y-1/2 z-10 border-current bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white shadow-lg">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => scroll("right")}
            className="hidden lg:flex absolute -right-12 top-[60%] -translate-y-1/2 z-10 border-current bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white shadow-lg">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      <div ref={scrollRef} className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {activeTournaments.map((tournament) => {
          const game = games.find(g => g.id === tournament.game_id);
          const startDate = new Date(tournament.start_date);
          const endDate = new Date(tournament.end_date);
          return (
            <Card key={tournament.id}
              className="flex-shrink-0 w-72 sm:w-80 bg-white/5 border-white/10 hover:bg-white/10 hover:border-yellow-500/50 transition-all duration-300 overflow-hidden group">
              <div className="relative aspect-video bg-gradient-to-br from-yellow-900/30 to-orange-900/30">
                {tournament.thumbnail ? (
                  <img src={tournament.thumbnail} alt={tournament.title} className="w-full h-full object-cover" />
                ) : game?.thumbnail ? (
                  <img src={game.thumbnail} alt={tournament.title} className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Trophy className="w-16 h-16 text-yellow-500/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <Badge className={`absolute top-3 right-3 ${
                  tournament.status === "active" ? "bg-green-600/80 text-white" : "bg-yellow-600/80 text-white"
                }`}>
                  {tournament.status === "active" ? "En curso" : "Próximamente"}
                </Badge>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-white text-lg mb-2 line-clamp-2 group-hover:text-yellow-300 transition-colors">
                  {tournament.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{tournament.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-4 h-4 text-yellow-400" />
                    <span>{format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM yyyy", { locale: es })}</span>
                  </div>
                  {tournament.max_participants && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="w-4 h-4 text-yellow-400" />
                      <span>Máx. {tournament.max_participants} participantes</span>
                    </div>
                  )}
                  {tournament.prize && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Gift className="w-4 h-4 text-yellow-400" />
                      <span>{tournament.prize}</span>
                    </div>
                  )}
                </div>
                {game && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Link to={createPageUrl(`GameDetail?id=${game.id}`)}>
                      <Button variant="outline" className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                        Ver Juego
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
