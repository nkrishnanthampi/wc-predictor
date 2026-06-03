import { NextRequest, NextResponse } from 'next/server'
import { fetchEspnTeamByName, fetchEspnTeamResults, type EspnResult } from '@/lib/espn/client'

export interface TeamResult {
  date: string
  opponent: string
  homeGoals: number
  awayGoals: number
  wasHome: boolean
  competition: string
}

function toResult(r: EspnResult, teamId: string): TeamResult {
  const wasHome = r.homeId === teamId
  return {
    date: r.date,
    opponent: wasHome ? r.awayTeam : r.homeTeam,
    homeGoals: r.homeScore,
    awayGoals: r.awayScore,
    wasHome,
    competition: r.competition,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ error: 'homeTeam and awayTeam are required' }, { status: 400 })
  }

  const [homeEspn, awayEspn] = await Promise.all([
    fetchEspnTeamByName(homeTeam),
    fetchEspnTeamByName(awayTeam),
  ])

  if (!homeEspn || !awayEspn) {
    return NextResponse.json(
      { error: `Could not find team(s): ${!homeEspn ? homeTeam : awayTeam}` },
      { status: 404 }
    )
  }

  const [homeResults, awayResults] = await Promise.all([
    fetchEspnTeamResults(homeEspn.id),
    fetchEspnTeamResults(awayEspn.id),
  ])

  return NextResponse.json({
    home: homeResults.map(r => toResult(r, homeEspn.id)),
    away: awayResults.map(r => toResult(r, awayEspn.id)),
  })
}
