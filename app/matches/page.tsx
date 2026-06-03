import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'
import { formatKickoffShort, isPredictionLocked, STAGE_LABELS, matchResultLabel } from '@/lib/utils'
import { getEffectiveDate } from '@/lib/effective-date'
import type { MatchStage } from '@/lib/supabase/types'
import { Lock, CheckCircle, Circle, CircleDot } from 'lucide-react'
import clsx from 'clsx'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff_time', { ascending: true })

  const { data: myPredictions } = await supabase
    .from('predictions')
    .select('match_id, predicted_home_score, predicted_away_score, points_awarded')
    .eq('user_id', user.id)

  const predMap = new Map(myPredictions?.map(p => [p.match_id, p]) ?? [])
  const asOf = await getEffectiveDate()

  const finishedByStage = new Map<MatchStage, typeof matches>()
  const upcomingByStage = new Map<MatchStage, typeof matches>()
  const stageOrder: MatchStage[] = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']

  for (const match of matches ?? []) {
    const stage = match.stage as MatchStage
    const map = match.status === 'finished' ? finishedByStage : upcomingByStage
    if (!map.has(stage)) map.set(stage, [])
    map.get(stage)!.push(match)
  }

  const finishedCount = [...finishedByStage.values()].reduce((sum, arr) => sum + (arr?.length ?? 0), 0)
  const upcomingCount = [...upcomingByStage.values()].reduce((sum, arr) => sum + (arr?.length ?? 0), 0)

  function renderStages(byStage: Map<MatchStage, typeof matches>) {
    return stageOrder.filter(s => byStage.has(s)).map(stage => (
      <div key={stage} className="mb-8">
        {stage !== 'group' && (
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {STAGE_LABELS[stage]}
          </h2>
        )}
        <div className="space-y-2">
          {byStage.get(stage)!.map(match => {
            const pred = predMap.get(match.id)
            const locked = isPredictionLocked(match.kickoff_time, asOf)
            const finished = match.status === 'finished'

            return (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <Card className={clsx(
                  'hover:shadow-md transition-shadow cursor-pointer',
                  !finished && locked && !pred && 'opacity-60'
                )}>
                  <CardBody className="py-3">
                    <div className="flex items-center gap-3">
                      {/* Status icon */}
                      <div className="shrink-0">
                        {finished ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : pred ? (
                          <CircleDot className="h-5 w-5 text-blue-500" />
                        ) : locked ? (
                          <Lock className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>

                      {/* Teams + info strip */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <span className="truncate">{match.home_team ?? 'TBD'}</span>
                          <span className="text-gray-400 shrink-0">
                            {finished ? matchResultLabel(match.home_score, match.away_score) : 'vs'}
                          </span>
                          <span className="truncate">{match.away_team ?? 'TBD'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatKickoffShort(match.kickoff_time)}
                          {match.group_name && ` · Group ${match.group_name}`}
                        </p>

                        {(finished || pred) && (
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            <span>
                              <span className="text-gray-400">Result </span>
                              <span className="font-semibold text-gray-700">
                                {finished ? matchResultLabel(match.home_score, match.away_score) : 'TBC'}
                              </span>
                            </span>
                            <span className="text-gray-300">·</span>
                            <span>
                              <span className="text-gray-400">Pick </span>
                              <span className="font-semibold text-gray-700">
                                {pred ? `${pred.predicted_home_score} – ${pred.predicted_away_score}` : '—'}
                              </span>
                            </span>
                            {finished && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className={clsx(
                                  'font-bold',
                                  pred?.points_awarded != null && pred.points_awarded > 0
                                    ? 'text-green-600'
                                    : 'text-gray-400'
                                )}>
                                  {pred?.points_awarded != null
                                    ? pred.points_awarded > 0 ? `+${pred.points_awarded} pts` : '0 pts'
                                    : pred ? 'Pending' : '0 pts'}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right side: upcoming with no prediction only */}
                      {!finished && !pred && (
                        <span className="shrink-0 text-xs font-medium">
                          {locked
                            ? <span className="text-gray-400">Not predicted</span>
                            : <span className="text-green-600">Predict →</span>
                          }
                        </span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    ))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Matches</h1>

      {finishedCount > 0 && (
        <details className="mb-6">
          <summary className="cursor-pointer select-none text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 py-1">
            Finished ({finishedCount})
          </summary>
          <div className="mt-4">
            {renderStages(finishedByStage)}
          </div>
        </details>
      )}

      {upcomingCount > 0 && (
        <details open className="mb-6">
          <summary className="cursor-pointer select-none text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 py-1">
            Upcoming ({upcomingCount})
          </summary>
          <div className="mt-4">
            {renderStages(upcomingByStage)}
          </div>
        </details>
      )}

      {!matches?.length && (
        <div className="text-center py-16 text-gray-500">
          <p>No fixtures loaded yet. Check back soon or ask the admin to sync fixtures.</p>
        </div>
      )}
    </div>
  )
}
