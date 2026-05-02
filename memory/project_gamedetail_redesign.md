---
name: Estado del proyecto PlayCraft
description: Progreso actual y próximos pasos del proyecto universitario PlayCraft
type: project
---

Sistema ELO completo implementado y funcionando:
- Endpoint genérico POST /api/elo/apply con modos "duel" (2 jugadores, fórmula FIDE) y "position" (3+ jugadores, puntos fijos por posición)
- Adaptador /api/elo/chess/:room_code idempotente para ajedrez
- Rangos con nombres y colores en src/lib/eloRanks.js (Novato → Gran Maestro)
- ELO visible en cards de jugadores (rating + rango abreviado con color)
- ELO visible en perfil con nombre del rango (solo si el juego tiene elo_enabled: true)
- Leaderboard ELO en página del juego
- Fix: ELO propio se actualiza en vivo tras terminar partida

**Why:** Proyecto universitario de plataforma de juegos multijugador (PlayCraft)
**How to apply:** El siguiente paso acordado es implementar el sistema de torneos, usando elo_min_rating del juego como requisito de entrada

Pendiente para próxima sesión:
1. Torneos — bracket automático, requisito ELO mínimo, gestión desde admin
2. Juego de 3+ jugadores para probar el layout de jugadores y modo "position" del ELO
3. Opciones de perfil — amistades, chat P2P, bloqueos
