import { useState, useCallback } from 'react'

export default function useExtract() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const extract = useCallback(async (url) => {
    setData(null)
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/extract', {
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
