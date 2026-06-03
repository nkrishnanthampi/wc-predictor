import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatKickoff } from '@/lib/utils'
import { getEffectiveDateISO } from '@/lib/effective-date'
import { Calendar, Users, TrendingUp, Clock } from 'lucide-react'
import type { League } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

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

  // User's predictions with match info
  const { data: recentPredictions } = await supabase
    .from('predictions')
    .select('*, matches(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // User's leagues
  const { data: membershipsRaw } = await supabase
    .from('league_members')
    .select('*, leagues(*)')
    .eq('user_id', user.id)
  const memberships = membershipsRaw as unknown as Array<{ leagues: League | null }> | null

  // Total points across all predictions
  const { data: pointsData } = await supabase
    .from('predictions')
    .select('points_awarded')
    .eq('user_id', user.id)
    .not('points_awarded', 'is', null)

  const totalPoints = pointsData?.reduce((sum, p) => sum + (p.points_awarded ?? 0), 0) ?? 0

  const profile = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile.data?.display_name ?? 'Player'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">FIFA World Cup 2026</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp} label="Total points" value={totalPoints} color="text-green-600" />
        <StatCard icon={Calendar} label="Predictions made" value={recentPredictions?.length ?? 0} color="text-blue-600" />
        <StatCard icon={Users} label="Leagues" value={memberships?.length ?? 0} color="text-purple-600" />
        <StatCard icon={Clock} label="Upcoming to predict" value={upcomingMatches?.length ?? 0} color="text-orange-600" />
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

        {/* My leagues */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Leagues</h2>
            <Link href="/leagues" className="text-sm text-green-700 hover:underline">Manage</Link>
          </CardHeader>
          <CardBody className="p-0">
            {memberships?.length === 0 && (
              <div className="px-5 py-4">
                <p className="text-sm text-gray-500 mb-2">You haven&apos;t joined any leagues yet.</p>
                <Link href="/leagues/new" className="text-sm text-green-700 hover:underline font-medium">
                  Create a league →
                </Link>
              </div>
            )}
            {memberships?.map((m) => {
              const league = m.leagues
              return league && (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="flex items-center justify-between px-5 py-3 border-b border-gray-50 hover:bg-gray-50 last:border-0 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{league.name}</p>
                  <span className="text-xs text-gray-400">Leaderboard →</span>
                </Link>
              )
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3 py-3">
        <Icon className={`h-8 w-8 ${color} shrink-0`} />
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}
