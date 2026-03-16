# PlayCraft

Plataforma de videojuegos web — Proyecto Universitario PIIS.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + Prisma ORM
- **Base de datos:** PostgreSQL

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
cd server
npm install
```

### 3. Variables de entorno

**Frontend** — crear `.env` en la raíz del proyecto:

```env
VITE_API_URL="http://localhost:3001/api"
```

**Backend** — crear `server/.env`:

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/playcraft"
JWT_SECRET="una_clave_secreta_larga"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

### 4. Base de datos

Asegúrate de tener PostgreSQL instalado y crea la base de datos `playcraft`. Luego aplica el esquema:

```bash
cd server
npx prisma db push
```

### 5. Usuarios de prueba

Ejecuta el seed para crear los 3 usuarios de prueba:

```bash
cd server
node prisma/seed.js
```

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@playcraft.com | admin123 |
| Usuario | usuario@playcraft.com | user1234 |
| Empresa | empresa@playcraft.com | empresa123 |

### 6. Arrancar los servidores

En dos terminales separadas:

```bash
# Terminal 1 — Backend (desde /server)
npm run dev

# Terminal 2 — Frontend (desde la raíz)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

---

## Estructura del proyecto

```
PIIS/
├── src/                  # Frontend React
│   ├── pages/            # Páginas de la app
│   ├── components/       # Componentes reutilizables
│   ├── hooks/            # Hooks reutilizables (useGameRoom, etc.)
│   ├── api/              # Cliente HTTP
│   └── lib/              # Auth context, utilidades
└── server/               # Backend Express
    ├── src/routes/       # Rutas de la API
    ├── src/middleware/   # Auth middleware
    └── prisma/           # Schema y migraciones
```

---

## Crear un juego multijugador

PlayCraft incluye infraestructura común para juegos online. Para crear uno nuevo solo hay que usar el hook `useGameRoom` y los componentes genéricos.

### Componentes disponibles

| Componente | Ruta | Descripción |
|---|---|---|
| `OnlineGameLobby` | `@/components/games/OnlineGameLobby` | Pantalla de crear/unirse a sala |
| `OnlineGamePlayerZone` | `@/components/games/OnlineGamePlayerZone` | Marcador de jugadores con turno activo |
| `OnlineGameMoveHistory` | `@/components/games/OnlineGameMoveHistory` | Lista de últimos movimientos |
| `ChatSection` | `@/components/games/ChatSection` | Chat en directo de la partida |

### Hook `useGameRoom`

Gestiona toda la lógica de sala: crear, unirse, sincronizar estado vía polling, turno y abandonar.

```jsx
import { useGameRoom } from "@/hooks/useGameRoom";
import OnlineGameLobby from "@/components/games/OnlineGameLobby";
import OnlineGamePlayerZone from "@/components/games/OnlineGamePlayerZone";
import OnlineGameMoveHistory from "@/components/games/OnlineGameMoveHistory";
import ChatSection from "@/components/games/ChatSection";

export default function MiJuegoOnline({ user, gameId }) {
  const room = useGameRoom({ gameId, user });

  // Pantalla de lobby (crear / unirse)
  if (room.phase === "lobby") {
    return (
      <OnlineGameLobby
        title="Mi Juego Online"
        description="Juega en tiempo real con otro jugador"
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
      {/* Marcador: a quién le toca */}
      <OnlineGamePlayerZone
        topPlayer={{ name: room.opponentName }}
        bottomPlayer={{ name: user?.full_name || "Tú" }}
        isTopPlayerActive={!room.isMyTurn}
        isBottomPlayerActive={room.isMyTurn}
      />

      {/* Tu lógica de juego aquí.
          Accedes al estado con room.gameState y lo actualizas con room.updateState().
          Para pasar el turno: room.passTurn()
          Para terminar: room.finishGame(winnerEmail) o room.finishGame("draw") */}

      {/* Chat de partida */}
      <ChatSection gameId={gameId} user={user} sessionId={room.roomCode} />

      {/* Historial de movimientos (gestiona tu propio array de moves) */}
      <OnlineGameMoveHistory moves={[]} />

      <button onClick={room.leaveRoom}>Salir</button>
    </div>
  );
}
```

### API del hook

| Propiedad | Tipo | Descripción |
|---|---|---|
| `phase` | `"lobby" \| "waiting" \| "playing" \| "finished"` | Estado actual de la sala |
| `roomCode` | `string` | Código de 6 letras de la sala |
| `myRole` | `"host" \| "guest" \| null` | Rol del jugador actual |
| `isMyTurn` | `boolean` | Si es el turno del jugador actual |
| `gameState` | `object` | Estado JSON libre del juego (sincronizado con BD) |
| `currentTurn` | `"host" \| "guest"` | A quién le toca |
| `winner` | `string \| null` | Email del ganador, `"draw"`, o null |
| `hostPlayer` | `{ email, name }` | Datos del host |
| `guestPlayer` | `{ email, name } \| null` | Datos del guest |
| `opponentName` | `string` | Nombre del rival |

| Función | Descripción |
|---|---|
| `createRoom(initialState?)` | Crea sala; el usuario es host |
| `joinRoom(code?)` | Se une a sala existente como guest |
| `updateState(patch)` | Actualiza `game_state` en BD (merge) |
| `passTurn()` | Cambia el turno: host ↔ guest |
| `finishGame(winner)` | Marca la partida como terminada |
| `leaveRoom()` | Sale o abandona (el rival gana si estaba jugando) |
