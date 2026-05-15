require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const authRoutes    = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes    = require('./routes/tasks');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Utilities ─────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', taskRoutes);   // tasks nested under projects

// Cross-project task routes (my tasks, dashboard)
const { requireAuth }                 = require('./middleware/auth');
const { getMyTasks, getDashboard }    = require('./controllers/taskController');
app.get('/api/tasks/my',       requireAuth, getMyTasks);
app.get('/api/dashboard',      requireAuth, getDashboard);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Team Task Manager API — Running      ║
║   Port : ${PORT}                          ║
║   Env  : ${process.env.NODE_ENV || 'development'}                  ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
