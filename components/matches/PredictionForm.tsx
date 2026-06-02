'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import type { Prediction } from '@/lib/supabase/types'

interface Props {
  matchId: string
  homeTeam: string
  awayTeam: string
  existingPrediction?: Prediction
}

export function PredictionForm({ matchId, homeTeam, awayTeam, existingPrediction }: Props) {
  const router = useRouter()
  const [homeScore, setHomeScore] = useState(existingPrediction?.predicted_home_score ?? 0)
  const [awayScore, setAwayScore] = useState(existingPrediction?.predicted_away_score ?? 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function winner() {
    if (homeScore > awayScore) return homeTeam
    if (awayScore > homeScore) return awayTeam
    return 'Draw'
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setSaving(false); return }

    const payload = {
      user_id: user.id,
      match_id: matchId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
    }

    const { error: err } = existingPrediction
      ? await supabase
          .from('predictions')
          .update({ predicted_home_score: homeScore, predicted_away_score: awayScore })
          .eq('id', existingPrediction.id)
      : await supabase.from('predictions').insert(payload)

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
      <CardHeader>
        <h2 className="font-semibold text-gray-900">
          {existingPrediction ? 'Update your prediction' : 'Make your prediction'}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit}>
          <div className="flex items-center gap-4 mb-6">
            {/* Home team */}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-gray-700 mb-2 truncate">{homeTeam}</p>
              <ScoreInput value={homeScore} onChange={setHomeScore} />
            </div>

            <span className="text-2xl font-bold text-gray-300">–</span>

            {/* Away team */}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-gray-700 mb-2 truncate">{awayTeam}</p>
              <ScoreInput value={awayScore} onChange={setAwayScore} />
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mb-4">
            Predicted winner: <strong className="text-gray-900">{winner()}</strong>
          </p>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          {saved && (
            <p className="text-green-600 text-sm mb-3 text-center">Prediction saved ✓</p>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : existingPrediction ? 'Update prediction' : 'Submit prediction'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg flex items-center justify-center transition-colors"
      >
        −
      </button>
      <span className="text-4xl font-bold text-gray-900 w-12 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg flex items-center justify-center transition-colors"
      >
        +
      </button>
    </div>
  )
}
