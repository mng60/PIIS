import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { startSchedulers } from './lib/tournamentScheduler.js';

import authRoutes from './routes/auth.js';
import gamesRoutes from './routes/games.js';
import commentsRoutes from './routes/comments.js';
import scoresRoutes from './routes/scores.js';
import favoritesRoutes from './routes/favorites.js';
import tournamentsRoutes from './routes/tournaments.js';
import achievementsRoutes from './routes/achievements.js';
import reportsRoutes from './routes/reports.js';
import chatRoutes from './routes/chat.js';
import sessionsRoutes from './routes/sessions.js';
import chessRoutes from './routes/chess.js';
import eloRoutes from './routes/elo.js';
import usersRoutes from './routes/users.js';
import friendsRoutes from './routes/friends.js';
import notificationsRoutes from './routes/notifications.js';
import profilesRoutes from './routes/profiles.js';
import newsRoutes from './routes/news.js';
import maintenanceRoutes from './routes/maintenance.js';
import ticketsRoutes from './routes/tickets.js';
import directMessagesRoutes from './routes/direct-messages.js';
import matchmakingRoutes from './routes/matchmaking.js';
import premiumRoutes from './routes/premium.js';
import coachRoutes from './routes/coach.js';
import assistantRoutes from './routes/assistant.js';

const app = express();
const PORT = process.env.PORT || 3001;
const SLOW_REQUEST_MS = 1500;

const configuredOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
  'https://playcraft-git-dev-sofia-mng60s-projects.vercel.app',
  ...configuredOrigins,
];

const allowedOriginPatterns = [
  /^https:\/\/playcraft(?:-[a-z0-9-]+)?\.vercel\.app$/,
  /^https:\/\/playcraft-git-[a-z0-9-]+-sofia-mng60s-projects\.vercel\.app$/,
  /^https:\/\/[\w-]+\.vercel\.app$/,
];

function isAllowedOrigin(origin) {
  return allowedOrigins.includes(origin) || allowedOriginPatterns.some(pattern => pattern.test(origin));
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const isNewsRoute = req.originalUrl.startsWith('/api/news');
    const isSlow = durationMs >= SLOW_REQUEST_MS;
    const isServerError = res.statusCode >= 500;

    if (isNewsRoute || isSlow || isServerError) {
      console.log(
        `[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
      );
    }
  });

  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/chess', chessRoutes);
app.use('/api/elo', eloRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/dm', directMessagesRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/assistant', assistantRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

function wrapAsyncRouteHandlers(router) {
  for (const layer of router.stack ?? []) {
    if (layer.route?.stack) {
      for (const routeLayer of layer.route.stack) {
        const handler = routeLayer.handle;
        if (handler.length < 4) {
          routeLayer.handle = (req, res, next) => {
            Promise.resolve(handler(req, res, next)).catch(next);
          };
        }
      }
    }

    if (layer.handle?.stack) {
      wrapAsyncRouteHandlers(layer.handle);
    }
  }
}

wrapAsyncRouteHandlers(app._router);

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err?.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  if (err?.name === 'PrismaClientInitializationError') {
    return res.status(503).json({
      error: 'No se pudo conectar con la base de datos. Revisa tu conexion o DATABASE_URL.',
    });
  }

  res.status(500).json({ error: 'Error del servidor' });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  startSchedulers();
});
