import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'
import { formatKickoffShort, isPredictionLocked, STAGE_LABELS, matchResultLabel } from '@/lib/utils'
import type { MatchStage } from '@/lib/supabase/types'
import { Lock, CheckCircle, Circle } from 'lucide-react'
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

  // Group by stage
  const byStage = new Map<MatchStage, typeof matches>()
  const stageOrder: MatchStage[] = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']

  for (const match of matches ?? []) {
    const stage = match.stage as MatchStage
    if (!byStage.has(stage)) byStage.set(stage, [])
    byStage.get(stage)!.push(match)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Matches</h1>

      {stageOrder.filter(s => byStage.has(s)).map(stage => (
        <div key={stage} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {STAGE_LABELS[stage]}
          </h2>
          <div className="space-y-2">
            {byStage.get(stage)!.map(match => {
              const pred = predMap.get(match.id)
              const locked = isPredictionLocked(match.kickoff_time)
              const finished = match.status === 'finished'

              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <Card className={clsx(
                    'hover:shadow-md transition-shadow cursor-pointer',
                    locked && !pred && 'opacity-60'
                  )}>
                    <CardBody className="py-3">
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <div className="shrink-0">
                          {pred ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : locked ? (
                            <Lock className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>

                        {/* Teams */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <span className="truncate">{match.home_team ?? 'TBD'}</span>
                            <span className="text-gray-400 shrink-0">
                              {finished
                                ? matchResultLabel(match.home_score, match.away_score)
                                : 'vs'
                              }
                            </span>
                            <span className="truncate">{match.away_team ?? 'TBD'}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatKickoffShort(match.kickoff_time)}
                            {match.group_name && ` · Group ${match.group_name}`}
                          </p>
                        </div>

                        {/* My prediction / points */}
                        <div className="shrink-0 text-right">
                          {pred && (
                            <p className="text-sm font-medium text-gray-700">
                              {pred.predicted_home_score} – {pred.predicted_away_score}
                            </p>
                          )}
                          {pred?.points_awarded != null && (
                            <p className={clsx(
                              'text-xs font-semibold',
                              pred.points_awarded > 0 ? 'text-green-600' : 'text-gray-400'
                            )}>
                              {pred.points_awarded > 0 ? `+${pred.points_awarded} pts` : '0 pts'}
                            </p>
                          )}
                          {!pred && !locked && (
                            <span className="text-xs text-green-600 font-medium">Predict →</span>
                          )}
                          {!pred && locked && (
                            <span className="text-xs text-gray-400">Locked</span>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      {!matches?.length && (
        <div className="text-center py-16 text-gray-500">
          <p>No fixtures loaded yet. Check back soon or ask the admin to sync fixtures.</p>
        </div>
      )}
    </div>
  )
}
