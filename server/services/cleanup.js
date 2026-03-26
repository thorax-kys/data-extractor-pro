const fs = require('fs');
const path = require('path');

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');

// Max age for downloaded files: 10 minutes
const MAX_AGE_MS = 10 * 60 * 1000;

// Cleanup interval: every 5 minutes
const INTERVAL_MS = 5 * 60 * 1000;

/**
 * Delete files in the downloads directory older than MAX_AGE_MS.
 */
function cleanupOldFiles() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return;

  const now = Date.now();
  let cleaned = 0;

  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);

    for (const file of files) {
      const filePath = path.join(DOWNLOADS_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch {
        // File may have been deleted by another process
      }
    }

    if (cleaned > 0) {
      console.log(`[cleanup] Removed ${cleaned} expired file(s)`);
    }
  } catch (err) {
    console.error('[cleanup] Error during cleanup:', err.message);
  }
}

/**
 * Start the periodic cleanup scheduler.
 */
function startCleanupScheduler() {
  console.log('[cleanup] Scheduler started — cleaning files older than 10 min every 5 min');
  cleanupOldFiles(); // Run once immediately
  setInterval(cleanupOldFiles, INTERVAL_MS);
}

module.exports = { cleanupOldFiles, startCleanupScheduler };
