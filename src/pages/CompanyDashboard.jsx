import { useMemo } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2,
  Building2,
  Gamepad2,
  Plus,
  TrendingUp,
  Star,
  Play,
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

export default function CompanyDashboard() {
  const { user, isLoadingAuth } = useAuth();

  const { data: gamesData = {} } = useQuery({
    queryKey: ["companyGames", user?.email],
    queryFn: () => api.get("/games/mine"),
    enabled: !!user && user.role === "empresa",
  });
  const allGames = gamesData.games || [];

  const totalStats = useMemo(() => {
    const totalPlays = allGames.reduce((sum, g) => sum + (g.plays_count || 0), 0);
    const totalRatings = allGames.reduce((sum, g) => sum + (g.rating_count || 0), 0);
    const totalRatingSum = allGames.reduce((sum, g) => sum + (g.rating_sum || 0), 0);
    const avgRating = totalRatings > 0 ? (totalRatingSum / totalRatings).toFixed(1) : "—";
    return { totalPlays, totalRatings, avgRating };
  }, [allGames]);

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
        <p className="text-gray-400 mb-6">
          Solo las cuentas de empresa pueden acceder a esta sección
        </p>
        <Link to={createPageUrl("Home")}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            Volver al inicio
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-cyan-400" />
            Panel de Empresa
          </h1>
          <p className="text-gray-400 mt-1">Estadísticas de tus juegos</p>
        </div>
        <Link to={createPageUrl("UploadGame")}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            <Plus className="w-4 h-4 mr-2" />
            Subir Juego
          </Button>
        </Link>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-900/10 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-300">Mis Juegos</p>
                <p className="text-3xl font-bold text-white">{allGames.length}</p>
              </div>
              <Gamepad2 className="w-10 h-10 text-cyan-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Partidas Totales</p>
                <p className="text-3xl font-bold text-white">{totalStats.totalPlays}</p>
              </div>
              <Play className="w-10 h-10 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-300">Valoración Media</p>
                <p className="text-3xl font-bold text-white">{totalStats.avgRating}</p>
              </div>
              <Star className="w-10 h-10 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Table */}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {allGames.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                      No tienes juegos publicados. Sube tu primer juego para ver estadísticas.
                    </TableCell>
                  </TableRow>
                ) : (
                  allGames.map((game) => {
                    const avgRating = game.rating_count > 0
                      ? (game.rating_sum / game.rating_count).toFixed(1)
                      : "—";
                    return (
                      <TableRow key={game.id} className="border-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {game.thumbnail ? (
                              <img
                                src={game.thumbnail}
                                alt={game.title}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                                <Gamepad2 className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-white">{game.title}</p>
                              <p className="text-xs text-gray-500">{game.category}</p>
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
