'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FlaskConical, RotateCcw, Play } from 'lucide-react'

const ROUNDS = [
  { stage: 'group',         label: 'Group Stage',     matches: 72 },
  { stage: 'round_of_32',   label: 'Round of 32',     matches: 16 },
  { stage: 'round_of_16',   label: 'Round of 16',     matches: 8  },
  { stage: 'quarter_final', label: 'Quarter-finals',  matches: 4  },
  { stage: 'semi_final',    label: 'Semi-finals',     matches: 2  },
  { stage: 'final',         label: 'Final',           matches: 1  },
]

export function TestPackControls() {
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function post(url: string, body?: object) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  }

  async function reset() {
    if (!confirm('This will delete all predictions and match scores and create 100 test users. Continue?')) return
    setBusy('reset')
    setResult(null)
    try {
      const json = await post('/api/admin/test/reset')
      if (json.success) {
        setResult({ ok: true, msg: `✓ Reset complete — ${json.usersCreated} test users created. Select "Test League 2026" on the dashboard to see the leaderboard.` })
      } else {
        setResult({ ok: false, msg: `Error: ${json.error}` })
      }
    } catch {
      setResult({ ok: false, msg: 'Network error' })
    }
    setBusy(null)
  }

  async function simulate(stage: string, label: string) {
    setBusy(stage)
    setResult(null)
    try {
      const json = await post('/api/admin/test/simulate-round', { stage })
      if (json.success) {
        setResult({ ok: true, msg: `✓ ${label}: ${json.matchesSimulated} matches, ${json.predictionsCreated} predictions scored` })
      } else {
        setResult({ ok: false, msg: `Error: ${json.error}` })
      }
    } catch {
      setResult({ ok: false, msg: 'Network error' })
    }
    setBusy(null)
  }

  const loading = busy !== null

  return (
    <div className="space-y-4">
      <Button onClick={reset} disabled={loading} variant="danger" size="sm">
        <RotateCcw className={`h-4 w-4 ${busy === 'reset' ? 'animate-spin' : ''}`} />
        {busy === 'reset' ? 'Resetting…' : 'Reset & create 100 test users'}
      </Button>

      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Simulate rounds in order</p>
        <div className="flex flex-wrap gap-2">
          {ROUNDS.map(({ stage, label, matches }) => (
            <Button
              key={stage}
              onClick={() => simulate(stage, label)}
              disabled={loading}
              variant="secondary"
              size="sm"
            >
              {busy === stage
                ? <><Play className="h-3.5 w-3.5 animate-pulse" />{label}…</>
                : <><Play className="h-3.5 w-3.5" />{label} <span className="text-gray-400">({matches})</span></>
              }
            </Button>
          ))}
        </div>
      </div>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-gray-600' : 'text-red-600'}`}>
          {result.msg}
        </p>
      )}
    </div>
  )
}
