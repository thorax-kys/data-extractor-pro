const app = require('./app');
const { startCleanupScheduler } = require('./services/cleanup');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[server] Backend running at http://localhost:${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
  startCleanupScheduler();
});
