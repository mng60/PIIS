import { useState, useMemo } from "react";
import { getMyGames } from "@/api/games";
import { getGameComments } from "@/api/comments";
import { useAuth } from "@/lib/AuthContext";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Loader2,
  Building2,
  Gamepad2,
  Plus,
  TrendingUp,
  Star,
  Play,
  Trophy,
  Eye,
  EyeOff,
  BarChart3,
  Layers,
  CalendarDays,
  ClipboardCheck,
  Users,
  Activity,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Rocket,
  Megaphone,
  Clock3,
  ListChecks,
  Bug,
  Gauge,
  MessageSquareWarning,
  ShieldAlert,
  Wrench,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import GameManageDialog from "@/components/admin/GameManageDialog";
import TournamentsTab from "@/components/admin/TournamentsTab";

const TABS = ["juegos", "torneos"];
const TAB_LABELS = { juegos: "Mis Juegos", torneos: "Mis Torneos" };
const RATING_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "5", label: "5 estrellas" },
  { value: "4", label: "4 estrellas" },
  { value: "3", label: "3 estrellas" },
  { value: "2", label: "2 estrellas" },
  { value: "1", label: "1 estrella" },
  { value: "none", label: "Sin estrellas" },
];
const CATEGORY_LABELS = {
  arcade: "Arcade",
  estrategia: "Estrategia",
  puzzle: "Puzzle",
  deportes: "Deportes",
  accion: "Acción",
  aventura: "Aventura",
};

function getAverageRating(game) {
  return game.rating_count > 0 ? game.rating_sum / game.rating_count : 0;
}

function formatDate(date) {
  if (!date) return "Sin fecha";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CompanyDashboard() {
  const { user, isLoadingAuth } = useAuth();
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeTab, setActiveTab] = useState("juegos");
  const [ratingFilter, setRatingFilter] = useState("all");

  const { data: gamesData = {} } = useQuery({
    queryKey: ["companyGames", user?.email],
    queryFn: getMyGames,
    enabled: !!user && user.role === "empresa",
  });
  const allGames = gamesData.games || [];
  const commentQueries = useQueries({
    queries: allGames.slice(0, 8).map((game) => ({
      queryKey: ["companyDashboardComments", game.id],
      queryFn: () => getGameComments(game.id),
      enabled: !!user && user.role === "empresa" && Boolean(game.id),
    })),
  });

  const totalStats = useMemo(() => {
    const totalPlays = allGames.reduce((sum, g) => sum + (g.plays_count || 0), 0);
    const totalRatings = allGames.reduce((sum, g) => sum + (g.rating_count || 0), 0);
    const totalRatingSum = allGames.reduce((sum, g) => sum + (g.rating_sum || 0), 0);
    const activeGames = allGames.filter((g) => g.is_active).length;
    const hiddenGames = allGames.length - activeGames;
    const categories = [...new Set(allGames.map((g) => g.category).filter(Boolean))];
    const avgRating = totalRatings > 0 ? (totalRatingSum / totalRatings).toFixed(1) : "Sin votos";
    const playsPerGame = allGames.length > 0 ? Math.round(totalPlays / allGames.length) : 0;
    const gamesWithThumbnail = allGames.filter((g) => Boolean(g.thumbnail)).length;
    const topGame = [...allGames].sort((a, b) => (b.plays_count || 0) - (a.plays_count || 0))[0] || null;
    const bestRatedGame = [...allGames]
      .filter((g) => (g.rating_count || 0) > 0)
      .sort((a, b) => getAverageRating(b) - getAverageRating(a))[0] || null;
    const recentGames = [...allGames]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 4);
    const categoryRows = categories
      .map((category) => {
        const games = allGames.filter((g) => g.category === category);
        const plays = games.reduce((sum, g) => sum + (g.plays_count || 0), 0);
        return { category, games: games.length, plays };
      })
      .sort((a, b) => b.plays - a.plays);

    return {
      totalPlays,
      totalRatings,
      avgRating,
      activeGames,
      hiddenGames,
      categoryCount: categories.length,
      playsPerGame,
      gamesWithThumbnail,
      topGame,
      bestRatedGame,
      recentGames,
      categoryRows,
    };
  }, [allGames]);

  const portfolioItems = [
    {
      label: "Juegos activos",
      value: totalStats.activeGames,
      detail: "Visibles para jugadores",
      icon: Eye,
      className: "from-emerald-900/30 to-emerald-900/10 border-emerald-500/20 text-emerald-300",
    },
    {
      label: "Juegos ocultos",
      value: totalStats.hiddenGames,
      detail: "En pausa o revisión",
      icon: EyeOff,
      className: "from-rose-900/30 to-rose-900/10 border-rose-500/20 text-rose-300",
    },
    {
      label: "Categorías",
      value: totalStats.categoryCount,
      detail: "Variedad del catálogo",
      icon: Layers,
      className: "from-blue-900/30 to-blue-900/10 border-blue-500/20 text-blue-300",
    },
    {
      label: "Votos recibidos",
      value: totalStats.totalRatings,
      detail: "Opiniones de usuarios",
      icon: Users,
      className: "from-fuchsia-900/30 to-fuchsia-900/10 border-fuchsia-500/20 text-fuchsia-300",
    },
  ];

  const infoItems = [
    {
      title: "Visibilidad",
      value: `${totalStats.activeGames}/${allGames.length}`,
      text: "juegos publicados actualmente",
      icon: Activity,
    },
    {
      title: "Media de partidas",
      value: totalStats.playsPerGame,
      text: "partidas por juego del catálogo",
      icon: Target,
    },
    {
      title: "Portadas añadidas",
      value: `${totalStats.gamesWithThumbnail}/${allGames.length}`,
      text: "juegos con imagen configurada",
      icon: ClipboardCheck,
    },
  ];

  const catalogHealth = [
    {
      label: "Catálogo visible",
      value: allGames.length > 0 ? `${Math.round((totalStats.activeGames / allGames.length) * 100)}%` : "0%",
      detail: "Porcentaje de juegos activos",
      status: totalStats.activeGames > 0 ? "Correcto" : "Pendiente",
      icon: Eye,
    },
    {
      label: "Ficha visual",
      value: allGames.length > 0 ? `${Math.round((totalStats.gamesWithThumbnail / allGames.length) * 100)}%` : "0%",
      detail: "Juegos con portada configurada",
      status: totalStats.gamesWithThumbnail === allGames.length && allGames.length > 0 ? "Completo" : "Revisar",
      icon: ClipboardCheck,
    },
    {
      label: "Interacción",
      value: totalStats.totalRatings,
      detail: "Valoraciones recibidas",
      status: totalStats.totalRatings > 0 ? "Con datos" : "Sin votos",
      icon: Star,
    },
    {
      label: "Actividad acumulada",
      value: totalStats.totalPlays,
      detail: "Partidas jugadas en tus juegos",
      status: totalStats.totalPlays > 0 ? "Activo" : "Inicial",
      icon: TrendingUp,
    },
  ];

  const publishingChecklist = [
    {
      title: "Portadas claras",
      detail: "Usa imágenes reconocibles para que cada juego destaque en el catálogo.",
      done: totalStats.gamesWithThumbnail === allGames.length && allGames.length > 0,
    },
    {
      title: "Juegos visibles",
      detail: "Mantén activos los juegos listos y oculta solo los que estén en revisión.",
      done: totalStats.activeGames > 0,
    },
    {
      title: "Variedad de categorías",
      detail: "Publicar en más de una categoría ayuda a que el catálogo se vea más completo.",
      done: totalStats.categoryCount > 1,
    },
    {
      title: "Primeras valoraciones",
      detail: "Las opiniones ayudan a detectar qué juegos funcionan mejor.",
      done: totalStats.totalRatings > 0,
    },
  ];

  const roadmapItems = [
    { phase: "Esta semana", title: "Revisar fichas", detail: "Comprobar portada, descripción y estado de cada juego." },
    { phase: "Próximo paso", title: "Impulsar partidas", detail: "Promocionar el juego destacado y medir su actividad." },
    { phase: "Después", title: "Preparar torneos", detail: "Usar los juegos activos para crear eventos de participación." },
  ];

  const promotionIdeas = [
    "Destacar el juego con más partidas en la página principal.",
    "Actualizar portadas de juegos sin imagen para mejorar la primera impresión.",
    "Crear un torneo con el juego más estable del catálogo.",
    "Revisar los juegos ocultos y decidir si vuelven a publicarse.",
  ];

  const operationalStats = [
    {
      label: "Bugs abiertos",
      value: 0,
      detail: "Incidencias técnicas reportadas",
      icon: Bug,
      className: "text-red-300 bg-red-500/10 border-red-500/20",
    },
    {
      label: "Reportes pendientes",
      value: 0,
      detail: "Avisos de usuarios por revisar",
      icon: MessageSquareWarning,
      className: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
    },
    {
      label: "Juegos a revisar",
      value: totalStats.hiddenGames,
      detail: "Ocultos o pausados actualmente",
      icon: Wrench,
      className: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      label: "Riesgo operativo",
      value: totalStats.hiddenGames > 0 ? "Medio" : "Bajo",
      detail: "Según visibilidad del catálogo",
      icon: Gauge,
      className: "text-green-300 bg-green-500/10 border-green-500/20",
    },
  ];

  const reviewRows = allGames.slice(0, 5).map((game) => ({
    id: game.id,
    title: game.title,
    status: game.is_active ? "Publicado" : "Revisión",
    bugs: 0,
    priority: game.is_active ? "Normal" : "Alta",
    nextStep: game.is_active ? "Mantener seguimiento" : "Validar antes de publicar",
  }));

  const qualitySignals = [
    {
      title: "Ficha completa",
      value: `${totalStats.gamesWithThumbnail}/${allGames.length}`,
      detail: "Juegos con portada visible",
    },
    {
      title: "Cobertura de actividad",
      value: totalStats.totalPlays > 0 ? "Con datos" : "Sin datos",
      detail: "Partidas suficientes para comparar rendimiento",
    },
    {
      title: "Opinión de usuarios",
      value: totalStats.totalRatings > 0 ? `${totalStats.totalRatings} votos` : "Sin votos",
      detail: "Valoraciones disponibles para análisis",
    },
  ];

  const companyComments = useMemo(() => {
    return commentQueries
      .flatMap((query, index) => {
        const game = allGames[index];
        return (query.data || []).map((comment) => ({
          ...comment,
          game_title: game?.title || "Juego",
        }));
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8);
  }, [commentQueries, allGames]);
  const commentStats = useMemo(() => {
    const ratedComments = companyComments.filter((comment) => Number(comment.rating) > 0);
    const ratingTotal = ratedComments.reduce((sum, comment) => sum + Number(comment.rating || 0), 0);
    const average = ratedComments.length > 0 ? (ratingTotal / ratedComments.length).toFixed(1) : "Sin votos";
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: ratedComments.filter((comment) => Number(comment.rating) === rating).length,
    }));

    return {
      average,
      total: companyComments.length,
      rated: ratedComments.length,
      withoutRating: companyComments.length - ratedComments.length,
      distribution,
    };
  }, [companyComments]);
  const filteredCompanyComments = useMemo(() => {
    if (ratingFilter === "all") return companyComments;
    if (ratingFilter === "none") return companyComments.filter((comment) => !comment.rating);
    return companyComments.filter((comment) => Number(comment.rating) === Number(ratingFilter));
  }, [companyComments, ratingFilter]);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user || user.role !== "empresa") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
        <p className="text-gray-400 mb-6">Solo las cuentas de empresa pueden acceder a esta sección</p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {selectedGame && (
        <GameManageDialog
          game={selectedGame}
          isAdmin={false}
          onClose={() => setSelectedGame(null)}
        />
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-cyan-400" />
            Panel de Empresa
          </h1>
          <p className="text-gray-400 mt-1">Resumen de catálogo, actividad y rendimiento de tus juegos</p>
        </div>
        <Link to="/upload-game">
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            <Plus className="w-4 h-4 mr-2" />
            Subir Juego
          </Button>
        </Link>
      </div>

      <div className="mb-8 rounded-lg border border-white/10 bg-gradient-to-br from-white/10 via-cyan-500/10 to-purple-500/10 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
          <div>
            <Badge className="mb-3 bg-cyan-500/20 text-cyan-300 border-cyan-500/20">
              Vista exclusiva para empresa
            </Badge>
            <h2 className="text-2xl font-bold text-white">Resumen general del catálogo</h2>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">
              Aquí puedes consultar de un vistazo el estado de tus juegos, su actividad, sus votos y la variedad de categorías publicadas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-black/20 border border-white/10 p-4">
              <p className="text-xs text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-green-300">{totalStats.activeGames}</p>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/10 p-4">
              <p className="text-xs text-gray-400">Ocultos</p>
              <p className="text-2xl font-bold text-red-300">{totalStats.hiddenGames}</p>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/10 p-4">
              <p className="text-xs text-gray-400">Categorías</p>
              <p className="text-2xl font-bold text-blue-300">{totalStats.categoryCount}</p>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/10 p-4">
              <p className="text-xs text-gray-400">Media partidas</p>
              <p className="text-2xl font-bold text-purple-300">{totalStats.playsPerGame}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-900/10 border-cyan-500/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-cyan-300">Mis Juegos</p>
              <p className="text-3xl font-bold text-white">{allGames.length}</p>
            </div>
            <Gamepad2 className="w-10 h-10 text-cyan-400 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-300">Partidas Totales</p>
              <p className="text-3xl font-bold text-white">{totalStats.totalPlays}</p>
            </div>
            <Play className="w-10 h-10 text-green-400 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 border-yellow-500/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-300">Valoración Media</p>
              <p className="text-3xl font-bold text-white">{totalStats.avgRating}</p>
            </div>
            <Star className="w-10 h-10 text-yellow-400 opacity-50" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {portfolioItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`bg-gradient-to-br ${item.className}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm">{item.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{item.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
                  </div>
                  <Icon className="w-8 h-8 opacity-60" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Juego destacado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalStats.topGame ? (
              <div className="flex flex-col md:flex-row gap-5">
                {totalStats.topGame.thumbnail ? (
                  <img
                    src={totalStats.topGame.thumbnail}
                    alt={totalStats.topGame.title}
                    className="w-full md:w-52 aspect-video rounded-lg object-cover bg-white/10"
                  />
                ) : (
                  <div className="w-full md:w-52 aspect-video rounded-lg bg-white/10 flex items-center justify-center">
                    <Gamepad2 className="w-10 h-10 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="text-xl font-semibold text-white truncate">{totalStats.topGame.title}</h2>
                    <Badge className={totalStats.topGame.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                      {totalStats.topGame.is_active ? "Activo" : "Oculto"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {totalStats.topGame.description || "Sin descripción añadida todavía."}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-xs text-gray-500">Partidas</p>
                      <p className="text-lg font-semibold text-white">{totalStats.topGame.plays_count || 0}</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-xs text-gray-500">Valoración</p>
                      <p className="text-lg font-semibold text-white">
                        {(totalStats.topGame.rating_count || 0) > 0 ? getAverageRating(totalStats.topGame).toFixed(1) : "Sin votos"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-xs text-gray-500">Categoría</p>
                      <p className="text-lg font-semibold text-white truncate">
                        {CATEGORY_LABELS[totalStats.topGame.category] || totalStats.topGame.category || "Sin categoría"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-xs text-gray-500">Publicado</p>
                      <p className="text-sm font-semibold text-white">{formatDate(totalStats.topGame.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-gray-400">
                Sube tu primer juego para activar el resumen destacado.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Información rápida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {infoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">{item.title}</p>
                    <p className="text-white font-semibold">
                      {item.value} <span className="text-xs font-normal text-gray-500">{item.text}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Distribución por categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalStats.categoryRows.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Aún no hay categorías para mostrar.</p>
            ) : (
              totalStats.categoryRows.map((row) => {
                const percent = totalStats.totalPlays > 0
                  ? Math.max(8, Math.round((row.plays / totalStats.totalPlays) * 100))
                  : 8;
                return (
                  <div key={row.category}>
                    <div className="flex items-center justify-between gap-3 text-sm mb-2">
                      <span className="text-white font-medium">{CATEGORY_LABELS[row.category] || row.category}</span>
                      <span className="text-gray-400">{row.games} juegos - {row.plays} partidas</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyan-400" />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalStats.recentGames.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No hay actividad reciente para mostrar.</p>
            ) : (
              totalStats.recentGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{game.title}</p>
                    <p className="text-xs text-gray-500">Añadido el {formatDate(game.created_at)}</p>
                  </div>
                  <Badge className="bg-white/10 text-gray-300">
                    {game.plays_count || 0} partidas
                  </Badge>
                </div>
              ))
            )}
            {totalStats.bestRatedGame && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                <p className="text-xs text-yellow-300">Mejor valorado</p>
                <p className="text-sm font-semibold text-white truncate">
                  {totalStats.bestRatedGame.title} - {getAverageRating(totalStats.bestRatedGame).toFixed(1)} estrellas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        <Card className="xl:col-span-3 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-cyan-400" />
              Salud del catálogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {catalogHealth.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="w-5 h-5 text-cyan-300" />
                      <Badge className="bg-white/10 text-gray-300">{item.status}</Badge>
                    </div>
                    <p className="text-2xl font-bold text-white mt-4">{item.value}</p>
                    <p className="text-sm text-gray-300 mt-1">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-purple-400" />
              Acciones rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/upload-game" className="block">
              <Button className="w-full justify-start bg-gradient-to-r from-purple-600 to-cyan-500">
                <Plus className="w-4 h-4 mr-2" />
                Subir nuevo juego
              </Button>
            </Link>
            <Link to="/tournaments" className="block">
              <Button variant="outline" className="w-full justify-start border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
                <Trophy className="w-4 h-4 mr-2" />
                Ver torneos
              </Button>
            </Link>
            <Link to="/games" className="block">
              <Button variant="outline" className="w-full justify-start border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
                <Gamepad2 className="w-4 h-4 mr-2" />
                Ver catálogo público
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Checklist de publicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {publishingChecklist.map((item) => (
              <div key={item.title} className="flex gap-3 rounded-lg bg-white/5 p-3">
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-cyan-400" />
              Planificación sugerida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roadmapItems.map((item) => (
              <div key={item.phase} className="relative pl-5">
                <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-cyan-400" />
                <p className="text-xs uppercase tracking-wide text-cyan-300">{item.phase}</p>
                <p className="text-sm font-semibold text-white mt-1">{item.title}</p>
                <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-fuchsia-400" />
              Ideas para promocionar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {promotionIdeas.map((idea) => (
              <div key={idea} className="rounded-lg bg-white/5 p-3">
                <p className="text-sm text-gray-300">{idea}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Comentarios de mis juegos
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {RATING_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setRatingFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    ratingFilter === filter.value
                      ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {companyComments.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-gray-400">Media de estrellas</p>
                  <p className="text-2xl font-bold text-yellow-300 mt-1">{commentStats.average}</p>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-gray-400">Comentarios</p>
                  <p className="text-2xl font-bold text-white mt-1">{commentStats.total}</p>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-gray-400">Con estrellas</p>
                  <p className="text-2xl font-bold text-cyan-300 mt-1">{commentStats.rated}</p>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-gray-400">Sin estrellas</p>
                  <p className="text-2xl font-bold text-purple-300 mt-1">{commentStats.withoutRating}</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white mb-4">Distribución de valoraciones</p>
                <div className="space-y-3">
                  {commentStats.distribution.map((row) => {
                    const percent = commentStats.rated > 0 ? Math.max(6, Math.round((row.count / commentStats.rated) * 100)) : 0;
                    return (
                      <div key={row.rating} className="grid grid-cols-[80px_1fr_32px] items-center gap-3 text-sm">
                        <div className="flex items-center gap-1 text-yellow-300">
                          <Star className="w-4 h-4 fill-yellow-300" />
                          <span>{row.rating}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-cyan-400" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-gray-400 text-right">{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {filteredCompanyComments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {filteredCompanyComments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{comment.game_title}</p>
                          <p className="text-xs text-gray-500 truncate">{comment.user_name || comment.user_email || "Usuario"}</p>
                        </div>
                        {comment.rating ? (
                          <div className="flex items-center gap-1 text-yellow-400 shrink-0">
                            <Star className="w-4 h-4 fill-yellow-400" />
                            <span className="text-sm font-semibold">{comment.rating}</span>
                          </div>
                        ) : (
                          <Badge className="bg-white/10 text-gray-400 shrink-0">Sin estrellas</Badge>
                        )}
                      </div>
                      <div className="flex gap-0.5 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              comment.rating && star <= Number(comment.rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-4">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  No hay comentarios para el filtro seleccionado.
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-white font-semibold">Aún no hay comentarios en tus juegos</p>
              <p className="text-sm mt-1">Cuando los jugadores comenten, aparecerán aquí.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <Card className="xl:col-span-2 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Centro de bugs e incidencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {operationalStats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`rounded-lg border p-4 ${item.className}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="text-xl font-bold text-white">{item.value}</span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-3">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Juego</TableHead>
                    <TableHead className="text-gray-400">Estado</TableHead>
                    <TableHead className="text-gray-400">Bugs</TableHead>
                    <TableHead className="text-gray-400">Prioridad</TableHead>
                    <TableHead className="text-gray-400">Siguiente paso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                        No hay juegos para revisar todavía.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviewRows.map((row) => (
                      <TableRow key={row.id} className="border-white/5">
                        <TableCell className="text-white font-medium">{row.title}</TableCell>
                        <TableCell>
                          <Badge className={row.status === "Publicado" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-300"}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">{row.bugs}</TableCell>
                        <TableCell className={row.priority === "Alta" ? "text-yellow-300" : "text-gray-300"}>{row.priority}</TableCell>
                        <TableCell className="text-gray-400">{row.nextStep}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-cyan-400" />
              Calidad del catálogo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {qualitySignals.map((item) => (
              <div key={item.title} className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-gray-400">{item.title}</p>
                <p className="text-xl font-bold text-white mt-1">{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
              </div>
            ))}
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-sm font-semibold text-cyan-200">Recomendación</p>
              <p className="text-xs text-gray-300 mt-2">
                Revisa primero los juegos ocultos, después actualiza portadas y finalmente mide votos para priorizar mejoras.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === "torneos" && <Trophy className="w-4 h-4" />}
            {tab === "juegos" && <Gamepad2 className="w-4 h-4" />}
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === "torneos" && (
        <TournamentsTab filterByOwner={user.email} onlyOwnGames />
      )}

      {activeTab === "juegos" && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Estadísticas por Juego</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Juego</TableHead>
                    <TableHead className="text-gray-400">Estado</TableHead>
                    <TableHead className="text-gray-400">Partidas</TableHead>
                    <TableHead className="text-gray-400">Valoración</TableHead>
                    <TableHead className="text-gray-400 w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allGames.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                        No tienes juegos publicados. Sube tu primer juego para ver estadísticas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allGames.map((game) => {
                      const avgRating = game.rating_count > 0
                        ? (game.rating_sum / game.rating_count).toFixed(1)
                        : "Sin votos";
                      return (
                        <TableRow key={game.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {game.thumbnail ? (
                                <img
                                  src={game.thumbnail}
                                  alt={game.title}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                  <Gamepad2 className="w-5 h-5 text-gray-500" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-white text-sm">{game.title}</p>
                                <p className="text-xs text-gray-500">
                                  {CATEGORY_LABELS[game.category] || game.category}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={game.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                              {game.is_active ? "Activo" : "Oculto"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-green-400" />
                              {game.plays_count || 0}
                            </div>
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="flex items-center gap-1.5">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              {avgRating} ({game.rating_count || 0})
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedGame(game)}
                              className="h-7 text-xs border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                            >
                              Gestionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
