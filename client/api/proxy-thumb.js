export default async function handler(req, res) {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs allowed' });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: 'Failed to fetch thumbnail' });
    }

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Proxy thumb error:', err.message);
    return res.status(502).json({ error: 'Failed to fetch thumbnail' });
  }
}
