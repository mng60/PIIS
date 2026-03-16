import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2,
  Building2,
  Gamepad2,
  BarChart3,
  Plus,
  TrendingUp,
  Users,
  Star,
  Play,
  MessageSquare,
  Eye
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
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'empresa') {
        window.location.replace('/Home');
        return;
      }
      setUser(currentUser);
      setIsLoading(false);
    } catch (e) {
      window.location.replace('/Home');
    }
  };

  const { data: allGames = [] } = useQuery({
    queryKey: ["companyGames"],
    queryFn: () => base44.entities.Game.filter({ created_by: user?.email }, "-created_date"),
    enabled: !!user
  });

  const { data: allScores = [] } = useQuery({
    queryKey: ["companyScores"],
    queryFn: () => base44.entities.Score.list(),
    enabled: !!user
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ["companyComments"],
    queryFn: () => base44.entities.Comment.list(),
    enabled: !!user
  });

  const { data: allFavorites = [] } = useQuery({
    queryKey: ["companyFavorites"],
    queryFn: () => base44.entities.Favorite.list(),
    enabled: !!user
  });

  // Estadísticas por juego
  const gamesStats = useMemo(() => {
    return allGames.map(game => {
      const gameScores = allScores.filter(s => s.game_id === game.id);
      const gameComments = allComments.filter(c => c.game_id === game.id);
      const gameFavorites = allFavorites.filter(f => f.game_id === game.id);
      
      const uniquePlayers = new Set(gameScores.map(s => s.user_email)).size;
      const avgRating = game.rating_count > 0 
        ? (game.rating_sum / game.rating_count).toFixed(1) 
        : 0;

      return {
        ...game,
        uniquePlayers,
        totalScores: gameScores.length,
        commentsCount: gameComments.length,
        favoritesCount: gameFavorites.length,
        avgRating
      };
    });
  }, [allGames, allScores, allComments, allFavorites]);

  // Estadísticas globales
  const totalStats = useMemo(() => {
    const totalPlays = allGames.reduce((sum, g) => sum + (g.plays_count || 0), 0);
    const totalUniquePlayers = new Set(allScores.map(s => s.user_email)).size;
    const totalFavorites = gamesStats.reduce((sum, g) => sum + g.favoritesCount, 0);
    const totalComments = gamesStats.reduce((sum, g) => sum + g.commentsCount, 0);

    return { totalPlays, totalUniquePlayers, totalFavorites, totalComments };
  }, [allGames, allScores, gamesStats]);

  if (isLoading) {
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300">Jugadores Únicos</p>
                <p className="text-3xl font-bold text-white">{totalStats.totalUniquePlayers}</p>
              </div>
              <Users className="w-10 h-10 text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-300">Favoritos</p>
                <p className="text-3xl font-bold text-white">{totalStats.totalFavorites}</p>
              </div>
              <Star className="w-10 h-10 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Estadísticas Detalladas por Juego</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Juego</TableHead>
                  <TableHead className="text-gray-400">Estado</TableHead>
                  <TableHead className="text-gray-400">Partidas</TableHead>
                  <TableHead className="text-gray-400">Jugadores</TableHead>
                  <TableHead className="text-gray-400">Valoración</TableHead>
                  <TableHead className="text-gray-400">Comentarios</TableHead>
                  <TableHead className="text-gray-400">Favoritos</TableHead>
                  <TableHead className="text-gray-400">Puntuaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gamesStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                      No tienes juegos publicados. Sube tu primer juego para ver estadísticas.
                    </TableCell>
                  </TableRow>
                ) : (
                  gamesStats.map((game) => (
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
                        {game.plays_count || 0}
                      </TableCell>

                      <TableCell className="text-white">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-400" />
                          {game.uniquePlayers}
                        </div>
                      </TableCell>

                      <TableCell className="text-white">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          {game.avgRating} ({game.rating_count || 0})
                        </div>
                      </TableCell>

                      <TableCell className="text-white">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-cyan-400" />
                          {game.commentsCount}
                        </div>
                      </TableCell>

                      <TableCell className="text-white">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-red-400" />
                          {game.favoritesCount}
                        </div>
                      </TableCell>

                      <TableCell className="text-white">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          {game.totalScores}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}