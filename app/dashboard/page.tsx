import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatKickoff, formatKickoffShort, matchResultLabel, STAGE_LABELS } from '@/lib/utils'
import type { MatchStage } from '@/lib/supabase/types'
import { getEffectiveDateISO } from '@/lib/effective-date'
import { cookies } from 'next/headers'
import { Trophy, CheckCircle, CircleDot } from 'lucide-react'
import { LeagueSelector } from '@/components/home/LeagueSelector'
import { WatchOn } from '@/components/matches/WatchOn'
import { CollapsibleStage } from '@/components/knockout/CollapsibleStage'
import clsx from 'clsx'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>
}) {
  const { league: leagueParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  // Auto-enroll: if user has no memberships and exactly one league exists, join it
  // Uses admin client to bypass RLS (non-members can't read the leagues table)
  const adminSupabase = createAdminClient()
  const { data: existingMemberships } = await adminSupabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user.id)

  if (!existingMemberships?.length) {
    const { data: allLeagues } = await adminSupabase.from('leagues').select('id')
    if (allLeagues?.length === 1) {
      await adminSupabase
        .from('league_members')
        .insert({ league_id: allLeagues[0].id, user_id: user.id })
    }
  }

  const now = await getEffectiveDateISO()

  // Upcoming matches
  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'scheduled')
    .gt('kickoff_time', now)
    .order('kickoff_time', { ascending: true })
    .limit(5)

  const upcomingMatchIds = upcomingMatches?.map(m => m.id) ?? []
  const { data: upcomingPredictions } = upcomingMatchIds.length > 0
    ? await supabase
        .from('predictions')
        .select('match_id, predicted_home_score, predicted_away_score')
        .eq('user_id', user.id)
        .in('match_id', upcomingMatchIds)
    : { data: [] }

  const predictionByMatch = Object.fromEntries(
    (upcomingPredictions ?? []).map(p => [p.match_id, p])
  )

  // User's leagues
  type LeagueRow = { id: string; name: string }
  type MembershipWithLeague = { league_id: string; leagues: LeagueRow | null }

  const { data: membershipsRaw } = await supabase
    .from('league_members')
    .select('league_id, leagues(id, name)')
    .eq('user_id', user.id)

  const memberships = (membershipsRaw as MembershipWithLeague[] | null) ?? []
  const leagueIds = memberships.map(m => m.league_id)
  const leagues = memberships
    .map(m => m.leagues)
    .filter((l): l is LeagueRow => l !== null)

  // Member count per league to determine default
  const memberCounts: Record<string, number> = {}
  if (leagueIds.length > 0) {
    const { data: allMembers } = await supabase
      .from('league_members')
      .select('league_id')
      .in('league_id', leagueIds)
    for (const m of allMembers ?? []) {
      memberCounts[m.league_id] = (memberCounts[m.league_id] ?? 0) + 1
    }
  }

  const defaultLeagueId = [...leagueIds].sort(
    (a, b) => (memberCounts[b] ?? 0) - (memberCounts[a] ?? 0)
  )[0]
  const cookieStore = await cookies()
  const cookieLeague = cookieStore.get('preferred_league_id')?.value
  const selectedLeagueId =
    leagueParam && leagueIds.includes(leagueParam) ? leagueParam
    : cookieLeague && leagueIds.includes(cookieLeague) ? cookieLeague
    : defaultLeagueId

  // Leaderboard for selected league
  const { data: leaderboard } = selectedLeagueId
    ? await supabase
        .from('leaderboard')
        .select('*')
        .eq('league_id', selectedLeagueId)
        .order('total_points', { ascending: false })
    : { data: [] }

  // Knockout predictions (non-group stages)
  type KnockoutPrediction = {
    predicted_home_score: number
    predicted_away_score: number
    points_awarded: number | null
    matches: {
      id: string
      home_team: string | null
      away_team: string | null
      kickoff_time: string
      stage: string
      home_score: number | null
      away_score: number | null
      status: string
    }
  }

  const { data: knockoutRaw } = await supabase
    .from('predictions')
    .select('predicted_home_score, predicted_away_score, points_awarded, matches!inner(id, home_team, away_team, kickoff_time, stage, home_score, away_score, status)')
    .eq('user_id', user.id)
    .neq('matches.stage', 'group')
    .order('kickoff_time', { referencedTable: 'matches', ascending: true })

  const knockoutPredictions = (knockoutRaw as unknown as KnockoutPrediction[]) ?? []

  const profile = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (!profile.data?.display_name) redirect('/onboarding')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile.data?.display_name ?? 'Player'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">FIFA World Cup 2026</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming matches */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Upcoming Matches</h2>
            <Link href="/matches" className="text-sm text-green-700 hover:underline">View all</Link>
          </CardHeader>
          <CardBody className="p-0">
            {upcomingMatches?.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-500">No upcoming matches.</p>
            )}
            {upcomingMatches?.map(match => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center justify-between px-5 py-3 border-b border-gray-50 hover:bg-gray-50 last:border-0 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {match.home_team ?? 'TBD'} vs {match.away_team ?? 'TBD'}
                  </p>
                  <p className="text-xs text-gray-500">{formatKickoff(match.kickoff_time)}</p>
                  <WatchOn />
                </div>
                {predictionByMatch[match.id] ? (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {predictionByMatch[match.id].predicted_home_score} – {predictionByMatch[match.id].predicted_away_score}
                  </span>
                ) : (
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Predict →
                  </span>
                )}
              </Link>
            ))}
          </CardBody>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="font-semibold text-gray-900">Leaderboard</h2>
            </div>
            {leagues.length > 1 ? (
              <LeagueSelector leagues={leagues} selectedLeagueId={selectedLeagueId ?? ''} />
            ) : leagues.length === 1 ? (
              <span className="text-xs text-gray-400">{leagues[0].name}</span>
            ) : null}
          </CardHeader>
          <CardBody className="p-0">
            {leagues.length === 0 ? (
              <div className="px-5 py-4">
                <p className="text-sm text-gray-500 mb-2">You haven&apos;t joined any leagues yet.</p>
                {isAdmin && (
                  <Link href="/leagues/new" className="text-sm text-green-700 hover:underline font-medium">
                    Create a league →
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="max-h-80 overflow-y-auto">
                  {leaderboard?.map((row, idx) => (
                    <div
                      key={row.user_id}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-1.5 border-b border-gray-50 last:border-0',
                        row.user_id === user.id && 'bg-green-50'
                      )}
                    >
                      <span className={clsx(
                        'w-5 shrink-0 text-center text-xs font-bold',
                        idx === 0 && 'text-yellow-500',
                        idx === 1 && 'text-gray-400',
                        idx === 2 && 'text-orange-400',
                        idx > 2 && 'text-gray-300'
                      )}>
                        {idx + 1}
                      </span>
                      <p className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                        {row.display_name}
                        {row.user_id === user.id && (
                          <span className="ml-1 text-xs text-green-600">(you)</span>
                        )}
                      </p>
                      <span className="shrink-0 text-sm font-bold text-gray-900">
                        {row.total_points}
                        <span className="text-xs font-normal text-gray-400 ml-0.5">pts</span>
                      </span>
                    </div>
                  ))}
                </div>
                {!leaderboard?.length && (
                  <p className="px-5 py-4 text-sm text-gray-500">
                    No predictions scored yet. Check back after matches start!
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {knockoutPredictions.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">My Knockout Predictions</h2>
          {(['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'] as MatchStage[]).map(stage => {
            const stagePreds = knockoutPredictions.filter(p => p.matches.stage === stage)
            if (stagePreds.length === 0) return null

            const finishedCount = stagePreds.filter(p => p.matches.status === 'finished').length
            const upcomingCount = stagePreds.length - finishedCount
            const isCompleted = finishedCount === stagePreds.length

            const meta = (
              <>
                {upcomingCount > 0 && <span>{upcomingCount} upcoming</span>}
                {finishedCount > 0 && <span>{finishedCount} finished</span>}
              </>
            )

            const badges = isCompleted ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">complete</span>
            ) : null

            return (
              <CollapsibleStage
                key={stage}
                title={STAGE_LABELS[stage]}
                defaultOpen={!isCompleted}
                badges={badges}
                meta={meta}
              >
                <div className="divide-y divide-gray-100">
                  {stagePreds.map((p, idx) => {
                    const m = p.matches
                    const finished = m.status === 'finished'
                    return (
                      <Link
                        key={`${m.id}-${idx}`}
                        href={`/matches/${m.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="shrink-0">
                          {finished
                            ? <CheckCircle className="h-5 w-5 text-green-500" />
                            : <CircleDot className="h-5 w-5 text-blue-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <span className="truncate">{m.home_team ?? 'TBD'}</span>
                            <span className="text-gray-400 shrink-0">
                              {finished ? matchResultLabel(m.home_score, m.away_score) : 'vs'}
                            </span>
                            <span className="truncate">{m.away_team ?? 'TBD'}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{formatKickoffShort(m.kickoff_time)}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            <span>
                              <span className="text-gray-400">Result </span>
                              <span className="font-semibold text-gray-700">
                                {finished ? matchResultLabel(m.home_score, m.away_score) : 'TBC'}
                              </span>
                            </span>
                            <span className="text-gray-300">·</span>
                            <span>
                              <span className="text-gray-400">Pick </span>
                              <span className="font-semibold text-gray-700">
                                {p.predicted_home_score} – {p.predicted_away_score}
                              </span>
                            </span>
                            {p.points_awarded !== null && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className={clsx(
                                  'font-bold',
                                  p.points_awarded > 0 ? 'text-green-600' : 'text-gray-400'
                                )}>
                                  {p.points_awarded > 0 ? `+${p.points_awarded} pts` : '0 pts'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CollapsibleStage>
            )
          })}
        </div>
      )}
    </div>
  )
}
