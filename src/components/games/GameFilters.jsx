import React from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const categories = [
  { value: "all", label: "Todos" },
  { value: "accion", label: "Acción" },
  { value: "puzzle", label: "Puzzle" },
  { value: "arcade", label: "Arcade" },
  { value: "estrategia", label: "Estrategia" }
];

export default function GameFilters({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Buscar juegos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 h-12 rounded-xl"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant="ghost"
            onClick={() => setSelectedCategory(cat.value)}
            className={`shrink-0 rounded-xl px-4 h-12 transition-all ${
              selectedCategory === cat.value
                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {cat.label}
          </Button>
        ))}
      </div>
    </div>
  );
}