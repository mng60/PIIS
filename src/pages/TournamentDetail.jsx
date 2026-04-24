import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTournament, getParticipants, getMatches,
  joinTournament, leaveTournament,
} from "@/api/tournaments";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getEloRank } from "@/lib/eloRanks";
import {
  Trophy, Calendar, Users, Sword, Loader2, ArrowLeft,
  Lock, Play, Crown, Shield, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import WinCelebrationOverlay from "@/components/WinCelebrationOverlay";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  upcoming: { label: "Inscripción abierta", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  active:   { label: "En curso",            color: "bg-green-500/20 text-green-400 border-green-500/30" },
  finished: { label: "Finalizado",          color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const MATCH_STATUS = {
  pending:  { label: "Pendiente",  color: "text-gray-400" },
  playing:  { label: "En juego",   color: "text-green-400" },
  finished: { label: "Finalizado", color: "text-gray-500" },
  bye:      { label: "Bye",        color: "text-yellow-400" },
};

const BRACKET_COLORS = {
  Elite:        { bg: "from-yellow-600/20 to-amber-600/20",   border: "border-yellow-500/30",  text: "text-yellow-400"  },
  Avanzado:     { bg: "from-cyan-600/20 to-blue-600/20",      border: "border-cyan-500/30",    text: "text-cyan-400"    },
  Intermedio:   { bg: "from-purple-600/20 to-violet-600/20",  border: "border-purple-500/30",  text: "text-purple-400"  },
  Principiante: { bg: "from-gray-600/20 to-slate-600/20",     border: "border-gray-500/30",    text: "text-gray-400"    },
};

// ─── BracketMatch ─────────────────────────────────────────────────────────────

function BracketMatch({ match, userEmail, gameId }) {
  const p1Won = match.winner_email === match.player1_email;
  const p2Won = match.winner_email === match.player2_email;
  const isUserMatch = match.player1_email === userEmail || match.player2_email === userEmail;

  return (
    <div className={`w-48 border rounded-lg overflow-hidden text-xs transition-all ${
      isUserMatch ? "border-purple-500/60 shadow-lg shadow-purple-500/10" : "border-white/10"
    }`}>
      {/* Player 1 */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-white/5 ${
        p1Won ? "bg-green-500/10" : "bg-white/3"
      }`}>
        {p1Won && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
        <span className={`truncate font-medium ${
          match.player1_email ? (p1Won ? "text-white" : "text-gray-300") : "text-gray-600 italic"
        }`}>
          {match.player1_name || match.player1_email || "Por determinar"}
        </span>
      </div>
      {/* Player 2 */}
      <div className={`flex items-center gap-2 px-3 py-2 ${
        p2Won ? "bg-green-500/10" : "bg-white/3"
      }`}>
        {p2Won && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
        <span className={`truncate font-medium ${
          match.player2_email ? (p2Won ? "text-white" : "text-gray-300") : "text-gray-600 italic"
        }`}>
          {match.status === "bye" ? "BYE" : (match.player2_name || match.player2_email || "Por determinar")}
        </span>
      </div>
      {/* Footer */}
      {match.room_code && match.status === "playing" && isUserMatch && (
        <Link to={`/games/${gameId}?room=${match.room_code}&tournament=${match.tournament_id}`}>
          <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 transition-colors cursor-pointer border-t border-white/5">
            <Play className="w-3 h-3 text-purple-300" />
            <span className="text-purple-300 font-medium">Jugar</span>
          </div>
        </Link>
      )}
      {match.status === "bye" && (
        <div className="px-3 py-1.5 bg-yellow-500/10 border-t border-white/5 text-center">
          <span className="text-yellow-400 text-xs">Avance automático</span>
        </div>
      )}
    </div>
  );
}

// ─── BracketRound ─────────────────────────────────────────────────────────────

function BracketView({ bracketName, matches, userEmail, gameId }) {
  const colors = BRACKET_COLORS[bracketName] || BRACKET_COLORS.Principiante;

  const maxRound = Math.max(...matches.map(m => m.round));
  const rounds = [];
  for (let r = 1; r <= maxRound; r++) {
    rounds.push(matches.filter(m => m.round === r).sort((a, b) => a.match_index - b.match_index));
  }

  const roundLabels = rounds.map((_, i) => {
    const r = i + 1;
    if (r === maxRound && maxRound > 1) return "Final";
    if (r === maxRound - 1 && maxRound > 2) return "Semifinal";
    if (r === maxRound - 2 && maxRound > 3) return "Cuartos";
    return `Ronda ${r}`;
  });

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${colors.bg} ${colors.border} p-5 mb-6`}>
      <h3 className={`font-bold text-lg mb-5 flex items-center gap-2 ${colors.text}`}>
        <Shield className="w-5 h-5" />
        Bracket {bracketName}
      </h3>

      <div className="overflow-x-auto">
        <div className="flex gap-8 items-start min-w-max pb-2">
          {rounds.map((roundMatches, ri) => (
            <div key={ri} className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-gray-400 text-center mb-3 uppercase tracking-wider">
                {roundLabels[ri]}
              </p>
              <div
                className="flex flex-col justify-around"
                style={{ gap: `${Math.pow(2, ri) * 12}px` }}
              >
                {roundMatches.map((match) => (
                  <BracketMatch
                    key={match.id}
                    match={match}
                    userEmail={userEmail}
                    gameId={gameId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ParticipantList ──────────────────────────────────────────────────────────

function ParticipantList({ participants }) {
  const grouped = participants.reduce((acc, p) => {
    if (!acc[p.bracket_name]) acc[p.bracket_name] = [];
    acc[p.bracket_name].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([bracket, players]) => {
        const colors = BRACKET_COLORS[bracket] || BRACKET_COLORS.Principiante;
        return (
          <div key={bracket} className={`rounded-lg border ${colors.border} p-4`}>
            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${colors.text}`}>
              <Shield className="w-4 h-4" />
              {bracket} ({players.length} jugadores)
            </h4>
            <div className="space-y-2">
              {players.map((p, i) => {
                const rank = getEloRank(p.elo_at_signup);
                return (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-5 text-right">{i + 1}.</span>
                      <span className="text-sm text-gray-200">{p.user_name}</span>
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: rank.color }}>
                      {p.elo_at_signup}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') === '1';
  const autoRedirectFiredRef = useRef(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showWinCelebration, setShowWinCelebration] = useState(false);

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => getTournament(id),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["tournamentParticipants", id],
    queryFn: () => getParticipants(id),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["tournamentMatches", id],
    queryFn: () => getMatches(id),
    enabled: !!tournament && tournament.status !== "upcoming",
    refetchInterval: tournament?.status === 'active' ? 5000 : false,
  });

  const isEnrolled = user && participants.some(p => p.user_email === user.email);

  // Cuando se llega desde la notificación (?autoplay=1), redirigir directamente a la sala
  const myPlayingMatch = user ? matches.find(
    m => (m.player1_email === user.email || m.player2_email === user.email) && m.status === 'playing' && m.room_code
  ) : null;

  useEffect(() => {
    if (!autoplay || !myPlayingMatch || !tournament || autoRedirectFiredRef.current) return;
    autoRedirectFiredRef.current = true;
    toast.info('Redirigiendo a tu sala del torneo...', { duration: 2000 });
    const t = setTimeout(() => {
      navigate(`/games/${tournament.game_id}?room=${myPlayingMatch.room_code}&tournament=${id}`);
    }, 1500);
    return () => clearTimeout(t);
  }, [autoplay, myPlayingMatch?.id, tournament?.id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinTournament(id);
      queryClient.invalidateQueries(["tournamentParticipants", id]);
      queryClient.invalidateQueries(["tournament", id]);
      toast.success("¡Inscripción confirmada!");
    } catch (err) {
      toast.error(err?.message || "Error al inscribirse");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveTournament(id);
      queryClient.invalidateQueries(["tournamentParticipants", id]);
      queryClient.invalidateQueries(["tournament", id]);
      toast.success("Te has desinscrito del torneo");
    } catch (err) {
      toast.error(err?.message || "Error al desinscribirse");
    } finally {
      setLeaving(false);
    }
  };

  // Show win celebration when tournament is finished and current user is champion (once per session)
  // Must be before early returns to comply with React hooks rules
  useEffect(() => {
    if (!tournament || !user || tournament.status !== 'finished' || !matches.length) return;
    const maxRoundByBracket = {};
    for (const m of matches) {
      if (m.status === 'finished') {
        if (!maxRoundByBracket[m.bracket_name] || m.round > maxRoundByBracket[m.bracket_name]) {
          maxRoundByBracket[m.bracket_name] = m.round;
        }
      }
    }
    const isWinner = matches.some(
      m => m.status === 'finished' && m.winner_email === user.email && m.round === maxRoundByBracket[m.bracket_name]
    );
    if (!isWinner) return;
    const key = `tournament_win_shown_${tournament.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    setShowWinCelebration(true);
  }, [tournament?.status, matches.length, user?.email]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Torneo no encontrado</h2>
        <Link to="/tournaments"><Button variant="outline" className="mt-4">Volver a torneos</Button></Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.upcoming;
  const bracketNames = [...new Set(matches.map(m => m.bracket_name))].sort();

  // My active matches
  const myMatches = user ? matches.filter(
    m => (m.player1_email === user.email || m.player2_email === user.email) && m.status === "playing"
  ) : [];

  // Winners per bracket (only when tournament is finished)
  const bracketWinners = tournament.status === "finished"
    ? bracketNames.map(bracket => {
        const bMatches = matches.filter(m => m.bracket_name === bracket && m.status === "finished");
        if (!bMatches.length) return null;
        const maxRound = Math.max(...bMatches.map(m => m.round));
        const final = bMatches.find(m => m.round === maxRound && m.winner_email);
        if (!final) return null;
        const winnerName = final.winner_email === final.player1_email ? final.player1_name : final.player2_name;
        return { bracket, winnerName, winnerEmail: final.winner_email, isUser: final.winner_email === user?.email };
      }).filter(Boolean)
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {showWinCelebration && <WinCelebrationOverlay onDismiss={() => setShowWinCelebration(false)} />}

      {/* Back */}
      <Link to="/tournaments" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Todos los torneos
      </Link>

      {/* Winners banner */}
      {bracketWinners.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-500/30 mb-6">
          <CardContent className="p-5">
            <h3 className="text-yellow-400 font-bold text-base mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {bracketWinners.length === 1 ? "Campeón del torneo" : "Campeones del torneo"}
            </h3>
            <div className="space-y-2">
              {bracketWinners.map(w => (
                <div key={w.bracket} className="flex items-center justify-between py-2 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-gray-400 text-sm">Bracket {w.bracket}</span>
                  <div className="flex items-center gap-2">
                    {w.isUser && <span className="text-xs text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded-full">¡Eres tú!</span>}
                    <span className={`font-bold text-sm ${w.isUser ? "text-yellow-300" : "text-white"}`}>
                      {w.winnerName}
                    </span>
                    <Crown className="w-4 h-4 text-yellow-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border-white/10 mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {tournament.game_thumbnail && (
              <img
                src={tournament.game_thumbnail}
                alt={tournament.game_title}
                className="w-full md:w-32 h-24 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{tournament.title}</h1>
                <Badge className={`border text-xs flex-shrink-0 ${status.color}`}>{status.label}</Badge>
              </div>
              <p className="text-gray-400 text-sm mb-1">{tournament.game_title}</p>
              {tournament.description && <p className="text-gray-300 text-sm mb-4">{tournament.description}</p>}

              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {tournament.start_date ? format(new Date(tournament.start_date), "d MMM yyyy 'a las' HH:mm", { locale: es }) : "—"}
                  {" → "}
                  {tournament.end_date ? format(new Date(tournament.end_date), "d MMM yyyy HH:mm", { locale: es }) : "—"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {tournament.participant_count} inscritos
                  {tournament.max_participants ? ` / ${tournament.max_participants}` : ""}
                </span>
                {tournament.prize && (
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <Trophy className="w-4 h-4" />
                    {tournament.prize}
                  </span>
                )}
                {(tournament.elo_min != null || tournament.elo_max != null) && (
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Lock className="w-4 h-4" />
                    ELO {tournament.elo_min ?? 0} – {tournament.elo_max ?? "∞"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Join / Leave button */}
          {user && tournament.status === "upcoming" && (
            <div className="mt-5 pt-5 border-t border-white/10">
              {isEnrolled ? (
                <div className="flex items-center gap-4">
                  <span className="text-green-400 text-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Estás inscrito
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeave}
                    disabled={leaving}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Abandonar torneo"}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={joining || (tournament.max_participants && tournament.participant_count >= tournament.max_participants)}
                  className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 border-0"
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sword className="w-4 h-4 mr-2" />
                  )}
                  Inscribirse
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My active matches alert */}
      {myMatches.length > 0 && (
        <Card className="bg-green-500/10 border-green-500/30 mb-6">
          <CardContent className="p-4">
            <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
              <Play className="w-4 h-4" />
              ¡Tu partida está lista!
            </h3>
            {myMatches.map(m => {
              const opponent = m.player1_email === user.email ? m.player2_name : m.player1_name;
              return (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">
                    vs <strong className="text-white">{opponent}</strong> — Bracket {m.bracket_name}
                  </span>
                  <Link to={`/games/${tournament.game_id}?room=${m.room_code}&tournament=${id}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 border-0">
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Jugar ahora
                    </Button>
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Bracket view (when active/finished) */}
      {tournament.status !== "upcoming" && matches.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sword className="w-5 h-5 text-purple-400" />
            Brackets
          </h2>
          {bracketNames.map(bracket => (
            <BracketView
              key={bracket}
              bracketName={bracket}
              matches={matches.filter(m => m.bracket_name === bracket)}
              userEmail={user?.email}
              gameId={tournament.game_id}
            />
          ))}
        </div>
      )}

      {/* Participants */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-cyan-400" />
            Participantes inscritos ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">Aún no hay participantes inscritos</p>
          ) : (
            <ParticipantList participants={participants} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
