import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { fetchEspnTeamByName, fetchEspnTeamResults, type EspnResult } from '@/lib/espn/client'
import { fetchTeamByName, fetchTeamSquad, fetchTeamCoach } from '@/lib/football-api/client'
import { ArrowLeft, Star, Users } from 'lucide-react'
import clsx from 'clsx'

function matchOutcome(r: EspnResult, teamId: string): 'W' | 'D' | 'L' {
  const wasHome = r.homeId === teamId
  const mine = wasHome ? r.homeScore : r.awayScore
  const theirs = wasHome ? r.awayScore : r.homeScore
  if (mine > theirs) return 'W'
  if (mine < theirs) return 'L'
  return 'D'
}

const POSITION_LABELS: Record<string, string> = {
  Goalkeeper: 'Goalkeepers',
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Attacker: 'Forwards',
}

const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']

export default async function TeamPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const teamName = decodeURIComponent(name)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Phase 1: look up team IDs from both sources in parallel
  const [espnResult, afbResult] = await Promise.allSettled([
    fetchEspnTeamByName(teamName),
    fetchTeamByName(teamName),
  ])

  const espnTeam = espnResult.status === 'fulfilled' ? espnResult.value : null
  const afbTeam = afbResult.status === 'fulfilled' ? afbResult.value : null

  if (!espnTeam && !afbTeam) notFound()

  // Phase 2: fetch data using the IDs, in parallel
  const [resultsResult, squadResult, coachResult] = await Promise.allSettled([
    espnTeam ? fetchEspnTeamResults(espnTeam.id) : Promise.resolve([]),
    afbTeam ? fetchTeamSquad(afbTeam.id) : Promise.resolve([]),
    afbTeam ? fetchTeamCoach(afbTeam.id) : Promise.resolve(null),
  ])

  const results = resultsResult.status === 'fulfilled' ? resultsResult.value : []
  const squad = squadResult.status === 'fulfilled' ? squadResult.value : []
  const coach = coachResult.status === 'fulfilled' ? coachResult.value : null
  const rank = espnTeam?.rank ?? null

  const byPosition = POSITION_ORDER.map(pos => ({
    pos,
    players: squad
      .filter(p => p.position === pos)
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
  })).filter(g => g.players.length > 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        All Teams
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{teamName}</h1>
        {rank != null && (
          <span className="flex items-center gap-1.5 text-sm font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full shrink-0">
            <Star className="h-3.5 w-3.5" />
            FIFA #{rank}
          </span>
        )}
      </div>

      {/* Manager */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Manager</h2>
        </CardHeader>
        <CardBody>
          {coach ? (
            <p className="text-sm text-gray-700">
              {coach.name}
              {coach.nationality && (
                <span className="text-gray-400 ml-2">({coach.nationality})</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Not available</p>
          )}
        </CardBody>
      </Card>

      {/* Squad */}
      <Card className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Squad</h2>
        </CardHeader>
        <CardBody className="p-0">
          {byPosition.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Squad not available</p>
          ) : (
            byPosition.map(({ pos, players }) => (
              <div key={pos}>
                <p className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100">
                  {POSITION_LABELS[pos] ?? pos}
                </p>
                {players.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="w-6 text-right text-xs text-gray-400 shrink-0">
                      {p.number ?? '–'}
                    </span>
                    <span className="flex-1 text-sm text-gray-800">{p.name}</span>
                    {p.age > 0 && (
                      <span className="text-xs text-gray-400 shrink-0">{p.age}</span>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Last 10 results */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Last 10 Results</h2>
        </CardHeader>
        <CardBody className="p-0">
          {results.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No results available</p>
          ) : (
            results.map((r, i) => {
              const wasHome = r.homeId === (espnTeam?.id ?? '')
              const outcome = matchOutcome(r, espnTeam?.id ?? '')
              const opponent = wasHome ? r.awayTeam : r.homeTeam
              const score = `${r.homeScore} – ${r.awayScore}`
              const date = new Date(r.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: '2-digit',
              })

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 text-sm"
                >
                  <span
                    className={clsx(
                      'w-5 text-center font-bold shrink-0',
                      outcome === 'W' && 'text-green-600',
                      outcome === 'L' && 'text-red-500',
                      outcome === 'D' && 'text-yellow-600',
                    )}
                  >
                    {outcome}
                  </span>
                  <span className="w-16 text-xs text-gray-400 shrink-0">{date}</span>
                  <span className="w-12 font-semibold text-gray-700 shrink-0">{score}</span>
                  <span className="text-gray-500 truncate">vs {opponent}</span>
                </div>
              )
            })
          )}
        </CardBody>
      </Card>
    </div>
  )
}
