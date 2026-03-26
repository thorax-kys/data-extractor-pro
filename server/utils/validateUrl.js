/**
 * Validates that a URL belongs to TikTok or Instagram.
 * Accepts common domain variations including short-links.
 */

const ALLOWED_HOSTS = [
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'm.tiktok.com',
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'instagr.am',
];

function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must use HTTP or HTTPS' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOSTS.some(
    (host) => hostname === host || hostname.endsWith('.' + host)
  );

  if (!isAllowed) {
    return {
      valid: false,
      error: 'Only TikTok and Instagram links are supported',
    };
  }

  return { valid: true, url: parsed.href };
}

module.exports = { validateUrl };
