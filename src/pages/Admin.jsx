import React, { useState, useMemo } from "react";
import { getGames } from "@/api/games";
import { getUsers } from "@/api/users";
import { getTickets, resolveTicket } from "@/api/tickets";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Loader2, Shield, Users, Gamepad2, Plus, Play, Trophy, Flag, Ticket, CheckCheck, KeyRound, SlidersHorizontal, X,
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
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AdminReportsSection from "@/components/moderation/AdminReportsSection";
import TournamentsTab from "@/components/admin/TournamentsTab";
import UserManageDialog from "@/components/admin/UserManageDialog";
import GameManageDialog from "@/components/admin/GameManageDialog";

// ── Tickets tab ────────────────────────────────────────────────────────────

function TicketsTab({ users, currentUser }) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [filter, setFilter] = useState("open");
  const [resolving, setResolving] = useState(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["adminTickets", filter],
    queryFn: () => getTickets(filter),
  });

  const handleResolve = async (ticket) => {
    setResolving(ticket.id);
    try {
      await resolveTicket(ticket.id);
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      toast.success("Ticket marcado como resuelto");
    } catch {
      toast.error("Error al resolver el ticket");
    } finally {
      setResolving(null);
    }
  };

  const openUserDialog = (ticket) => {
    const user = users.find(u => u.email === ticket.user_email);
    if (user) {
      setSelectedUser(user);
    } else {
      toast.error("Usuario no encontrado en el sistema");
    }
  };

  return (
    <>
      {selectedUser && (
        <UserManageDialog
          targetUser={selectedUser}
          currentUser={currentUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant={filter === "open" ? "default" : "outline"}
          onClick={() => setFilter("open")}
          className={filter === "open"
            ? "bg-purple-600 hover:bg-purple-700"
            : "border-white/10 text-gray-300 hover:text-white hover:bg-white/5"}
        >
          Pendientes
        </Button>
        <Button
          size="sm"
          variant={filter === "resolved" ? "default" : "outline"}
          onClick={() => setFilter("resolved")}
          className={filter === "resolved"
            ? "bg-purple-600 hover:bg-purple-700"
            : "border-white/10 text-gray-300 hover:text-white hover:bg-white/5"}
        >
          Resueltos
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay tickets {filter === "open" ? "pendientes" : "resueltos"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-gray-400">Usuario</TableHead>
                <TableHead className="text-gray-400">Identificador</TableHead>
                <TableHead className="text-gray-400">Solicitado</TableHead>
                {filter === "resolved" && (
                  <TableHead className="text-gray-400">Resuelto por</TableHead>
                )}
                <TableHead className="text-gray-400 w-48" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map(ticket => (
                <TableRow key={ticket.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="font-medium text-white">
                    {ticket.user_name || "—"}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {ticket.user_email.replace("@playcraft.com", "")}
                    <span className="text-gray-600">@playcraft.com</span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(ticket.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </TableCell>
                  {filter === "resolved" && (
                    <TableCell className="text-gray-500 text-sm">
                      {ticket.resolved_by
                        ? ticket.resolved_by.replace("@playcraft.com", "")
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUserDialog(ticket)}
                        className="h-7 text-xs border-white/10 text-gray-300 hover:text-white hover:bg-white/5 gap-1"
                      >
                        <KeyRound className="w-3 h-3" />
                        Gestionar
                      </Button>
                      {filter === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve(ticket)}
                          disabled={resolving === ticket.id}
                          className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1"
                        >
                          {resolving === ticket.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCheck className="w-3 h-3" />}
                          Resolver
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

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
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterAdult, setFilterAdult] = useState("all");
  const [filterFeatured, setFilterFeatured] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Valores temporales dentro del modal (se aplican al cerrar con "Aplicar")
  const [tmpCategory, setTmpCategory] = useState("all");
  const [tmpState, setTmpState] = useState("all");
  const [tmpType, setTmpType] = useState("all");
  const [tmpAdult, setTmpAdult] = useState("all");
  const [tmpFeatured, setTmpFeatured] = useState("all");

  const categories = useMemo(() =>
    [...new Set(games.map(g => g.category).filter(Boolean))].sort()
  , [games]);

  const filtered = useMemo(() => {
    return games.filter(g => {
      if (search.trim() && !g.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== "all" && g.category !== filterCategory) return false;
      if (filterState === "active" && !g.is_active) return false;
      if (filterState === "hidden" && g.is_active) return false;
      if (filterType === "multi" && !g.is_multiplayer) return false;
      if (filterType === "single" && g.is_multiplayer) return false;
      if (filterAdult === "yes" && !g.is_adult) return false;
      if (filterAdult === "no" && g.is_adult) return false;
      if (filterFeatured === "yes" && !g.is_featured) return false;
      if (filterFeatured === "no" && g.is_featured) return false;
      return true;
    });
  }, [games, search, filterCategory, filterState, filterType, filterAdult, filterFeatured]);

  const activeFilters = [
    filterCategory !== "all" && { key: "category", label: filterCategory,                                    clear: () => setFilterCategory("all") },
    filterState    !== "all" && { key: "state",    label: filterState    === "active" ? "Activo" : "Oculto",  clear: () => setFilterState("all") },
    filterType     !== "all" && { key: "type",     label: filterType     === "multi"  ? "Multijugador" : "Un jugador", clear: () => setFilterType("all") },
    filterAdult    !== "all" && { key: "adult",    label: filterAdult    === "yes"    ? "+18" : "Sin +18",     clear: () => setFilterAdult("all") },
    filterFeatured !== "all" && { key: "featured", label: filterFeatured === "yes"    ? "Destacados" : "No destacados", clear: () => setFilterFeatured("all") },
  ].filter(Boolean);

  const openFilters = () => {
    setTmpCategory(filterCategory);
    setTmpState(filterState);
    setTmpType(filterType);
    setTmpAdult(filterAdult);
    setTmpFeatured(filterFeatured);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setFilterCategory(tmpCategory);
    setFilterState(tmpState);
    setFilterType(tmpType);
    setFilterAdult(tmpAdult);
    setFilterFeatured(tmpFeatured);
    setFiltersOpen(false);
  };

  const clearAll = () => {
    setTmpCategory("all");
    setTmpState("all");
    setTmpType("all");
    setTmpAdult("all");
    setTmpFeatured("all");
  };

  return (
    <>
      {selected && (
        <GameManageDialog
          game={selected}
          isAdmin
          onClose={() => setSelected(null)}
        />
      )}

      {/* Modal de filtros */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Categoría</label>
              <Select value={tmpCategory} onValueChange={setTmpCategory}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Estado</label>
              <Select value={tmpState} onValueChange={setTmpState}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="hidden">Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Tipo</label>
              <Select value={tmpType} onValueChange={setTmpType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="multi">Multijugador</SelectItem>
                  <SelectItem value="single">Un jugador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Contenido +18</label>
              <Select value={tmpAdult} onValueChange={setTmpAdult}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Solo +18</SelectItem>
                  <SelectItem value="no">Sin +18</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Destacados</label>
              <Select value={tmpFeatured} onValueChange={setTmpFeatured}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Solo destacados</SelectItem>
                  <SelectItem value="no">No destacados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={clearAll} className="text-gray-400 hover:text-white">
              Limpiar filtros
            </Button>
            <Button onClick={applyFilters} className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90">
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barra de búsqueda + botón filtros */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button
          variant="outline"
          onClick={openFilters}
          className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5 gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFilters.length > 0 && (
            <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Chips de filtros activos */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map(f => (
            <span key={f.key} className="flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs px-2.5 py-1 rounded-full">
              {f.label}
              <button type="button" onClick={f.clear} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
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
            {filtered.map(game => (
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
          <TabsTrigger value="tickets" className="data-[state=active]:bg-purple-600">
            <Ticket className="w-4 h-4 mr-2" />Tickets
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

        <TabsContent value="tickets">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Tickets de recuperación de contraseña</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketsTab users={users} currentUser={user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <AdminReportsSection adminUser={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
