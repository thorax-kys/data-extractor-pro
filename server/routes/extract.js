const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const { validateUrl } = require('../utils/validateUrl');
const { getMetadata, downloadVideo, downloadAudio, getDownloadPath, cleanupDownload } = require('../services/ytdlp');

const router = express.Router();

/**
 * POST /api/extract
 * Body: { url: string }
 *
 * Validates the URL, fetches metadata via yt-dlp, downloads video + audio,
 * and returns metadata + download IDs for both formats.
 * Audio extraction is graceful — if it fails, video still returns.
 */
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    // 1. Validate URL
    const validation = validateUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 2. Fetch metadata + video in parallel (required)
    //    Audio extraction runs alongside but is allowed to fail gracefully
    const [metadata, videoDownload, audioResult] = await Promise.all([
      getMetadata(validation.url),
      downloadVideo(validation.url),
      downloadAudio(validation.url).catch((err) => {
        console.warn('Audio extraction failed (non-fatal):', err.message);
        return null;
      }),
    ]);

    // 3. Return combined result
    res.json({
      title: metadata.title,
      description: metadata.description,
      uploader: metadata.uploader,
      views: metadata.views,
      likes: metadata.likes,
      duration: metadata.duration,
      thumbnail: metadata.thumbnail,
      platform: metadata.platform,
      downloadId: videoDownload.id,
      audioDownloadId: audioResult ? audioResult.id : null,
    });
  } catch (err) {
    console.error('Extract error:', err.message);
    res.status(500).json({
      error: 'Failed to extract data. The link may be private, expired, or unsupported.',
    });
  }
});

/**
 * GET /api/download/:id
 *
 * Streams the downloaded file (MP4 or MP3) to the client, then cleans up.
 */
router.get('/download/:id', (req, res) => {
  const { id } = req.params;
  const filePath = getDownloadPath(id);

  if (!filePath) {
    return res.status(404).json({ error: 'Download not found or expired' });
  }

  const ext = path.extname(filePath);
  const downloadName = ext === '.mp3' ? 'audio.mp3' : 'video.mp4';

  res.download(filePath, downloadName, (err) => {
    cleanupDownload(id);
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to send file' });
    }
  });
});

/**
 * GET /api/proxy-thumb?url=<encoded-url>
 *
 * Proxies a thumbnail image through our server to bypass CORS restrictions.
 * Instagram CDN blocks cross-origin image loads in the browser.
 */
router.get('/proxy-thumb', (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Only allow http/https URLs
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs allowed' });
  }

  const client = parsed.protocol === 'https:' ? https : http;

  const proxyReq = client.get(imageUrl, { timeout: 10_000 }, (proxyRes) => {
    // Forward content type
    const contentType = proxyRes.headers['content-type'];
    if (contentType) res.setHeader('Content-Type', contentType);

    // Cache for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600');

    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to fetch thumbnail' });
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 'Thumbnail fetch timed out' });
    }
  });
});

module.exports = router;
