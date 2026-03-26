import { useState } from 'react'
import './LinkInput.css'

export default function LinkInput({ onSubmit, loading, extracted, onClear }) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (trimmed && !extracted) onSubmit(trimmed)
  }

  const handleChange = (e) => {
    const value = e.target.value
    setUrl(value)
    if (!value.trim() && onClear) onClear()
  }

  const buttonLabel = loading ? 'Extracting...' : extracted ? 'Extracted' : 'Extract'

  return (
    <form className="link-input" onSubmit={handleSubmit}>
      <input
        type="url"
        value={url}
        onChange={handleChange}
        placeholder="https://www.tiktok.com/..."
        disabled={loading}
        autoFocus
      />
      <button
        type="submit"
        disabled={loading || !url.trim() || extracted}
        className={extracted ? 'extracted' : ''}
      >
        {buttonLabel}
      </button>
    </form>
  )
}
