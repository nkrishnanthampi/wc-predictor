'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CheckSquare } from 'lucide-react'

export function SyncResultsButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/sync-results', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        const parts = []
        if (json.fixturesInserted > 0) parts.push(`${json.fixturesInserted} fixtures added`)
        if (json.fixturesUpdated > 0)  parts.push(`${json.fixturesUpdated} fixtures updated`)
        if (json.matchesUpdated > 0)   parts.push(`${json.matchesUpdated} results synced`)
        if (json.predictionsScored > 0) parts.push(`${json.predictionsScored} predictions scored`)
        setResult(parts.length > 0 ? `✓ ${parts.join(', ')}` : '✓ Nothing new to sync')
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
      <Button onClick={sync} disabled={loading}>
        <CheckSquare className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Syncing…' : 'Sync fixtures & results'}
      </Button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </div>
  )
}
