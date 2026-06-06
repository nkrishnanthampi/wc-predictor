'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Star } from 'lucide-react'

export function ScoreFinishedMatchesButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function score() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/score-finished-matches', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setResult(json.predictionsScored > 0
          ? `✓ ${json.predictionsScored} predictions scored`
          : '✓ No unscored predictions found')
      } else {
        setResult(`Error: ${json.error}`)
      }
    } catch {
      setResult('Network error')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <Button onClick={score} disabled={loading} variant="secondary">
        <Star className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Scoring…' : 'Score finished matches'}
      </Button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </div>
  )
}
