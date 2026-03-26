import './ResultCard.css'
import { API_BASE } from '../hooks/useExtract'

export default function ResultCard({ data }) {
  const { title, uploader, views, likes, duration, thumbnail, downloadId, audioDownloadId } = data

  const fmt = (n) => {
    if (n == null) return '--'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const fmtTime = (s) => {
    if (s == null) return '--'
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, '0')}`
  }

  // Proxy thumbnails through our server to bypass CORS (Instagram CDN blocks cross-origin)
  const thumbSrc = thumbnail
    ? `${API_BASE}/api/proxy-thumb?url=${encodeURIComponent(thumbnail)}`
    : null

  return (
    <article className="result-card">
      {thumbSrc && (
        <img className="result-card__thumb" src={thumbSrc} alt={title || 'Video thumbnail'} />
      )}

      <h3 className="result-card__title">{title || 'Untitled'}</h3>

      {uploader && (
        <p className="result-card__uploader">@{uploader}</p>
      )}

      <div className="result-card__stats">
        <div className="result-card__stat">
          <span className="result-card__stat-label">Views</span>
          <span className="result-card__stat-value">{fmt(views)}</span>
        </div>
        <div className="result-card__stat">
          <span className="result-card__stat-label">Likes</span>
          <span className="result-card__stat-value">{fmt(likes)}</span>
        </div>
        <div className="result-card__stat">
          <span className="result-card__stat-label">Duration</span>
          <span className="result-card__stat-value">{fmtTime(duration)}</span>
        </div>
      </div>

      <div className="result-card__actions">
        <a className="result-card__download" href={`${API_BASE}/api/download/${downloadId}`} download>
          Download MP4
        </a>
        <a
          className={`result-card__download result-card__download--secondary${!audioDownloadId ? ' result-card__download--disabled' : ''}`}
          href={audioDownloadId ? `${API_BASE}/api/download/${audioDownloadId}` : undefined}
          download={!!audioDownloadId}
          onClick={audioDownloadId ? undefined : (e) => e.preventDefault()}
        >
          {audioDownloadId ? 'Download MP3' : 'MP3 unavailable'}
        </a>
      </div>
    </article>
  )
}
