import React, { useState, useEffect } from "react";
import { Newspaper, ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GamingNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Dame 6 noticias recientes y relevantes del mundo gaming (videojuegos, esports, industria). 
        Incluye solo noticias reales de los últimos días.
        Para cada noticia proporciona: título corto (max 70 caracteres), descripción breve (max 130 caracteres), URL real de la fuente, y URL de una imagen representativa (busca una imagen real relacionada).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            news: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  url: { type: "string" },
                  image_url: { type: "string" }
                }
              }
            }
          }
        }
      });
      setNews(response.news || []);
    } catch (error) {
      console.error("Error loading news:", error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      const container = scrollRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      if (direction === "right" && container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else if (direction === "left" && container.scrollLeft <= 10) {
        container.scrollTo({ left: maxScroll, behavior: "smooth" });
      } else {
        container.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <div className="relative">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <Newspaper className="w-7 h-7 text-purple-400" />
        Noticias Gaming
      </h2>
      
      {news.length > 2 && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="absolute -left-12 top-[60%] -translate-y-1/2 z-10 border-current bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="absolute -right-12 top-[60%] -translate-y-1/2 z-10 border-current bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : news.length === 0 ? (
        <Card className="bg-white/5 border-white/10 p-8 text-center">
          <p className="text-gray-400">No hay noticias disponibles en este momento</p>
        </Card>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {news.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-shrink-0 w-80"
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 overflow-hidden h-full">
                <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-cyan-900/30 overflow-hidden relative flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!item.image_url && (
                    <Newspaper className="w-16 h-16 text-purple-500/30" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 flex-1">
                      {item.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3">
                    {item.description}
                  </p>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}