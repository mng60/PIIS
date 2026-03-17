# PlayCraft

Plataforma de juegos web — Proyecto Universitario PIIS.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + Prisma ORM
- **Base de datos:** PostgreSQL
- **Auth:** JWT (localStorage)

---

## Puesta en marcha

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

### 3. Variables de entorno

**Frontend** — `.env` en la raíz:

```env
VITE_API_URL="http://localhost:3001/api"
```

**Backend** — `server/.env` (no commitear; copiar desde `server/.env.example`):

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/playcraft"
JWT_SECRET="una_clave_secreta_larga"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

### 4. Base de datos

```bash
cd server
npx prisma db push
node prisma/seed.js   # crea 3 usuarios de prueba
```

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@playcraft.com | admin123 |
| Usuario | usuario@playcraft.com | user1234 |
| Empresa | empresa@playcraft.com | empresa123 |

### 5. Arrancar

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
│   │   ├── useTurnGameRelay.js   # BASE genérica para juegos por turnos con iframe
│   │   ├── useChessGame.js       # wrapper de ajedrez sobre useTurnGameRelay
│   │   └── useGameRoom.js        # sala React genérica (disponible, sin uso actual)
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
| `chess.js` | `createChessRoom`, `getChessRoom`, `updateChessRoom`, `deleteChessRoom` |
| `tournaments.js` | `getTournaments`, `createTournament`, `updateTournament`, `deleteTournament` |
| `chat.js` | `getChatMessages`, `sendChatMessage`, `deleteChatMessage` |
| `reports.js` | `getReports`, `createReport`, `updateReport` |

> `src/lib/AuthContext.jsx` usa `api` directamente porque gestiona el token JWT y
> el estado React de sesión de forma acoplada. Es la única excepción intencionada.

---

## Hooks (`src/hooks/`)

### `useGameDetail` — fetching de detalle de juego

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

### `useTurnGameRelay` — base genérica para juegos por turnos con iframe

**Este es el hook base activo para juegos multijugador por turnos embebidos en iframe.**

Gestiona el ciclo completo de sala vía `postMessage` + polling contra `/sessions`:

| Mensaje entrante | Acción |
|-----------------|--------|
| `CREATE_ROOM` | Crea sesión en BD, responde `ROOM_CREATED` al iframe |
| `JOIN_ROOM` | Valida sala, une al guest, responde al iframe |
| `[actionType]` | Persiste la acción en `game_state.actions` |

El polling cada 1.5 s entrega al iframe las acciones del oponente que aún no ha recibido.
Todo el comportamiento específico del juego se inyecta vía callbacks:

```js
useTurnGameRelay({
  isPlaying, user, gameId, iframeRef, onRoomCodeChange,

  actionType,            // tipo de mensaje que representa una acción (ej. 'CHESS_MOVE')
  extractAction,         // (msg) => objeto a persistir
  buildOpponentMessage,  // (action) => payload de postMessage al oponente

  onGuestJoined,         // (session, iframeRef, user) => void — info al guest al unirse
  onHostGameStart,       // (session, iframeRef, user) => void — info al host cuando empieza
})
```

---

### `useChessGame` — configuración de ajedrez sobre el relay

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

> **Nota:** el ajedrez integrado de PlayCraft (`ChessOnlineGame.jsx`, accesible por
> `game_code === 'chess-online'`) es un componente React independiente que usa
> `api/chess.js` → `/chess` directamente, sin pasar por este relay. Son dos
> implementaciones distintas que coexisten.

---

### `useGameRoom` — sala React genérica *(disponible, sin uso actual)*

Hook de infraestructura para juegos multijugador implementados como **componentes
React** (sin iframe). Gestiona lobby → espera → partida → finalización usando
`sessions.js`, igual que `useTurnGameRelay`, pero exponiendo estado React en lugar
de depender de `postMessage`.

**Ningún componente lo usa actualmente.** Está disponible para implementar futuros
juegos de mesa como componentes React propios.

API completa:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `phase` | `"lobby" \| "waiting" \| "playing" \| "finished"` | Estado de la sala |
| `roomCode` | `string` | Código de 6 letras |
| `myRole` | `"host" \| "guest" \| null` | Rol del jugador |
| `isMyTurn` | `boolean` | Si es tu turno |
| `gameState` | `object` | Estado JSON del juego (sincronizado con BD) |
| `currentTurn` | `"host" \| "guest"` | A quién le toca |
| `winner` | `string \| null` | Email del ganador, `"draw"`, o null |
| `hostPlayer` / `guestPlayer` | `{ email, name }` | Datos de cada jugador |
| `opponentName` | `string` | Nombre del rival |

| Función | Descripción |
|---------|-------------|
| `createRoom(initialState?)` | Crea sala como host |
| `joinRoom(code?)` | Se une como guest |
| `updateState(patch)` | Actualiza `game_state` en BD (merge) |
| `passTurn()` | Cambia el turno: host ↔ guest |
| `finishGame(winner)` | Marca la partida como terminada |
| `leaveRoom()` | Abandona (el rival gana si estaba jugando) |

---

## Añadir un juego multijugador

Hay dos caminos según cómo esté implementado el juego:

### Camino A — Juego externo en iframe (usa `useTurnGameRelay`)

El juego corre dentro de un `<iframe>` y se comunica con PlayCraft vía `postMessage`.
Crea un hook específico que envuelva `useTurnGameRelay`:

```js
// src/hooks/useDominoGame.js
import { useTurnGameRelay } from './useTurnGameRelay';

export function useDominoGame({ isPlaying, user, gameId, iframeRef, onRoomCodeChange }) {
  useTurnGameRelay({
    isPlaying, user, gameId, iframeRef, onRoomCodeChange,
    actionType: 'DOMINO_PLACE',
    extractAction:        (msg)    => ({ piece: msg.piece, position: msg.position }),
    buildOpponentMessage: (action) => ({ type: 'OPPONENT_PLACED', ...action }),
    onGuestJoined:    (session, ref, user) => { /* postMessage con info del jugador */ },
    onHostGameStart:  (session, ref, user) => { /* postMessage con info del jugador */ },
  });
}
```

Luego llama al hook en `GameArea.jsx` igual que `useChessGame`.

El iframe debe enviar `CREATE_ROOM` o `JOIN_ROOM` para arrancar la sala, y
`DOMINO_PLACE` (o el tipo que hayas configurado) para cada acción de juego.

---

### Camino B — Juego React sin iframe (usa `useGameRoom`)

El juego es un componente React propio. Usa `useGameRoom` para gestionar la sala
y sincronizar el estado entre los dos jugadores:

```js
import { useGameRoom } from "@/hooks/useGameRoom";

export default function MiJuegoOnline({ user, gameId }) {
  const room = useGameRoom({ gameId, user });

  if (room.phase === "lobby") {
    return (
      <OnlineGameLobby
        onCreateRoom={() => room.createRoom({ /* estado inicial */ })}
        onJoinRoom={room.joinRoom}
        joinCode={room.joinCode}
        onJoinCodeChange={room.setJoinCode}
        loading={room.loading}
        error={room.error}
      />
    );
  }

  // room.gameState  — estado JSON libre, sincronizado con BD
  // room.isMyTurn   — boolean
  // room.myRole     — "host" | "guest"
  // room.phase      — "waiting" | "playing" | "finished"
  // room.winner     — email del ganador, "draw", o null
  //
  // room.updateState(patch)      — actualiza game_state en BD (merge)
  // room.passTurn()              — cambia turno host ↔ guest
  // room.finishGame(winner)      — marca la partida como terminada
  // room.leaveRoom()             — abandona (el rival gana si había empezado)

  return (
    <div>
      <OnlineGamePlayerZone
        topPlayer={{ name: room.opponentName }}
        bottomPlayer={{ name: user?.full_name || "Tú" }}
        isTopPlayerActive={!room.isMyTurn}
        isBottomPlayerActive={room.isMyTurn}
      />
      {/* tu lógica de juego aquí */}
      <ChatSection gameId={gameId} user={user} sessionId={room.roomCode} />
      <button onClick={room.leaveRoom}>Salir</button>
    </div>
  );
}
```

---

## Componentes genéricos de sala (`src/components/games/`)

Disponibles para cualquier juego multijugador:

| Componente | Descripción |
|------------|-------------|
| `OnlineGameLobby` | Pantalla de crear/unirse a sala |
| `OnlineGamePlayerZone` | Indicador de turno activo para ambos jugadores |
| `OnlineGameMoveHistory` | Lista de movimientos de la partida |
| `ChatSection` | Chat en tiempo real de la sesión |
