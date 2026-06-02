'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from 'lucide-react'

export function SyncFixturesButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/sync-fixtures', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setResult(`✓ Synced ${json.upserted} of ${json.total} fixtures`)
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
      <Button onClick={sync} disabled={loading} variant="secondary">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Syncing…' : 'Sync fixtures from API'}
      </Button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </div>
  )
}
