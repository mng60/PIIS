# PlayCraft

Plataforma de juegos web — Proyecto Universitario PIIS.

## Producción

| | URL |
|---|---|
| **Frontend** | https://playcraft-sigma.vercel.app |
| **API** | https://piis-production.up.railway.app/api |

## Infraestructura

| Servicio | Plataforma | Descripción |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Deploy automático desde `main` |
| Backend | [Railway](https://railway.app) | Directorio raíz: `server/` |
| Base de datos | [Neon](https://neon.tech) | PostgreSQL serverless |
| Imágenes | [Cloudinary](https://cloudinary.com) | Cloud name: `dchurarst` |

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + Prisma ORM
- **Base de datos:** PostgreSQL (Neon)
- **Auth:** JWT (localStorage)

---

## Puesta en marcha

No hace falta instalar PostgreSQL. Cada uno que use su propia base de datos con Neon.

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd PIIS
```

### 2. Instalar dependencias

```bash
# Frontend (raíz del proyecto)
npm install

# Backend
cd server && npm install
```

### 3. Crear tu base de datos en Neon

1. Entra en [neon.tech](https://neon.tech) y crea una cuenta gratuita.
2. Crea un nuevo proyecto (el nombre da igual).
3. En el dashboard del proyecto, ve a **Connection Details** y copia la **Connection string**. Tiene este aspecto:
   ```
   postgresql://usuario:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   Esa cadena es tu `DATABASE_URL`.

### 4. Variables de entorno

**Frontend** — crea `.env` en la raíz del proyecto:

```env
VITE_API_URL="http://localhost:3001/api"
```

**Backend** — crea `server/.env` (no commitear nunca este archivo):

```env
DATABASE_URL="postgresql://usuario:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="una_clave_secreta_larga"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

Sustituye `DATABASE_URL` por la connection string que copiaste de Neon.

### 5. Inicializar la base de datos

```bash
cd server
npx prisma db push   # crea todas las tablas en tu BD de Neon
node prisma/seed.js  # rellena los datos de desarrollo
```

El seed hace dos cosas:

1. **Crea 3 usuarios de prueba** — solo existen en tu BD local, no en producción:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@playcraft.com | admin123 |
| Usuario | usuario@playcraft.com | user1234 |
| Empresa | empresa@playcraft.com | empresa123 |

2. **Importa los juegos de producción** — descarga todos los juegos de la API de prod y los inserta en tu BD con `plays_count`, `rating_sum` y `rating_count` a 0. Los scores y comentarios de prod no se importan, así que esos contadores no tendrían sentido. Si ya tienes los juegos y vuelves a ejecutar el seed, solo actualiza los campos de contenido sin tocar tus contadores locales.

El resto de tablas (`Comment`, `Favorite`, `Tournament`, `GameSession`, `ChessRoom`, `ChatMessage`, `Report`, `UserAchievement`…) se quedan vacías y se van rellenando mientras pruebas en local.

### 6. Arrancar

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api

---

## Estructura del proyecto

```
PIIS/
├── src/
│   ├── pages/                   # Páginas (coordinan datos + componentes)
│   ├── components/
│   │   ├── game-detail/         # GameArea, GameHeader
│   │   ├── games/               # GameCard, Leaderboard, ChatSection, etc.
│   │   ├── home/                # Secciones de la home (torneos, carrusel…)
│   │   ├── admin/               # Panel de administración (TournamentsTab…)
│   │   ├── moderation/          # ReportDialog, AdminReportsSection
│   │   └── ui/                  # shadcn/ui (no modificar)
│   ├── hooks/
│   │   ├── useGameDetail.js      # fetching de juego, scores, comentarios, favoritos
│   │   ├── useSinglePlayerGame.js# ciclo idle→playing→gameover para juegos single
│   │   ├── useTurnGameRelay.js   # BASE activa de multijugador: sincroniza iframe + /sessions
│   │   ├── useChessGame.js       # capa específica de ajedrez sobre useTurnGameRelay
│   │   └── useGameRoom.js        # alternativa React sin iframe (disponible, sin uso actual)
│   ├── api/                     # Capa API por dominio (un archivo por endpoint)
│   └── lib/                     # AuthContext, query-client, utilidades
└── server/
    ├── src/
    │   ├── routes/              # Endpoints Express
    │   └── middleware/          # Auth JWT
    └── prisma/                  # Schema y migraciones
```

---

## Capa API (`src/api/`)

Cada módulo agrupa las llamadas HTTP de un dominio. Las páginas y hooks importan desde aquí.

| Módulo | Funciones principales |
|--------|----------------------|
| `client.js` | `api.get/post/patch/delete` — cliente HTTP base con JWT |
| `games.js` | `getGames`, `getGameById`, `getMyGames`, `createGame`, `updateGame`, `deleteGame`, `recordPlay` |
| `scores.js` | `getGameScores`, `getUserScores`, `getUserGameScores`, `submitScore` |
| `comments.js` | `getGameComments`, `addComment`, `deleteComment` |
| `favorites.js` | `getFavorites`, `addFavorite`, `removeFavorite` |
| `sessions.js` | `createSession`, `getSession`, `updateSession`, `deleteSession` |
| `users.js` | `getUsers`, `updateUser`, `updateMe` |
| `achievements.js` | `getAchievementDefinitions`, `createAchievementDefinition`, `updateAchievementDefinition`, `deleteAchievementDefinition`, `getUserAchievements`, `upsertUserAchievement` |
| `chess.js` | `createChessRoom`, `getChessRoom`, `updateChessRoom`, `deleteChessRoom`, `getMyActiveChessGames` |
| `tournaments.js` | `getTournaments`, `createTournament`, `updateTournament`, `deleteTournament` |
| `chat.js` | `getChatMessages`, `sendChatMessage`, `deleteChatMessage` |
| `reports.js` | `getReports`, `createReport`, `updateReport` |

> `src/lib/AuthContext.jsx` usa `api` directamente porque gestiona el token JWT y
> el estado React de sesión de forma acoplada. Es la única excepción intencionada.

---

## Hooks (`src/hooks/`)

Los cinco hooks se dividen en tres roles:

| Rol | Hook |
|-----|------|
| Datos del detalle de juego | `useGameDetail` |
| Ciclo de vida single-player | `useSinglePlayerGame` |
| **Multijugador activo** — sincronización iframe | `useTurnGameRelay` ← base |
| **Multijugador activo** — protocolo de ajedrez | `useChessGame` ← capa sobre la base |
| Multijugador alternativo sin iframe | `useGameRoom` *(sin uso actual)* |

---

### `useGameDetail` — fetching del detalle de juego

Centraliza las 4 queries de React Query para una página de juego: datos del juego,
marcadores, comentarios y favoritos. Expone además `toggleFavorite` e `invalidateGame`.

```
GameDetail.jsx
  └── useGameDetail(gameId, user)
        ├── api/games      → getGameById
        ├── api/scores     → getGameScores
        ├── api/comments   → getGameComments
        └── api/favorites  → getFavorites, addFavorite, removeFavorite
```

---

### `useSinglePlayerGame` — ciclo de juego de un jugador

Gestiona el ciclo `idle → playing → gameover`, el marcador y el récord personal
(localStorage). No hace llamadas HTTP; recibe un callback `onScoreUpdate` para que
el componente decida qué hacer con la puntuación final.

Devuelve: `gameState`, `score`, `highScore`, `scoreRef`, `startGame`, `addPoints`,
`endGame`, `resetGame`.

Usado en: `SnakeGame.jsx`. `PongGame.jsx` gestiona su propio estado con `useState`.

---

### `useTurnGameRelay` — base activa de multijugador por turnos

**Es el hook que implementa el multijugador en el proyecto.** Gestiona el ciclo
completo de sala vía `postMessage` + polling contra `/sessions`:

| Mensaje entrante | Acción |
|-----------------|--------|
| `CREATE_ROOM` | Crea sesión en BD, responde `ROOM_CREATED` al iframe |
| `JOIN_ROOM` | Valida sala, une al guest, responde al iframe |
| `[actionType]` | Persiste la acción en `game_state.actions` |

El polling cada 1.5 s entrega al iframe las acciones del oponente que aún no ha
recibido. El comportamiento específico de cada juego se inyecta vía callbacks:

```js
const { moveHistory } = useTurnGameRelay({
  isPlaying, user, gameId, iframeRef, onRoomCodeChange,

  actionType,            // tipo de mensaje que representa una acción (ej. 'CHESS_MOVE')
  extractAction,         // (msg) => objeto a persistir
  buildOpponentMessage,  // (action) => payload de postMessage al oponente

  // Opcional: si se proporciona, el hook acumula el historial de jugadas
  formatMoveLabel,       // (action) => string — etiqueta legible por jugada

  onGuestJoined,         // (session, iframeRef, user) => void — info al guest al unirse
  onHostGameStart,       // (session, iframeRef, user) => void — info al host cuando empieza
})
// moveHistory: Array<{ move: string, player: 'host'|'guest' }>
// Contiene las jugadas de ambos jugadores en orden de llegada.
// Solo se rellena si se pasa formatMoveLabel.
```

---

### `useChessGame` — capa específica de ajedrez sobre el relay

Thin wrapper de `useTurnGameRelay` que fija el protocolo de mensajes para ajedrez
embebido en iframe:

- Acción persistida: `CHESS_MOVE` → `{ from, to, promo }`
- Mensaje al oponente: `CHESS_OPPONENT_MOVE`
- Al guest: `PLAYER_INFO { color: 'black', ... }`
- Al host (cuando empieza): `PLAYER_INFO { color: 'white', ... }`

```
GameArea.jsx
  └── useChessGame({ isPlaying, user, gameId, iframeRef, onRoomCodeChange })
        └── useTurnGameRelay(...)
              └── api/sessions.js  →  /sessions
```

> **Nota:** `ChessOnlineGame.jsx` (accesible por `game_code === 'chess-online'`) es un
> componente React independiente que usa `api/chess.js` → `/chess` directamente, sin
> pasar por este relay. Son dos implementaciones distintas que coexisten.

---

### `useGameRoom` — sala React sin iframe *(sin uso actual)*

Hook para juegos multijugador implementados como componentes React propios (sin
iframe). Gestiona lobby → espera → partida → finalización usando `api/sessions.js`.

**Ningún componente lo importa actualmente.** Está disponible si en el futuro se
implementa un juego de mesa como componente React propio en lugar de iframe.

---

## Añadir un juego multijugador por turnos

El camino activo es el iframe relay. Crea un hook que envuelva `useTurnGameRelay`
con el protocolo de mensajes de tu juego:

```js
// src/hooks/useDominoGame.js
import { useTurnGameRelay } from './useTurnGameRelay';

export function useDominoGame({ isPlaying, user, gameId, iframeRef, onRoomCodeChange }) {
  return useTurnGameRelay({
    isPlaying, user, gameId, iframeRef, onRoomCodeChange,
    actionType: 'DOMINO_PLACE',
    extractAction:        (msg)    => ({ piece: msg.piece, position: msg.position }),
    buildOpponentMessage: (action) => ({ type: 'OPPONENT_PLACED', ...action }),

    // Opcional: activa el historial de jugadas
    formatMoveLabel: (action) => `Ficha ${action.piece} en ${action.position}`,

    onGuestJoined:    (session, ref, user) => { /* postMessage con info del jugador */ },
    onHostGameStart:  (session, ref, user) => { /* postMessage con info del jugador */ },
  });
}
```

El hook devuelve `{ moveHistory }` — pásalo a `<OnlineGameMoveHistory moves={moveHistory} />` para mostrar el historial. Si no necesitas historial, omite `formatMoveLabel` y el array no se acumula.

Llama al hook en `GameArea.jsx` igual que `useChessGame`. El iframe debe enviar
`CREATE_ROOM` o `JOIN_ROOM` para arrancar la sala, y el `actionType` configurado
para cada acción de juego.

> Para juegos React sin iframe existe `useGameRoom`, pero no tiene ninguna
> implementación activa en el proyecto.

---

## Sistema de gamificación

### Niveles

El nivel del usuario se calcula en tiempo real a partir de su XP acumulado. No se guarda en la BD; se deriva con `getLevelFromXP(xp)` en `src/lib/levels.js`.

| Nivel | Nombre | XP requerida | Color |
|-------|--------|-------------|-------|
| 1 | Novato | 0 | Gris |
| 2 | Casual | 200 | Cyan |
| 3 | Veterano | 1 000 | Morado |
| 4 | Maestro | 4 000 | Ámbar |
| 5 | Leyenda | 12 000 | Rosa |

### Fuentes de XP

| Fuente | XP |
|--------|----|
| Jugar una partida | `xp_per_play` del juego (defecto: 10) |
| Score de la partida (solo juegos no multijugador) | `floor(score / 100)` |
| Desbloquear logro Bronce | +25 |
| Desbloquear logro Plata | +75 |
| Desbloquear logro Oro | +200 |

> El XP por partida es configurable por juego desde el panel admin (`xp_per_play`). Útil para dar más XP a juegos complejos (Catan, Ajedrez) que a juegos cortos (Snake).
>
> Los juegos multijugador locales con `show_leaderboard=false` + `show_achievements=false` usan **modo minimal**: solo guardan `plays_count` y `time_played`, sin score ni logros. Aun así suman `xp_per_play` al usuario.

### Logros

Cada juego puede tener logros definidos desde el panel admin (o perfil de empresa). Los logros se evalúan en el frontend al guardar una partida y se sincronizan con el backend vía `POST /api/achievements/user`.

#### Métricas disponibles

| Métrica | Qué mide |
|---------|----------|
| `plays_count` | Nº de partidas jugadas |
| `wins_count` | Partidas con `score ≥ win_score_min` |
| `best_score` | Mejor puntuación histórica (con scale/offset) |
| `single_run_score` | Puntuación de la última partida (con scale/offset) |

#### Transformación de score

Para `best_score` y `single_run_score` el sistema aplica:

```
valor = score × score_scale + score_offset
```

Permite adaptar la unidad del score del juego al umbral del logro sin modificar el juego (ej. convertir puntos a metros, niveles, etc.).

#### Rareza y XP

La rareza se asigna al crear el logro. La XP se suma al usuario **una sola vez**, cuando se desbloquea por primera vez.

| Rareza | XP |
|--------|----|
| Bronce | +25 |
| Plata | +75 |
| Oro | +200 |

### Medallas

Las medallas son insignias globales del perfil del usuario. A diferencia de los logros (por juego, guardados en BD), las medallas se calculan en tiempo real en el frontend a partir de los datos acumulados del usuario. No tienen tabla propia en la BD.

**Archivo de configuración:** `src/lib/medals.js`

#### Stats disponibles para las condiciones

| Stat | Descripción |
|------|-------------|
| `totalPlays` | Total de partidas jugadas en todos los juegos |
| `totalWins` | Total de victorias |
| `bestScore` | Mejor puntuación individual histórica |
| `totalTimePlayed` | Tiempo total jugado en segundos |
| `gamesPlayed` | Número de juegos distintos jugados |
| `level` | Nivel actual de gamificación (1–5) |

#### Medallas predefinidas

| Medalla | Condición |
|---------|-----------|
| Primera partida | 1 partida jugada |
| Habitual | 25 partidas jugadas |
| Adicto | 100 partidas jugadas |
| Primera victoria | 1 victoria |
| Imparable | 50 victorias |
| Maratonista | 1 hora de juego total |
| Sin vida | 10 horas de juego total |
| Explorador | 5 juegos distintos |
| Coleccionista | 10 juegos distintos |
| Casual / Veterano / Maestro / Leyenda | Alcanzar el nivel correspondiente |

#### Añadir una medalla nueva

Edita `src/lib/medals.js` y añade un objeto al array `MEDALS`:

```js
{
  id: 'mi_medalla',           // identificador único, sin espacios
  name: 'Nombre visible',
  description: 'Cómo se consigue',
  icon: '🎯',                 // emoji  O  ruta/URL a imagen PNG/SVG
  color: '#22d3ee',           // color del borde y fondo del badge
  condition: s => s.totalPlays >= 50,  // función con los stats disponibles
}
```

El campo `icon` acepta tanto emojis como rutas a imágenes (`/medals/mi-medalla.png`, `https://...`). El componente detecta automáticamente si es URL y renderiza un `<img>` en vez de texto.

#### Resetear medallas de un usuario

Las medallas no tienen datos propios, se derivan de stats existentes. Para resetearlas usa el panel admin → Gestionar usuario:

- **Borrar scores y logros** → elimina `UserGameStats` → desaparecen medallas de partidas, victorias, tiempo y juegos distintos
- **Resetear XP** → pone XP a 0 → desaparecen las medallas de nivel

---

## Componentes genéricos de sala (`src/components/games/`)

Disponibles para cualquier juego multijugador:

| Componente | Descripción |
|------------|-------------|
| `OnlineGameLobby` | Pantalla de crear/unirse a sala |
| `OnlineGamePlayerZone` | Indicador de turno activo para ambos jugadores |
| `OnlineGameMoveHistory` | Lista de movimientos de la partida (props: `moves`, `title`, `emptyMessage`, `maxHeight`, `renderMove`) |
| `ChatSection` | Chat en tiempo real de la sesión |

---

## Partidas activas en segundo plano (actualmente solo ajedrez)

El sistema permite tener **varias partidas simultáneas** de un mismo juego. Mientras el usuario navega por la plataforma, un widget persistente (bottom-right) le recuerda sus partidas en curso e indica en cuáles es su turno. Al pinchar navega directamente a la sala.

### Cómo funciona

- `ActiveChessGamesAlert` hace polling cada 15 s a `GET /api/chess/my-active-games`.
- El servidor devuelve las partidas activas del usuario y, **antes de responder**, comprueba si alguna ha expirado por tiempo usando el campo `lastTickAt` almacenado en `board_state.meta.clock`:
  - Si `ahora - lastTickAt > ms_restantes_del_jugador_en_turno` → la partida se cierra automáticamente.
  - Se notifica a ambos jugadores vía el panel de notificaciones (`game_timeout`).
  - Si la partida era ranked y aún no se había procesado el ELO, se procesa en ese momento.
  - Si la partida estaba ligada a un torneo, se avanza el bracket.
- Partidas sin límite de tiempo (`clock === null`) nunca expiran en segundo plano.

### Extender a otros juegos 1v1

El patrón es idéntico para cualquier juego 1v1 que use `GameSession`. Los pasos son:

**1. El juego debe guardar el reloj en `game_state`** con el mismo formato que el ajedrez:

```js
// Dentro de game_state (Json en BD)
{
  clock: {
    whiteMs: 300000,   // ms restantes jugador 1
    blackMs: 300000,   // ms restantes jugador 2
    lastTickAt: "2026-04-22T12:00:00.000Z"  // ISO — cuándo se hizo el último movimiento
  }
}
```

Si el juego no tiene tiempo, `clock` debe ser `null` o estar ausente.

**2. Añadir un endpoint `GET /api/<juego>/my-active-games`** en el router del juego. La lógica de timeout es la misma, cambiando solo el modelo (`GameSession` en vez de `ChessRoom`) y la ruta al reloj (`game_state.clock` en vez de `board_state.meta.clock`). Los jugadores se identifican como `host_email` y `guest_email` en `GameSession`.

**3. Crear el componente alert** clonando `ActiveChessGamesAlert.jsx` y apuntando al nuevo endpoint y ruta de juego (`/games/<game_id>?room=...`).

**4. Registrar el componente** en `App.jsx` junto al resto de alerts.

No hay cambios de schema: `GameSession` ya tiene los campos necesarios y la notificación `game_timeout` ya existe en `NotificationType`.
