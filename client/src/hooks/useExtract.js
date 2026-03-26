import { useState, useCallback } from 'react'

// In development, Vite proxy handles /api → localhost:3001
// In production, VITE_API_URL points to the Railway backend
const API_BASE = import.meta.env.VITE_API_URL || ''

export { API_BASE }

export default function useExtract() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const extract = useCallback(async (url) => {
    setData(null)
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Extraction failed')
      }

      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, loading, error, extract, reset }
}
