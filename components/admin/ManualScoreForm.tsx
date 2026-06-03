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
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function save() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/set-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, homeScore: home, awayScore: away }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setFeedback({ ok: false, msg: json.error ?? 'Save failed' })
      } else {
        setFeedback({ ok: true, msg: 'Saved' })
        router.refresh()
      }
    } catch {
      setFeedback({ ok: false, msg: 'Network error' })
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <input
        type="number"
        min={0}
        max={30}
        value={home}
        onChange={e => { setHome(Number(e.target.value)); setFeedback(null) }}
        className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-sm"
      />
      <span className="text-gray-400">–</span>
      <input
        type="number"
        min={0}
        max={30}
        value={away}
        onChange={e => { setAway(Number(e.target.value)); setFeedback(null) }}
        className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-sm"
      />
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? '…' : 'Save'}
      </Button>
      {feedback && (
        <span className={`text-xs font-medium ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>
          {feedback.msg}
        </span>
      )}
    </div>
  )
}
