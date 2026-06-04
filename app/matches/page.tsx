import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'
import { formatKickoffShort, isPredictionLocked, matchResultLabel } from '@/lib/utils'
import { getEffectiveDate } from '@/lib/effective-date'
import { Lock, CheckCircle, Circle, CircleDot } from 'lucide-react'
import clsx from 'clsx'
import { MatchListScroll } from '@/components/matches/MatchListScroll'

export default async function GroupMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('kickoff_time', { ascending: true })

  const { data: myPredictions } = await supabase
    .from('predictions')
    .select('match_id, predicted_home_score, predicted_away_score, points_awarded')
    .eq('user_id', user.id)

  const predMap = new Map(myPredictions?.map(p => [p.match_id, p]) ?? [])
  const asOf = await getEffectiveDate()

  const finished: typeof matches = []
  const upcoming: typeof matches = []

  for (const match of matches ?? []) {
    if (match.status === 'finished') finished.push(match)
    else upcoming.push(match)
  }

  type Match = NonNullable<typeof matches>[number]

  function renderMatchCard(match: Match) {
    const pred = predMap.get(match.id)
    const locked = isPredictionLocked(match.kickoff_time, asOf)
    const isFinished = match.status === 'finished'

    return (
      <Link key={match.id} href={`/matches/${match.id}`}>
        <Card className={clsx(
          'hover:shadow-md transition-shadow cursor-pointer',
          !isFinished && locked && !pred && 'opacity-60'
        )}>
          <CardBody className="py-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {isFinished ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : pred ? (
                  <CircleDot className="h-5 w-5 text-blue-500" />
                ) : locked ? (
                  <Lock className="h-5 w-5 text-gray-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <span className="truncate">{match.home_team ?? 'TBD'}</span>
                  <span className="text-gray-400 shrink-0">
                    {isFinished ? matchResultLabel(match.home_score, match.away_score) : 'vs'}
                  </span>
                  <span className="truncate">{match.away_team ?? 'TBD'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatKickoffShort(match.kickoff_time)}
                  {match.group_name && ` · Group ${match.group_name}`}
                </p>

                {(isFinished || pred) && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span>
                      <span className="text-gray-400">Result </span>
                      <span className="font-semibold text-gray-700">
                        {isFinished ? matchResultLabel(match.home_score, match.away_score) : 'TBC'}
                      </span>
                    </span>
                    <span className="text-gray-300">·</span>
                    <span>
                      <span className="text-gray-400">Pick </span>
                      {pred ? (
                        <span className="font-semibold text-gray-700">
                          {pred.predicted_home_score} – {pred.predicted_away_score}
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-400">0 – 0 (assumed)</span>
                      )}
                    </span>
                    {isFinished && (
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
                            : '0 pts'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!isFinished && !pred && (
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
  }

  return (
    <MatchListScroll>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Group Matches</h1>

        <div className="space-y-1">
          {finished.length > 0 && (
            <details>
              <summary className="cursor-pointer select-none text-sm font-semibold text-gray-500 uppercase tracking-wider py-1">
                Finished ({finished.length})
              </summary>
              <div className="mt-2 space-y-2">
                {finished.map(match => renderMatchCard(match))}
              </div>
            </details>
          )}

          {upcoming.length > 0 && (
            <details open>
              <summary className="cursor-pointer select-none text-sm font-semibold text-gray-500 uppercase tracking-wider py-1">
                Upcoming ({upcoming.length})
              </summary>
              <div className="mt-2 space-y-2">
                {upcoming.map(match => renderMatchCard(match))}
              </div>
            </details>
          )}
        </div>

        {!matches?.length && (
          <div className="text-center py-16 text-gray-500">
            <p>No fixtures loaded yet. Check back soon or ask the admin to sync fixtures.</p>
          </div>
        )}
      </div>
    </MatchListScroll>
  )
}
