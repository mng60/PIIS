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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
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

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
