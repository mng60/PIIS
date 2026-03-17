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

**Backend** — `server/.env` (no commitear, usa `server/.env.example` como plantilla):

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
│   ├── hooks/                   # Hooks reutilizables
│   ├── api/                     # Capa API por dominio
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

> **Excepción legítima:** `src/lib/AuthContext.jsx` usa `api` directamente porque gestiona
> el token JWT y el estado React de sesión de forma acoplada. No tiene módulo propio.

---

## Hooks (`src/hooks/`)

### Hook de datos — `useGameDetail`

| Hook | Dónde se usa | Qué hace |
|------|-------------|----------|
| `useGameDetail(gameId, user)` | `GameDetail.jsx` | Queries de juego, puntuaciones, comentarios y favoritos vía React Query. Expone `toggleFavorite` e `invalidateGame`. |

### Hook de juego de un jugador — `useSinglePlayerGame`

| Hook | Dónde se usa | Qué hace |
|------|-------------|----------|
| `useSinglePlayerGame({ onScoreUpdate, storageKey })` | `SnakeGame.jsx` | Ciclo `idle → playing → gameover`, marcador, récord en localStorage. Devuelve: `gameState`, `score`, `highScore`, `scoreRef`, `startGame`, `addPoints`, `endGame`, `resetGame`. |

> `PongGame.jsx` gestiona su propio estado con `useState` sin usar este hook.

---

### Hooks para juegos multijugador

PlayCraft tiene **dos sistemas independientes** para juegos multijugador:

---

#### Sistema 1 — Chess integrado (`ChessOnlineGame.jsx` + `chess.js`)

El ajedrez online está implementado como componente React completo (`ChessOnlineGame.jsx`) y usa su propio endpoint REST `/chess` a través del módulo `src/api/chess.js`.

```
GameArea (game_code === 'chess-online')
  └── ChessOnlineGame.jsx
        └── src/api/chess.js  →  /chess  (endpoint propio)
```

Este sistema gestiona internamente: sala de espera, estado del tablero, turnos, reloj, tablas, abandono y puntuaciones.

---

#### Sistema 2 — Relay de iframe (`useTurnGameRelay` + `useChessGame`)

Para juegos **HTML5 en iframe** que se comunican con el host vía `postMessage`. El hook genérico es `useTurnGameRelay`; por encima se crean hooks específicos por juego.

```
GameArea (game_type === 'html5', is_multiplayer)
  └── useChessGame          ← configuración específica de ajedrez por iframe
        └── useTurnGameRelay  ← infraestructura genérica de sala + relay
              └── src/api/sessions.js  →  /sessions
```

`useTurnGameRelay` gestiona:
- `CREATE_ROOM` → crea sesión en BD, responde `ROOM_CREATED`
- `JOIN_ROOM` → valida y une al guest
- `[actionType]` → almacena la acción del jugador en `game_state.actions`
- Polling cada 1.5 s → entrega acciones del oponente al iframe

`useChessGame` configura el relay para ajedrez embebido en iframe:
- Tipo de acción: `CHESS_MOVE` → `{ from, to, promo }`
- Mensaje al oponente: `CHESS_OPPONENT_MOVE`
- `PLAYER_INFO` con `color: 'black'` al guest y `color: 'white'` al host

**Para añadir un nuevo juego de mesa con iframe:**

```js
// src/hooks/useDominoGame.js
import { useTurnGameRelay } from './useTurnGameRelay';

export function useDominoGame({ isPlaying, user, gameId, iframeRef, onRoomCodeChange }) {
  useTurnGameRelay({
    isPlaying, user, gameId, iframeRef, onRoomCodeChange,
    actionType: 'DOMINO_PLACE',
    extractAction:        (msg)    => ({ piece: msg.piece, position: msg.position }),
    buildOpponentMessage: (action) => ({ type: 'OPPONENT_PLACED', ...action }),
    onGuestJoined:        (session, iframeRef, user) => { /* player info al guest */ },
    onHostGameStart:      (session, iframeRef, user) => { /* player info al host */ },
  });
}
```

---

#### Sistema 3 — Sala React genérica (`useGameRoom`) — infraestructura disponible

`useGameRoom` es un hook de infraestructura para juegos multijugador implementados como **componentes React** (sin iframe). Está completamente implementado y usa `sessions.js`, pero **ningún componente lo usa actualmente**. Está disponible para futuros juegos de este tipo.

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

  return (
    <div>
      {/* room.gameState, room.isMyTurn, room.myRole, room.phase, room.winner */}
      {/* room.updateState(patch) — actualiza game_state en BD (merge) */}
      {/* room.passTurn()         — cambia turno host ↔ guest */}
      {/* room.finishGame(email)  — marca partida como terminada */}
      <ChatSection gameId={gameId} user={user} sessionId={room.roomCode} />
      <button onClick={room.leaveRoom}>Salir</button>
    </div>
  );
}
```

**API de `useGameRoom`:**

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

## Componentes genéricos de sala (`src/components/games/`)

Disponibles para cualquier juego multijugador:

| Componente | Descripción |
|------------|-------------|
| `OnlineGameLobby` | Pantalla de crear/unirse a sala |
| `OnlineGamePlayerZone` | Indicador de turno activo para ambos jugadores |
| `OnlineGameMoveHistory` | Lista de movimientos de la partida |
| `ChatSection` | Chat en tiempo real de la sesión |
