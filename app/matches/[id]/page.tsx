import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PredictionForm } from '@/components/matches/PredictionForm'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatKickoff, isPredictionLocked, STAGE_LABELS, matchResultLabel } from '@/lib/utils'
import { getEffectiveDate } from '@/lib/effective-date'
import { calculatePoints } from '@/lib/scoring/points'
import type { MatchStage } from '@/lib/supabase/types'
import { Lock, Trophy } from 'lucide-react'
import { TeamResults } from '@/components/matches/TeamResults'
import { BackButton } from '@/components/ui/BackButton'
import clsx from 'clsx'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  const { data: prediction } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .eq('match_id', id)
    .maybeSingle()

  const asOf = await getEffectiveDate()
  const locked = isPredictionLocked(match.kickoff_time, asOf)
  const finished = match.status === 'finished'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <BackButton />
      <p className="text-sm text-gray-500 mb-1">{STAGE_LABELS[match.stage as MatchStage]}</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {match.home_team ?? 'TBD'} vs {match.away_team ?? 'TBD'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">{formatKickoff(match.kickoff_time)}</p>

      {/* Final result */}
      {finished && (
        <Card className="mb-4 bg-gray-50">
          <CardBody className="text-center py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Final Score</p>
            <p className="text-3xl font-bold text-gray-900">
              {matchResultLabel(match.home_score, match.away_score)}
            </p>
          </CardBody>
        </Card>
      )}

      {/* My prediction result */}
      {prediction && finished && match.home_score != null && match.away_score != null && (
        <Card className="mb-4">
          <CardBody>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Prediction</p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold text-gray-800">
                {prediction.predicted_home_score} – {prediction.predicted_away_score}
              </p>
              <div className="text-right">
                {prediction.points_awarded != null ? (
                  <p className={clsx(
                    'text-xl font-bold',
                    prediction.points_awarded > 0 ? 'text-green-600' : 'text-gray-400'
                  )}>
                    {prediction.points_awarded > 0 ? `+${prediction.points_awarded}` : '0'} pts
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Points pending</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Prediction form or locked state */}
      {locked ? (
        <Card>
          <CardBody className="text-center py-8">
            <Lock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {prediction
                ? `Your prediction: ${prediction.predicted_home_score} – ${prediction.predicted_away_score}`
                : 'Predictions are closed for this match.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <PredictionForm
          matchId={match.id}
          homeTeam={match.home_team ?? 'Home'}
          awayTeam={match.away_team ?? 'Away'}
          stage={match.stage}
          existingPrediction={prediction ?? undefined}
        />
      )}

      {match.home_team && match.away_team && (
        <TeamResults homeTeam={match.home_team} awayTeam={match.away_team} />
      )}

      {/* Scoring guide */}
      <Card className="mt-4 bg-blue-50 border-blue-100">
        <CardBody className="py-3">
          <p className="text-xs font-semibold text-blue-800 mb-1.5">Points for this match</p>
          <div className="text-xs text-blue-700 space-y-0.5">
            <p>Correct winner: <strong>{1 * pointMultiplier(match.stage as MatchStage)} pt</strong></p>
            <p>Exact scoreline: <strong>{2 * pointMultiplier(match.stage as MatchStage)} pts</strong></p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function pointMultiplier(stage: MatchStage): number {
  const map: Record<MatchStage, number> = {
    group: 1, round_of_32: 2, round_of_16: 3,
    quarter_final: 4, semi_final: 5, third_place: 3, final: 6,
  }
  return map[stage]
}
