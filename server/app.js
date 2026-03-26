const express = require('express');
const cors = require('cors');
const extractRoutes = require('./routes/extract');

const app = express();

// --------------- Middleware ---------------
// CORS: allow the frontend origin (Vercel in prod, localhost in dev)
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL, // e.g. https://data-extractor.vercel.app
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

// --------------- Routes ---------------
app.use('/api', extractRoutes);

// --------------- Health check ---------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- 404 handler ---------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --------------- Error handler ---------------
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
