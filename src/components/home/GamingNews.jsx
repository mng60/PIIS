import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getNews } from "@/api/news";
import { Newspaper, ExternalLink, Calendar } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

function formatDate(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    return isValid(d) ? format(d, "d MMM yyyy", { locale: es }) : null;
  } catch {
    return null;
  }
}

function NewsCard({ item }) {
  const date = formatDate(item.date);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/40 hover:bg-white/[0.07] transition-all duration-200"
    >
      {/* Imagen */}
      <div className="aspect-video bg-gradient-to-br from-purple-900/40 to-cyan-900/40 overflow-hidden shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="w-8 h-8 text-purple-500/30" />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">
            {item.source}
          </span>
          {date && (
            <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" />
              {date}
            </span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
            {item.summary}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center gap-1 text-xs text-gray-500 group-hover:text-purple-400 transition-colors">
          <ExternalLink className="w-3 h-3" />
          Leer artículo
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/10" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-white/10 rounded w-1/3" />
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-4/5" />
        <div className="h-3 bg-white/10 rounded w-full mt-2" />
        <div className="h-3 bg-white/10 rounded w-3/4" />
      </div>
    </div>
  );
}

export default function GamingNews() {
  const { data: news = [], isLoading, isError } = useQuery({
    queryKey: ["gamingNews"],
    queryFn: getNews,
    staleTime: 15 * 60 * 1000, // 15 min (el servidor cachea 20 min)
    retry: 1,
  });

  return (
    <div className="relative">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <Newspaper className="w-7 h-7 text-purple-400" />
        Noticias Gaming
      </h2>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {isError && (
        <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-purple-500/30" />
          <p className="text-gray-400 text-sm">No se pudieron cargar las noticias</p>
        </div>
      )}

      {!isLoading && !isError && news.length === 0 && (
        <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-purple-500/30" />
          <p className="text-gray-400 text-sm">Sin noticias disponibles por ahora</p>
        </div>
      )}

      {!isLoading && news.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {news.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
