import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatKickoffShort, isPredictionLocked, matchResultLabel } from '@/lib/utils'
import { getEffectiveDate } from '@/lib/effective-date'
import { Lock, CheckCircle, Circle, CircleDot } from 'lucide-react'
import clsx from 'clsx'
import { MatchListScroll } from '@/components/matches/MatchListScroll'
import { CollapsibleStage } from '@/components/knockout/CollapsibleStage'
import { WatchOn } from '@/components/matches/WatchOn'

export default async function GroupMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('match_number', { ascending: true })

  const { data: myPredictions } = await supabase
    .from('predictions')
    .select('match_id, predicted_home_score, predicted_away_score, points_awarded')
    .eq('user_id', user.id)

  const predMap = new Map(myPredictions?.map(p => [p.match_id, p]) ?? [])
  const asOf = await getEffectiveDate()

  type Match = NonNullable<typeof matches>[number]

  // Group matches by group letter, preserving A–L order
  const groups = new Map<string, Match[]>()
  for (const m of matches ?? []) {
    const g = m.group_name ?? '?'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(m)
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))

  function cardBg(isFinished: boolean, points: number | null | undefined): string {
    if (!isFinished || points === null || points === undefined) return 'bg-white'
    if (points >= 2) return 'bg-green-50'
    if (points === 1) return 'bg-amber-50'
    return 'bg-red-50'
  }

  function renderMatchCard(match: Match) {
    const pred = predMap.get(match.id)
    const locked = isPredictionLocked(match.kickoff_time, asOf)
    const isFinished = match.status === 'finished'

    return (
      <Link key={match.id} href={`/matches/${match.id}`}>
        <div className={clsx(
          'rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer',
          cardBg(isFinished, pred?.points_awarded),
          !isFinished && locked && !pred && 'opacity-60',
        )}>
          <div className="px-5 py-3">
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
                </p>
                <WatchOn />

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
                    {isFinished && pred?.points_awarded !== null && pred?.points_awarded !== undefined && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className={clsx(
                          'font-bold',
                          pred.points_awarded > 0 ? 'text-green-600' : 'text-gray-400',
                        )}>
                          {pred.points_awarded > 0 ? `+${pred.points_awarded} pts` : '0 pts'}
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
                    : <span className="text-green-600">Predict →</span>}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <MatchListScroll>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Group Matches</h1>

        {sortedGroups.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p>No fixtures loaded yet. Check back soon or ask the admin to sync fixtures.</p>
          </div>
        )}

        {sortedGroups.map(([letter, groupMatches]) => {
          const finished = groupMatches.filter(m => m.status === 'finished')
          const upcoming = groupMatches.filter(m => m.status !== 'finished')
          const isCompleted = finished.length === groupMatches.length && groupMatches.length > 0
          const hasBoth = upcoming.length > 0 && finished.length > 0

          const badges = isCompleted ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">complete</span>
          ) : null

          const meta = (
            <>
              {upcoming.length > 0 && <span>{upcoming.length} upcoming</span>}
              {finished.length > 0 && <span>{finished.length} finished</span>}
            </>
          )

          return (
            <CollapsibleStage
              key={letter}
              title={`Group ${letter}`}
              defaultOpen={!isCompleted}
              badges={badges}
              meta={meta}
            >
              <div className="divide-y divide-gray-100">
                {upcoming.length > 0 && (
                  <div className="px-4 py-3">
                    {hasBoth && (
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Upcoming</p>
                    )}
                    <div className="space-y-2">
                      {upcoming.map(m => renderMatchCard(m))}
                    </div>
                  </div>
                )}
                {finished.length > 0 && (
                  <div className="px-4 py-3">
                    {hasBoth && (
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Finished</p>
                    )}
                    <div className="space-y-2">
                      {finished.map(m => renderMatchCard(m))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleStage>
          )
        })}
      </div>
    </MatchListScroll>
  )
}
