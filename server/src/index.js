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

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

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

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  startSchedulers();
});
