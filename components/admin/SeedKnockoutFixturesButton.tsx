'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { GitBranch } from 'lucide-react'

const STAGE_LABELS: Record<string, string> = {
  round_of_32:   'Round of 32',
  round_of_16:   'Round of 16',
  quarter_final: 'Quarter-finals',
  semi_final:    'Semi-finals',
  final:         'Final',
}

export function SeedKnockoutFixturesButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function seed() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/seed-knockout-fixtures', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        if (json.inserted > 0) {
          setResult(`✓ Seeded ${json.inserted} ${STAGE_LABELS[json.stage] ?? json.stage} fixtures`)
        } else {
          setResult(`✓ ${json.message ?? 'All rounds already seeded'}`)
        }
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
      <Button onClick={seed} disabled={loading} variant="secondary">
        <GitBranch className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Seeding…' : 'Seed knockout fixtures'}
      </Button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </div>
  )
}
