const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Use /tmp on Railway (ephemeral but available within process lifecycle)
// Fall back to local downloads/ for development
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

/**
 * Resolve the yt-dlp binary path.
 * - On Windows: bundled .exe from yt-dlp-exec
 * - On Linux (Railway): yt-dlp-exec installs a platform-appropriate binary
 * - Fallback: assume yt-dlp is on PATH
 */
function getBinaryPath() {
  const isWindows = process.platform === 'win32';
  const ext = isWindows ? '.exe' : '';

  // yt-dlp-exec bundles the binary at node_modules/yt-dlp-exec/bin/yt-dlp[.exe]
  const bundled = path.join(
    __dirname, '..', 'node_modules', 'yt-dlp-exec', 'bin', `yt-dlp${ext}`
  );
  if (fs.existsSync(bundled)) {
    // Ensure it's executable on Linux
    if (!isWindows) {
      try { fs.chmodSync(bundled, 0o755); } catch { /* ignore */ }
    }
    return bundled;
  }

  // Fallback: hope it's on PATH
  return 'yt-dlp';
}

/**
 * Resolve the ffmpeg binary path from ffmpeg-static.
 * Falls back to system ffmpeg if the npm package isn't available.
 * Returns the path or null if not available.
 */
function getFfmpegPath() {
  try {
    const staticPath = require('ffmpeg-static');
    if (staticPath && fs.existsSync(staticPath)) return staticPath;
  } catch {
    // ffmpeg-static not available
  }

  // Fallback: system-installed ffmpeg (available on Railway via nixpacks.toml)
  return 'ffmpeg';
}

const YT_DLP = getBinaryPath();
const FFMPEG = getFfmpegPath();

/**
 * Build common args shared by all yt-dlp calls.
 */
function baseArgs() {
  const args = ['--no-warnings', '--no-playlist'];
  if (FFMPEG) {
    args.push('--ffmpeg-location', FFMPEG);
  }
  return args;
}

/**
 * Fetch metadata for a given URL using yt-dlp --dump-json.
 * Includes fallbacks for Instagram which uses different field names.
 */
function getMetadata(url) {
  return new Promise((resolve, reject) => {
    execFile(
      YT_DLP,
      ['--dump-json', ...baseArgs(), url],
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.trim() || error.message;
          return reject(new Error(`yt-dlp metadata failed: ${msg}`));
        }

        try {
          const raw = JSON.parse(stdout);

          // Thumbnail: try direct field, then last entry in thumbnails array
          let thumbnail = raw.thumbnail || null;
          if (!thumbnail && Array.isArray(raw.thumbnails) && raw.thumbnails.length > 0) {
            thumbnail = raw.thumbnails[raw.thumbnails.length - 1].url || null;
          }

          // Views: try multiple field names
          const views = raw.view_count ?? raw.play_count ?? null;

          // Likes: try multiple field names
          const likes = raw.like_count ?? raw.favorite_count ?? null;

          const metadata = {
            title: raw.title || raw.fulltitle || raw.description?.slice(0, 100) || null,
            description: raw.description || null,
            uploader: raw.uploader || raw.uploader_id || raw.channel || raw.creator || null,
            views,
            likes,
            duration: raw.duration ? Math.round(raw.duration) : null,
            thumbnail,
            originalUrl: raw.webpage_url || url,
            platform: raw.extractor_key || null,
          };
          resolve(metadata);
        } catch (parseErr) {
          reject(new Error('Failed to parse yt-dlp output'));
        }
      }
    );
  });
}

/**
 * Download the video file for a given URL.
 * Returns { id, filePath, filename }.
 */
function downloadVideo(url) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const outputTemplate = path.join(DOWNLOADS_DIR, `${id}.%(ext)s`);

    execFile(
      YT_DLP,
      ['-f', 'mp4/best', ...baseArgs(), '-o', outputTemplate, url],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.trim() || error.message;
          return reject(new Error(`yt-dlp download failed: ${msg}`));
        }

        const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(id));

        if (files.length === 0) {
          return reject(new Error('Download completed but file not found'));
        }

        const filename = files[0];
        const filePath = path.join(DOWNLOADS_DIR, filename);
        resolve({ id, filePath, filename });
      }
    );
  });
}

/**
 * Download the audio as MP3 for a given URL.
 * Requires ffmpeg (provided by ffmpeg-static or system install).
 * Returns { id, filePath, filename }.
 */
function downloadAudio(url) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const outputTemplate = path.join(DOWNLOADS_DIR, `${id}.%(ext)s`);

    execFile(
      YT_DLP,
      ['-x', '--audio-format', 'mp3', ...baseArgs(), '-o', outputTemplate, url],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.trim() || error.message;
          return reject(new Error(`yt-dlp audio extraction failed: ${msg}`));
        }

        const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(id));

        if (files.length === 0) {
          return reject(new Error('Audio extraction completed but file not found'));
        }

        const filename = files[0];
        const filePath = path.join(DOWNLOADS_DIR, filename);
        resolve({ id, filePath, filename });
      }
    );
  });
}

/**
 * Get the file path for a previously downloaded file by its UUID.
 */
function getDownloadPath(id) {
  if (!/^[a-f0-9-]+$/i.test(id)) return null;
  const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(id));
  if (files.length === 0) return null;
  return path.join(DOWNLOADS_DIR, files[0]);
}

/**
 * Delete a downloaded file by its UUID.
 */
function cleanupDownload(id) {
  const filePath = getDownloadPath(id);
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  getMetadata,
  downloadVideo,
  downloadAudio,
  getDownloadPath,
  cleanupDownload,
};
