'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface Props {
  matchId: string
  existing?: { home: number; away: number }
}

export function ManualScoreForm({ matchId, existing }: Props) {
  const router = useRouter()
  const [home, setHome] = useState(existing?.home ?? 0)
  const [away, setAway] = useState(existing?.away ?? 0)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/admin/set-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, homeScore: home, awayScore: away }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <input
        type="number"
        min={0}
        max={30}
        value={home}
        onChange={e => setHome(Number(e.target.value))}
        className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-sm"
      />
      <span className="text-gray-400">–</span>
      <input
        type="number"
        min={0}
        max={30}
        value={away}
        onChange={e => setAway(Number(e.target.value))}
        className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-sm"
      />
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? '…' : 'Save'}
      </Button>
    </div>
  )
}
