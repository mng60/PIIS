import 'dotenv/config';
import express from 'express';
import cors from 'cors';

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
import usersRoutes from './routes/users.js';
import newsRoutes from './routes/news.js';
import maintenanceRoutes from './routes/maintenance.js';
import ticketsRoutes from './routes/tickets.js';

const app = express();
const PORT = process.env.PORT || 3001;

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
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
app.use('/api/news', newsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/tickets', ticketsRoutes);

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

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
