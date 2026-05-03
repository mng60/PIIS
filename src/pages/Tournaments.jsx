import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTournaments } from "@/api/tournaments";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Trophy, Calendar, Users, Sword, ChevronRight, Loader2, Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLevelFromXP } from "@/lib/levels";

const STATUS_CONFIG = {
  upcoming: { label: "Inscripción abierta", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  active:   { label: "En curso",            color: "bg-green-500/20 text-green-400 border-green-500/30" },
  finished: { label: "Finalizado",          color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const TABS = ["upcoming", "active", "finished"];
const TAB_LABELS = { upcoming: "Próximos", active: "En curso", finished: "Finalizados" };

function TournamentCard({ tournament, isLevel1User = false, isLevel2User = false }) {
  const status = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.upcoming;
  const start = tournament.start_date ? format(new Date(tournament.start_date), "d MMM yyyy 'a las' HH:mm", { locale: es }) : "—";
  const end   = tournament.end_date   ? format(new Date(tournament.end_date),   "d MMM yyyy HH:mm", { locale: es }) : "—";

  return (
    <Link to={`/tournaments/${tournament.id}`}>
      <Card className={`bg-white/5 border-white/10 hover:border-purple-500/40 hover:bg-white/8 transition-all group cursor-pointer ${isLevel1User ? "user-level-1-tournament-card" : ""} ${isLevel2User ? "user-level-2-tournament-card" : ""}`}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {tournament.game_thumbnail && (
              <div className="w-full sm:w-32 h-24 sm:h-auto flex-shrink-0 overflow-hidden rounded-t-lg sm:rounded-l-lg sm:rounded-t-none">
                <img
                  src={tournament.game_thumbnail}
                  alt={tournament.game_title}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                />
              </div>
            )}
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className={`font-bold text-white text-lg leading-tight group-hover:text-purple-300 transition-colors ${isLevel1User ? "user-level-1-tournament-card-title" : ""} ${isLevel2User ? "user-level-2-tournament-card-title" : ""}`}>
                    {tournament.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">{tournament.game_title}</p>
                </div>
                <Badge className={`text-xs border ${status.color} flex-shrink-0`}>
                  {status.label}
                </Badge>
              </div>

              {tournament.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{tournament.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {start} → {end}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {tournament.participant_count} inscritos
                  {tournament.max_participants ? ` / ${tournament.max_participants}` : ""}
                </span>
                {tournament.prize && (
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <Trophy className="w-3.5 h-3.5" />
                    {tournament.prize}
                  </span>
                )}
                {(tournament.elo_min != null || tournament.elo_max != null) && (
                  <span className={`flex items-center gap-1.5 text-cyan-400 ${isLevel1User ? "user-level-1-tournament-elo" : ""} ${isLevel2User ? "user-level-2-tournament-elo" : ""}`}>
                    <Lock className="w-3.5 h-3.5" />
                    ELO {tournament.elo_min ?? 0} – {tournament.elo_max ?? "∞"}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center px-4">
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Tournaments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const isLevel1User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 1;
  const isLevel2User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 2;

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments", activeTab],
    queryFn: () => getTournaments(`?status=${activeTab}`),
  });

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${isLevel1User ? "user-level-1-tournaments-page" : ""} ${isLevel2User ? "user-level-2-tournaments-page" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-3xl font-bold text-white flex items-center gap-3 ${isLevel1User ? "user-level-1-games-title user-level-1-tournaments-title" : ""} ${isLevel2User ? "user-level-2-section-heading user-level-2-tournaments-title" : ""}`}>
            <Trophy className={`w-8 h-8 text-yellow-400 ${isLevel1User ? "user-level-1-games-icon user-level-1-tournaments-icon" : ""} ${isLevel2User ? "user-level-2-tournaments-icon" : ""}`} />
            Torneos
          </h1>
          <p className={`text-gray-400 mt-1 ${isLevel1User ? "user-level-1-tournaments-copy" : ""} ${isLevel2User ? "user-level-2-tournaments-copy" : ""}`}>Compite contra jugadores de tu nivel</p>
        </div>
        <div className="flex items-center gap-2">
          <Sword className={`w-5 h-5 text-purple-400 ${isLevel1User ? "user-level-1-tournaments-bracket-icon" : ""} ${isLevel2User ? "user-level-2-tournaments-bracket-icon" : ""}`} />
          <span className={`text-sm text-gray-400 ${isLevel1User ? "user-level-1-tournaments-bracket" : ""} ${isLevel2User ? "user-level-2-tournaments-bracket" : ""}`}>Brackets por ELO</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 bg-white/5 rounded-lg mb-6 w-fit ${isLevel1User ? "user-level-1-tournaments-tabs" : ""} ${isLevel2User ? "user-level-2-tournaments-tabs" : ""}`}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? isLevel1User ? "user-level-1-games-filter-active user-level-1-tournaments-tab-active text-white shadow" : isLevel2User ? "user-level-2-games-filter-active user-level-2-tournaments-tab-active text-white shadow" : "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow"
                : isLevel1User ? "user-level-1-games-filter user-level-1-tournaments-tab text-gray-400 hover:text-white" : isLevel2User ? "user-level-2-games-filter user-level-2-tournaments-tab text-gray-400 hover:text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin text-purple-400 ${isLevel1User ? "user-level-1-tournaments-loader" : ""}`} />
        </div>
      ) : tournaments.length === 0 ? (
        <div className={`text-center py-20 ${isLevel1User ? "user-level-1-tournaments-empty" : ""} ${isLevel2User ? "user-level-2-tournaments-empty" : ""}`}>
          <Trophy className={`w-16 h-16 mx-auto mb-4 text-gray-700 ${isLevel1User ? "user-level-1-tournaments-empty-icon" : ""} ${isLevel2User ? "user-level-2-tournaments-empty-icon" : ""}`} />
          <p className={`text-gray-400 text-lg ${isLevel1User ? "user-level-1-tournaments-empty-title" : ""} ${isLevel2User ? "user-level-2-tournaments-empty-title" : ""}`}>No hay torneos {TAB_LABELS[activeTab].toLowerCase()}</p>
          {activeTab === "upcoming" && (
            <p className="text-gray-600 text-sm mt-2">Pronto habrá nuevos torneos disponibles</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} isLevel1User={isLevel1User} isLevel2User={isLevel2User} />
          ))}
        </div>
      )}
    </div>
  );
}
