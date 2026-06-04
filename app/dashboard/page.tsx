import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatKickoff, STAGE_LABELS } from '@/lib/utils'
import type { MatchStage } from '@/lib/supabase/types'
import { getEffectiveDateISO } from '@/lib/effective-date'
import { Trophy } from 'lucide-react'
import { LeagueSelector } from '@/components/home/LeagueSelector'
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
  const selectedLeagueId =
    leagueParam && leagueIds.includes(leagueParam) ? leagueParam : defaultLeagueId

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
                {leaderboard?.map((row, idx) => (
                  <div
                    key={row.user_id}
                    className={clsx(
                      'flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0',
                      row.user_id === user.id && 'bg-green-50'
                    )}
                  >
                    <span className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                      idx === 0 && 'bg-yellow-100 text-yellow-700',
                      idx === 1 && 'bg-gray-100 text-gray-600',
                      idx === 2 && 'bg-orange-100 text-orange-700',
                      idx > 2 && 'text-gray-400'
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {row.display_name}
                        {row.user_id === user.id && (
                          <span className="ml-1 text-xs text-green-600">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {row.predictions_scored}/{row.total_predictions} scored
                      </p>
                    </div>
                    <span className="text-lg font-bold text-gray-900 shrink-0">
                      {row.total_points} pts
                    </span>
                  </div>
                ))}
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
        <Card className="mt-6">
          <CardHeader>
            <h2 className="font-semibold text-gray-900">My Knockout Predictions</h2>
          </CardHeader>
          <CardBody className="p-0">
            {knockoutPredictions.map((p, idx) => {
              const m = p.matches
              const finished = m.status === 'finished'
              return (
                <Link
                  key={`${m.id}-${idx}`}
                  href={`/knockout`}
                  className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 last:border-0 transition-colors"
                >
                  <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">
                    {STAGE_LABELS[m.stage as MatchStage] ?? m.stage}
                  </span>
                  <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                    {m.home_team ?? 'TBD'} vs {m.away_team ?? 'TBD'}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {p.predicted_home_score} – {p.predicted_away_score}
                    </span>
                    {finished && m.home_score !== null && m.away_score !== null && (
                      <span className="text-xs text-gray-400">
                        ({m.home_score}–{m.away_score})
                      </span>
                    )}
                    {p.points_awarded !== null ? (
                      <span className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        p.points_awarded > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
                      )}>
                        {p.points_awarded} pts
                      </span>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
