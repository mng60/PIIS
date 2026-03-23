import React, { useEffect, useMemo, useState } from "react";
import { getAchievementDefinitions, getUserAchievements } from "@/api/achievements";
import { getGames } from "@/api/games";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Star, ChevronRight, ArrowLeft } from "lucide-react";
import { RARITY_CONFIG } from "@/lib/levels";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function UserAchievementsSection({ userEmail }) {
  const [selectedKey, setSelectedKey] = useState(null); // gameId o "__global__"
  const [filterMode, setFilterMode] = useState("all"); // all | completed | incomplete
  const [sortMode, setSortMode] = useState("default"); // default | name | completed | incomplete

  const { data: userAchievements = [] } = useQuery({
    queryKey: ["userAchievementsAll", userEmail],
    queryFn: getUserAchievements,
    enabled: !!userEmail,
  });

  const { data: definitions = [] } = useQuery({
    queryKey: ["allAchievementDefs"],
    queryFn: () => getAchievementDefinitions(),
    enabled: !!userEmail,
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games-for-achievements"],
    queryFn: async () => { const r = await getGames("?limit=200"); return r.games || []; },
    enabled: !!userEmail,
  });

  const uaByAchId = useMemo(() => {
    const m = new Map();
    userAchievements.forEach((ua) => m.set(ua.achievement_id, ua));
    return m;
  }, [userAchievements]);

  const gameById = useMemo(() => {
    const m = new Map();
    games.forEach((g) => m.set(g.id, g));
    return m;
  }, [games]);

  const groups = useMemo(() => {
    if (definitions.length === 0) return [];

    const by = new Map(); // key -> defs[]
    for (const def of definitions) {
      const key = def.game_id ? def.game_id : "__global__";
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(def);
    }

    const arr = [];
    for (const [key, defs] of by.entries()) {
      defs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const total = defs.length;
      const completed = defs.reduce(
        (acc, d) => acc + (uaByAchId.get(d.id)?.unlocked ? 1 : 0),
        0
      );

      const name =
        key === "__global__"
          ? "Generales"
          : (gameById.get(key)?.title || gameById.get(key)?.name || "Juego");

      arr.push({ key, name, defs, total, completed });
    }

    arr.sort((a, b) => {
      if (a.key === "__global__") return 1;
      if (b.key === "__global__") return -1;
      return a.name.localeCompare(b.name);
    });

    return arr;
  }, [definitions, uaByAchId, gameById]);

  const totalUnlocked = userAchievements.filter((ua) => ua.unlocked).length;

  const selectedGroup = useMemo(() => {
    if (!selectedKey) return null;
    return groups.find((g) => g.key === selectedKey) || null;
  }, [selectedKey, groups]);

  // ✅ BLOQUEA SCROLL DEL BODY cuando hay overlay abierto
  useEffect(() => {
    if (!selectedGroup) return;

    const scrollY = window.scrollY;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflowY: document.body.style.overflowY,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflowY = "scroll";

    return () => {
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      document.body.style.overflowY = prev.overflowY;
      window.scrollTo(0, scrollY);
    };
  }, [selectedGroup]);

  const filteredSortedDefs = useMemo(() => {
    if (!selectedGroup) return [];

    let list = [...selectedGroup.defs];

    // filter
    if (filterMode !== "all") {
      list = list.filter((def) => {
        const unlocked = !!uaByAchId.get(def.id)?.unlocked;
        return filterMode === "completed" ? unlocked : !unlocked;
      });
    }

    // sort
    const sortDefault = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);

    if (sortMode === "default") {
      list.sort(sortDefault);
    } else if (sortMode === "name") {
      list.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""))
      );
    } else if (sortMode === "completed") {
      list.sort((a, b) => {
        const au = !!uaByAchId.get(a.id)?.unlocked;
        const bu = !!uaByAchId.get(b.id)?.unlocked;
        if (au !== bu) return bu - au;
        return sortDefault(a, b);
      });
    } else if (sortMode === "incomplete") {
      list.sort((a, b) => {
        const au = !!uaByAchId.get(a.id)?.unlocked;
        const bu = !!uaByAchId.get(b.id)?.unlocked;
        if (au !== bu) return au - bu;
        return sortDefault(a, b);
      });
    }

    return list;
  }, [selectedGroup, filterMode, sortMode, uaByAchId]);

  if (!userEmail) return null;
  if (definitions.length === 0) return null;

  // -------------------------
  // Vista detalle (overlay con scroll propio)
  // -------------------------
  if (selectedGroup) {
    return (
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex flex-col">
        {/* HEADER FIJO */}
        <div className="pt-24 px-4 pb-4 border-b border-white/10 bg-black/30 backdrop-blur">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => {
                  setSelectedKey(null);
                  setFilterMode("all");
                  setSortMode("default");
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>

              <div className="flex-1 text-center min-w-0">
                <h2 className="text-white font-bold text-lg truncate">
                  {selectedGroup.name}
                </h2>
                <p className="text-xs text-gray-300 mt-0.5">
                  {selectedGroup.completed}/{selectedGroup.total} completados
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={filterMode} onValueChange={setFilterMode}>
                  <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Mostrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mostrar: todos</SelectItem>
                    <SelectItem value="completed">Mostrar: completados</SelectItem>
                    <SelectItem value="incomplete">Mostrar: no completados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortMode} onValueChange={setSortMode}>
                  <SelectTrigger className="w-[190px] bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Orden: por defecto</SelectItem>
                    <SelectItem value="name">Orden: por nombre</SelectItem>
                    <SelectItem value="completed">Orden: completados primero</SelectItem>
                    <SelectItem value="incomplete">Orden: no completados primero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* LISTA CON SCROLL PROPIO */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10" style={{ scrollbarGutter: "stable" }}>
          <div className="max-w-5xl mx-auto space-y-3 pt-4">
            {filteredSortedDefs.map((def) => {
              const ua = uaByAchId.get(def.id);
              const unlocked = !!ua?.unlocked;

              const threshold = Number(def.threshold || 0);
              const rawProgress = Number(ua?.progress || 0);

              // cap en UI
              const displayProgress =
                threshold > 0 ? Math.min(rawProgress, threshold) : rawProgress;

              const pct =
                threshold > 0
                  ? Math.min(100, Math.round((displayProgress / threshold) * 100))
                  : 0;

              const cfg = RARITY_CONFIG[def.rarity ?? 'bronze'];
              return (
                <div
                  key={def.id}
                  className="flex items-start gap-3 p-4 rounded-xl border"
                  style={unlocked
                    ? { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }
                    : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className={`flex-shrink-0 ${!unlocked ? "opacity-30" : ""}`}>
                    {def.icon_url ? (
                      <img src={def.icon_url} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <Trophy className="w-9 h-9" style={{ color: unlocked ? cfg.color : '#6b7280' }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate" style={unlocked ? { color: cfg.color } : { color: 'white' }}>
                        {def.title}
                      </p>
                      {unlocked && (
                        <Star className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color, fill: cfg.color }} />
                      )}
                    </div>

                    {def.description && (
                      <p className="text-sm text-gray-300/80 mt-1">{def.description}</p>
                    )}

                    {threshold > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-300/70 mb-1">
                          <span>{Math.floor(displayProgress)} / {threshold}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: unlocked ? cfg.color : '#a855f7' }}
                          />
                        </div>
                      </div>
                    )}

                    {unlocked && ua?.unlocked_date && (
                      <p className="text-xs text-gray-300/60 mt-2">
                        Completado el{" "}
                        {format(new Date(ua.unlocked_date), "d MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredSortedDefs.length === 0 && (
              <div className="text-center text-gray-300/70 py-10">
                No hay logros con este filtro.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------
  // Vista resumen (por juegos)
  // -------------------------
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Mis logros
          {totalUnlocked > 0 && (
            <span className="ml-2 text-sm font-normal text-yellow-400">
              {totalUnlocked} desbloqueado{totalUnlocked !== 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setSelectedKey(g.key)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-white/10 bg-white/3 hover:bg-white/5 transition"
          >
            <div className="min-w-0 text-left">
              <p className="text-white font-semibold truncate">{g.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {g.completed}/{g.total} logros completados
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}