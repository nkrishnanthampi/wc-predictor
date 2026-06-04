'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Sparkles } from 'lucide-react'
import type { Prediction } from '@/lib/supabase/types'

interface AiSuggestion {
  homeScore: number
  awayScore: number
  rationale: string
}

interface Props {
  matchId: string
  homeTeam: string
  awayTeam: string
  stage?: string
  existingPrediction?: Prediction
}

export function PredictionForm({ matchId, homeTeam, awayTeam, stage = 'group', existingPrediction }: Props) {
  const router = useRouter()
  const [homeScore, setHomeScore] = useState(existingPrediction?.predicted_home_score ?? 0)
  const [awayScore, setAwayScore] = useState(existingPrediction?.predicted_away_score ?? 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiError, setAiError] = useState('')

  async function fetchAiSuggestion() {
    setLoadingAi(true)
    setAiSuggestion(null)
    setAiError('')
    try {
      const res = await fetch(
        `/api/ai-prediction?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}&stage=${stage}`
      )
      const data = await res.json()
      console.log('[ai-prediction]', data)
      if (res.ok) {
        setAiSuggestion(data)
      } else {
        setAiError(data.detail ?? data.error ?? 'AI suggestion failed')
      }
    } catch {
      setAiError('Could not reach AI service')
    } finally {
      setLoadingAi(false)
    }
  }

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
      router.back()
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

          {/* AI suggestion */}
          <div className="mb-4">
            <button
              type="button"
              onClick={fetchAiSuggestion}
              disabled={loadingAi}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300 rounded-lg py-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loadingAi ? 'Getting AI suggestion…' : 'Suggest a score'}
            </button>

            {aiError && (
              <p className="mt-2 text-xs text-red-500 text-center">{aiError}</p>
            )}

            {aiSuggestion && (
              <div className="mt-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-500 mb-0.5">AI suggests</p>
                    <p className="text-lg font-bold text-purple-800">
                      {aiSuggestion.homeScore} – {aiSuggestion.awayScore}
                    </p>
                    <p className="text-xs text-purple-600 mt-0.5 leading-snug">{aiSuggestion.rationale}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHomeScore(aiSuggestion.homeScore)
                      setAwayScore(aiSuggestion.awayScore)
                    }}
                    className="ml-3 shrink-0 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md px-3 py-1.5 transition-colors"
                  >
                    Use this
                  </button>
                </div>
              </div>
            )}
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
