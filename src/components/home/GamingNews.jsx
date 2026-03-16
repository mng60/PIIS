import React from "react";
import { Newspaper } from "lucide-react";
import { Card } from "@/components/ui/card";

// Las noticias gaming en tiempo real requerían la integración LLM de Base44.
// Aquí se puede conectar a una API de noticias (NewsAPI, GNews, etc.)
// o integrar el endpoint /api/news en el backend con Claude API.
export default function GamingNews() {
  return (
    <div className="relative">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <Newspaper className="w-7 h-7 text-purple-400" />
        Noticias Gaming
      </h2>
      <Card className="bg-white/5 border-white/10 p-8 text-center">
        <Newspaper className="w-12 h-12 mx-auto mb-3 text-purple-500/30" />
        <p className="text-gray-400">Sección de noticias próximamente</p>
        <p className="text-gray-600 text-sm mt-1">
          Conecta una API de noticias (NewsAPI, GNews) para mostrar noticias en tiempo real
        </p>
      </Card>
    </div>
  );
}
