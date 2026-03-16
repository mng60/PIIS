import React, { useState, useMemo } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2,
  Shield,
  Users,
  Gamepad2,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Ban,
  UserCheck,
  Play,
  MessageSquare,
  Star,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Flag } from "lucide-react";
import AdminReportsSection from "@/components/moderation/AdminReportsSection";
import TournamentsTab from "@/components/admin/TournamentsTab";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function UsersTabContent({ users, user, queryClient, clearChatMute, clearPlayBan, changeUserRole, toggleUserBan, isActiveUntil, parseDate }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-gray-400">Usuario</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">Rol</TableHead>
              <TableHead className="text-gray-400">Estado</TableHead>
              <TableHead className="text-gray-400">Chat</TableHead>
              <TableHead className="text-gray-400">Jugar</TableHead>
              <TableHead className="text-gray-400">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => {
              const chatMutedActive = isActiveUntil(u.chat_muted_until);
              const playBannedActive = isActiveUntil(u.play_banned_until);

              const chatDate = parseDate(u.chat_muted_until);
              const playDate = parseDate(u.play_banned_until);

              return (
                <TableRow key={u.id} className="border-white/5">
                  <TableCell>
                    <p className="font-medium text-white">{u.full_name || "Sin nombre"}</p>
                  </TableCell>

                  <TableCell className="text-gray-400">{u.email}</TableCell>

                  <TableCell>
                    <Badge
                      className={
                        u.role === "admin"
                          ? "bg-purple-500/20 text-purple-400"
                          : u.role === "empresa"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-white/10 text-white"
                      }
                    >
                      {u.role === "admin" ? "Admin" : u.role === "empresa" ? "Empresa" : "Usuario"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        u.is_banned ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                      }
                    >
                      {u.is_banned ? "Baneado" : "Activo"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {u.is_banned ? (
                      <Badge className="bg-red-500/20 text-red-400">Bloqueado</Badge>
                    ) : chatMutedActive ? (
                      <Badge className="bg-orange-500/20 text-orange-400">
                        Mute hasta {chatDate ? format(chatDate, "dd/MM HH:mm") : "—"}
                      </Badge>
                    ) : u.chat_muted_until ? (
                      <Badge className="bg-white/10 text-gray-300">Mute expirado</Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400">OK</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {u.is_banned ? (
                      <Badge className="bg-red-500/20 text-red-400">Bloqueado</Badge>
                    ) : playBannedActive ? (
                      <Badge className="bg-red-500/20 text-red-400">
                        No jugar hasta {playDate ? format(playDate, "dd/MM HH:mm") : "—"}
                      </Badge>
                    ) : u.play_banned_until ? (
                      <Badge className="bg-white/10 text-gray-300">Bloqueo expirado</Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400">OK</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleUserBan(u)}
                        className={u.is_banned ? "text-green-400" : "text-red-400"}
                        disabled={u.email === user.email}
                        title={u.is_banned ? "Quitar ban cuenta" : "Ban cuenta"}
                      >
                        {u.is_banned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </Button>

                      {(u.chat_muted_until || chatMutedActive) && !u.is_banned && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => clearChatMute(u)}
                          className="text-green-400"
                          title="Quitar mute chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      )}

                      {(u.play_banned_until || playBannedActive) && !u.is_banned && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => clearPlayBan(u)}
                          className="text-green-400"
                          title="Quitar bloqueo de jugar"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}

                      {u.email !== user.email && (
                        <div className="flex gap-2">
                          {u.role !== "admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => changeUserRole(u, "admin")}
                              className="text-purple-400 hover:text-purple-300 text-xs"
                            >
                              → Admin
                            </Button>
                          )}
                          {u.role !== "empresa" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => changeUserRole(u, "empresa")}
                              className="text-cyan-400 hover:text-cyan-300 text-xs"
                            >
                              → Empresa
                            </Button>
                          )}
                          {u.role !== "user" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => changeUserRole(u, "user")}
                              className="text-gray-400 hover:text-gray-300 text-xs"
                            >
                              → Usuario
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function Admin() {
  const { user, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const { data: gamesData = {}, refetch: refetchGames } = useQuery({
    queryKey: ["adminGames"],
    queryFn: () => api.get("/games?limit=500&all=true"),
    enabled: user?.role === "admin"
  });
  const games = gamesData.games || [];

  const { data: users = [] } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => api.get("/users"),
    enabled: user?.role === "admin"
  });

  const toggleGameVisibility = async (game) => {
    await api.patch(`/games/${game.id}`, { is_active: !game.is_active });
    refetchGames();
    toast.success(game.is_active ? "Juego ocultado" : "Juego visible");
  };

  const toggleGameFeatured = async (game) => {
    await api.patch(`/games/${game.id}`, { is_featured: !game.is_featured });
    refetchGames();
    toast.success(game.is_featured ? "Quitado de destacados" : "Marcado como destacado");
  };

  const deleteGame = async (gameId) => {
    await api.delete(`/games/${gameId}`);
    refetchGames();
    toast.success("Juego eliminado");
  };

  const toggleUserBan = async (targetUser) => {
    await api.patch(`/users/${targetUser.id}`, { is_banned: !targetUser.is_banned });
    queryClient.invalidateQueries(["adminUsers"]);
    toast.success(targetUser.is_banned ? "Usuario desbaneado" : "Usuario baneado");
  };

  const parseDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const isActiveUntil = (iso) => {
    const d = parseDate(iso);
    return d && d > new Date();
  };

  const clearChatMute = async (targetUser) => {
    await api.patch(`/users/${targetUser.id}`, { chat_muted_until: null });
    queryClient.invalidateQueries(["adminUsers"]);
    toast.success("Silencio de chat eliminado");
  };

  const clearPlayBan = async (targetUser) => {
    await api.patch(`/users/${targetUser.id}`, { play_banned_until: null });
    queryClient.invalidateQueries(["adminUsers"]);
    toast.success("Bloqueo de jugar eliminado");
  };

  const changeUserRole = async (targetUser, newRole) => {
    await api.patch(`/users/${targetUser.id}`, { role: newRole });
    queryClient.invalidateQueries(["adminUsers"]);
    toast.success("Rol actualizado");
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
        <p className="text-gray-400 mb-6">
          Solo los administradores pueden acceder a esta sección
        </p>
        <Link to={createPageUrl("Home")}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            Volver al inicio
          </Button>
        </Link>
      </div>
    );
  }

  const totalPlays = games.reduce((sum, g) => sum + (g.plays_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Panel de Administración
          </h1>
          <p className="text-gray-400 mt-1">Gestiona juegos y usuarios</p>
        </div>
        <Link to={createPageUrl("UploadGame")}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            <Plus className="w-4 h-4 mr-2" />
            Subir Juego
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300">Usuarios</p>
                <p className="text-3xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="w-10 h-10 text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-900/10 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-300">Juegos</p>
                <p className="text-3xl font-bold text-white">{games.length}</p>
              </div>
              <Gamepad2 className="w-10 h-10 text-cyan-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Partidas totales</p>
                <p className="text-3xl font-bold text-white">{totalPlays}</p>
              </div>
              <Play className="w-10 h-10 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="games" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="games" className="data-[state=active]:bg-purple-600">
            <Gamepad2 className="w-4 h-4 mr-2" />
            Juegos
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">
            <Users className="w-4 h-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="data-[state=active]:bg-purple-600">
            <Trophy className="w-4 h-4 mr-2" />
            Torneos
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600">
            <Flag className="w-4 h-4 mr-2" />
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* Games Tab */}
        <TabsContent value="games">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Juegos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-gray-400">Juego</TableHead>
                      <TableHead className="text-gray-400">Categoría</TableHead>
                      <TableHead className="text-gray-400">Estado</TableHead>
                      <TableHead className="text-gray-400">Partidas</TableHead>
                      <TableHead className="text-gray-400">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((game) => (
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
                              <p className="text-xs text-gray-500">{game.publisher}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Badge className="bg-white/10 text-white">
                              {game.category}
                            </Badge>
                            {game.is_adult && (
                              <Badge className="bg-red-600/80 text-white">+18</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Badge className={game.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                              {game.is_active ? "Activo" : "Oculto"}
                            </Badge>
                            {game.is_featured && (
                              <Badge className="bg-yellow-500/20 text-yellow-400">
                                ⭐
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {game.plays_count || 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleGameFeatured(game)}
                              className={game.is_featured ? "text-yellow-400" : "text-gray-400 hover:text-white"}
                              title={game.is_featured ? "Quitar de destacados" : "Marcar como destacado"}
                            >
                              <Star className={`w-4 h-4 ${game.is_featured ? "fill-current" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleGameVisibility(game)}
                              className="text-gray-400 hover:text-white"
                            >
                              {game.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Link to={createPageUrl(`UploadGame?edit=${game.id}`)}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-white"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-[#0f0f18] border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">
                                    ¿Eliminar juego?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminarán también
                                    todas las puntuaciones y comentarios asociados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-white/5 border-white/10">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteGame(game.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersTabContent users={users} user={user} queryClient={queryClient} clearChatMute={clearChatMute} clearPlayBan={clearPlayBan} changeUserRole={changeUserRole} toggleUserBan={toggleUserBan} isActiveUntil={isActiveUntil} parseDate={parseDate} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tournaments">
          <TournamentsTab />
        </TabsContent>
        <TabsContent value="reports">
          <AdminReportsSection adminUser={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
