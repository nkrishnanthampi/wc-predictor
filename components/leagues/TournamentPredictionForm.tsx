'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { WC_TEAMS_2026 } from '@/lib/utils'
import type { TournamentPrediction } from '@/lib/supabase/types'
import { Trophy } from 'lucide-react'

interface Props {
  leagueId: string
  userId: string
  existing?: TournamentPrediction
}

export function TournamentPredictionForm({ leagueId, userId, existing }: Props) {
  const router = useRouter()
  const [team, setTeam] = useState(existing?.predicted_winner ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!team) return
    setSaving(true)
    setError('')

    const supabase = createClient()

    const { error: err } = existing
      ? await supabase
          .from('tournament_predictions')
          .update({ predicted_winner: team })
          .eq('id', existing.id)
      : await supabase.from('tournament_predictions').insert({
          user_id: userId,
          league_id: leagueId,
          predicted_winner: team,
        })

    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h2 className="font-semibold text-gray-900">Tournament Winner Pick</h2>
        <span className="ml-auto text-xs text-gray-400">+10 pts if correct</span>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <select
            required
            value={team}
            onChange={(e) => { setTeam(e.target.value); setSaved(false) }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Select the tournament winner…</option>
            {WC_TEAMS_2026.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {saved && <p className="text-green-600 text-sm">Saved ✓</p>}

          <Button type="submit" className="w-full" disabled={saving || !team}>
            {saving ? 'Saving…' : existing ? 'Update pick' : 'Save pick'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
