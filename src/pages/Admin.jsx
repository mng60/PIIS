import React, { useState, useMemo } from "react";
import { getGames } from "@/api/games";
import { getUsers } from "@/api/users";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Loader2, Shield, Users, Gamepad2, Plus, Play, Star, Trophy, Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import AdminReportsSection from "@/components/moderation/AdminReportsSection";
import TournamentsTab from "@/components/admin/TournamentsTab";
import UserManageDialog from "@/components/admin/UserManageDialog";
import GameManageDialog from "@/components/admin/GameManageDialog";

// ── Users tab ──────────────────────────────────────────────────────────────

function UsersTab({ users, currentUser }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <>
      {selected && (
        <UserManageDialog
          targetUser={selected}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre o identificador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-gray-400">Usuario</TableHead>
              <TableHead className="text-gray-400">Identificador</TableHead>
              <TableHead className="text-gray-400">Rol</TableHead>
              <TableHead className="text-gray-400">Estado</TableHead>
              <TableHead className="text-gray-400 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell className="font-medium text-white">
                  {u.full_name || "Sin nombre"}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {u.email.replace("@playcraft.com", "")}
                  <span className="text-gray-600">@playcraft.com</span>
                </TableCell>
                <TableCell>
                  <Badge className={
                    u.role === "admin" ? "bg-purple-500/20 text-purple-400" :
                    u.role === "empresa" ? "bg-cyan-500/20 text-cyan-400" :
                    "bg-white/10 text-white"
                  }>
                    {u.role === "admin" ? "Admin" : u.role === "empresa" ? "Empresa" : "Usuario"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={u.is_banned ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
                    {u.is_banned ? "Desactivado" : "Activo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline"
                    onClick={() => setSelected(u)}
                    className="h-7 text-xs border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
                    Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ── Games tab ──────────────────────────────────────────────────────────────

function GamesTab({ games }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      {selected && (
        <GameManageDialog
          game={selected}
          isAdmin
          onClose={() => setSelected(null)}
        />
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-gray-400">Juego</TableHead>
              <TableHead className="text-gray-400">Categoría</TableHead>
              <TableHead className="text-gray-400">Estado</TableHead>
              <TableHead className="text-gray-400">Partidas</TableHead>
              <TableHead className="text-gray-400 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map(game => (
              <TableRow key={game.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <Gamepad2 className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white text-sm">{game.title}</p>
                      <p className="text-xs text-gray-500">{game.publisher}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Badge className="bg-white/10 text-white text-xs">{game.category}</Badge>
                    {game.is_adult && <Badge className="bg-red-600/80 text-white text-xs">+18</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Badge className={game.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                      {game.is_active ? "Activo" : "Oculto"}
                    </Badge>
                    {game.is_featured && (
                      <Badge className="bg-yellow-500/20 text-yellow-400">⭐</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {game.plays_count || 0}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline"
                    onClick={() => setSelected(game)}
                    className="h-7 text-xs border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
                    Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function Admin() {
  const { user, isLoadingAuth } = useAuth();

  const { data: gamesData = {} } = useQuery({
    queryKey: ["adminGames"],
    queryFn: () => getGames("?limit=500&all=true"),
    enabled: user?.role === "admin",
  });
  const games = gamesData.games || [];

  const { data: users = [] } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: getUsers,
    enabled: user?.role === "admin",
  });

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
        <p className="text-gray-400 mb-6">Solo los administradores pueden acceder a esta sección</p>
        <Link to="/"><Button className="bg-gradient-to-r from-purple-600 to-cyan-500">Volver al inicio</Button></Link>
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
        <Link to="/upload-game">
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            <Plus className="w-4 h-4 mr-2" />
            Subir Juego
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border-purple-500/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">Usuarios</p>
              <p className="text-3xl font-bold text-white">{users.length}</p>
            </div>
            <Users className="w-10 h-10 text-purple-400 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-900/10 border-cyan-500/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-cyan-300">Juegos</p>
              <p className="text-3xl font-bold text-white">{games.length}</p>
            </div>
            <Gamepad2 className="w-10 h-10 text-cyan-400 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-300">Partidas totales</p>
              <p className="text-3xl font-bold text-white">{totalPlays}</p>
            </div>
            <Play className="w-10 h-10 text-green-400 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="games" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="games" className="data-[state=active]:bg-purple-600">
            <Gamepad2 className="w-4 h-4 mr-2" />Juegos
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">
            <Users className="w-4 h-4 mr-2" />Usuarios
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="data-[state=active]:bg-purple-600">
            <Trophy className="w-4 h-4 mr-2" />Torneos
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600">
            <Flag className="w-4 h-4 mr-2" />Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Juegos</CardTitle>
            </CardHeader>
            <CardContent>
              <GamesTab games={games} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersTab users={users} currentUser={user} />
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
