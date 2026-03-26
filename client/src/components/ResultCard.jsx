import './ResultCard.css'

export default function ResultCard({ data }) {
  const {
    title, uploader, views, likes, comments, shares,
    duration, thumbnail, videoUrl, videoHdUrl, audioUrl,
  } = data

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

  // Proxy thumbnails through our serverless function to bypass CORS
  const thumbSrc = thumbnail
    ? `/api/proxy-thumb?url=${encodeURIComponent(thumbnail)}`
    : null

  const mp4Url = videoHdUrl || videoUrl

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
          <span className="result-card__stat-label">Comments</span>
          <span className="result-card__stat-value">{fmt(comments)}</span>
        </div>
        <div className="result-card__stat">
          <span className="result-card__stat-label">Shares</span>
          <span className="result-card__stat-value">{fmt(shares)}</span>
        </div>
        <div className="result-card__stat">
          <span className="result-card__stat-label">Duration</span>
          <span className="result-card__stat-value">{fmtTime(duration)}</span>
        </div>
      </div>

      <div className="result-card__actions">
        <a
          className={`result-card__download${!mp4Url ? ' result-card__download--disabled' : ''}`}
          href={mp4Url || undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={mp4Url ? undefined : (e) => e.preventDefault()}
        >
          {mp4Url ? 'Download MP4' : 'MP4 unavailable'}
        </a>
        <a
          className={`result-card__download result-card__download--secondary${!audioUrl ? ' result-card__download--disabled' : ''}`}
          href={audioUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={audioUrl ? undefined : (e) => e.preventDefault()}
        >
          {audioUrl ? 'Download MP3' : 'MP3 unavailable'}
        </a>
      </div>
    </article>
  )
}
