const TIKWM_API = 'https://tikwm.com/api/';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  // Basic URL validation for TikTok / Instagram
  const trimmed = url.trim();
  const isTikTok = /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(trimmed);
  const isInstagram = /^https?:\/\/(www\.)?instagram\.com\//i.test(trimmed);

  if (!isTikTok && !isInstagram) {
    return res.status(400).json({
      error: 'Only TikTok and Instagram links are supported.',
    });
  }

  try {
    // Call TikWM API
    const apiRes = await fetch(TIKWM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url: trimmed, hd: '1' }),
    });

    if (!apiRes.ok) {
      throw new Error(`TikWM returned ${apiRes.status}`);
    }

    const json = await apiRes.json();

    if (json.code !== 0 || !json.data) {
      throw new Error(json.msg || 'TikWM returned an error');
    }

    const d = json.data;

    // Build normalized response
    const result = {
      title: d.title || null,
      description: d.title || null,
      uploader: d.author?.nickname || d.author?.unique_id || null,
      uploaderUsername: d.author?.unique_id || null,
      uploaderAvatar: d.author?.avatar || null,
      views: d.play_count ?? null,
      likes: d.digg_count ?? null,
      comments: d.comment_count ?? null,
      shares: d.share_count ?? null,
      duration: d.duration ?? null,
      thumbnail: d.cover || d.origin_cover || null,
      platform: isTikTok ? 'TikTok' : 'Instagram',

      // Direct download URLs — no local file storage needed
      videoUrl: d.play || null,
      videoHdUrl: d.hdplay || null,
      audioUrl: d.music || null,
      audioTitle: d.music_info?.title || null,
      audioAuthor: d.music_info?.author || null,
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error('Extract error:', err.message);
    return res.status(500).json({
      error: 'Failed to extract data. The link may be private, expired, or unsupported.',
    });
  }
}
