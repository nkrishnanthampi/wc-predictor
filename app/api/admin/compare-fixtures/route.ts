import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FD_BASE = 'https://api.football-data.org/v4'

interface FdMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  score: { fullTime: { home: number | null; away: number | null } }
}

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim()
}

function pairKey(home: string, away: string): string {
  return `${norm(home)}|${norm(away)}`
}

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE:          'group',
  ROUND_OF_32:          'round_of_32',
  ROUND_OF_16:          'round_of_16',
  QUARTER_FINALS:       'quarter_final',
  SEMI_FINALS:          'semi_final',
  THIRD_PLACE:          'third_place',
  THIRD_PLACE_PLAY_OFF: 'third_place',
  FINAL:                'final',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY not set' }, { status: 500 })

  const res = await fetch(`${FD_BASE}/competitions/WC/matches?season=2026`, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) {
    return NextResponse.json({ error: `football-data.org: ${res.status} ${res.statusText}` }, { status: 502 })
  }
  const { matches: apiMatches }: { matches: FdMatch[] } = await res.json()

  const adminClient = await createAdminClient()
  const { data: dbMatches } = await adminClient
    .from('matches')
    .select('*')
    .is('generated_for_user_id', null)
    .order('kickoff_time')

  const dbByPair = new Map<string, NonNullable<typeof dbMatches>[0]>()
  for (const m of dbMatches ?? []) {
    dbByPair.set(pairKey(m.home_team ?? '', m.away_team ?? ''), m)
  }

  const matchedDbIds = new Set<string>()
  const onlyInApi: { home: string; away: string; date: string; stage: string }[] = []
  const differences: {
    home_api: string; away_api: string
    home_db: string | null; away_db: string | null
    kickoff_api: string; kickoff_db: string
    stage_api: string; stage_db: string
    fields: string[]
    swapped: boolean
  }[] = []

  for (const f of apiMatches) {
    const key = pairKey(f.homeTeam.name, f.awayTeam.name)
    const reversedKey = pairKey(f.awayTeam.name, f.homeTeam.name)

    let dbMatch = dbByPair.get(key)
    let swapped = false
    if (!dbMatch) {
      dbMatch = dbByPair.get(reversedKey)
      swapped = !!dbMatch
    }

    if (!dbMatch) {
      onlyInApi.push({
        home: f.homeTeam.name,
        away: f.awayTeam.name,
        date: f.utcDate.slice(0, 10),
        stage: STAGE_MAP[f.stage] ?? f.stage,
      })
      continue
    }

    matchedDbIds.add(dbMatch.id)

    const fields: string[] = []
    if (swapped) fields.push('teams_swapped')

    if (f.utcDate.slice(0, 10) !== dbMatch.kickoff_time.slice(0, 10)) fields.push('kickoff_date')

    const apiStage = STAGE_MAP[f.stage] ?? f.stage
    if (apiStage !== dbMatch.stage) fields.push('stage')

    if (!swapped) {
      if (norm(f.homeTeam.name) !== norm(dbMatch.home_team ?? '')) fields.push('home_team_name')
      if (norm(f.awayTeam.name) !== norm(dbMatch.away_team ?? '')) fields.push('away_team_name')
    }

    if (fields.length > 0) {
      differences.push({
        home_api: f.homeTeam.name,
        away_api: f.awayTeam.name,
        home_db: dbMatch.home_team,
        away_db: dbMatch.away_team,
        kickoff_api: f.utcDate,
        kickoff_db: dbMatch.kickoff_time,
        stage_api: apiStage,
        stage_db: dbMatch.stage,
        fields,
        swapped,
      })
    }
  }

  const onlyInDb = (dbMatches ?? [])
    .filter(m => !matchedDbIds.has(m.id))
    .map(m => ({
      id: m.id,
      home: m.home_team,
      away: m.away_team,
      date: m.kickoff_time.slice(0, 10),
      stage: m.stage,
    }))

  return NextResponse.json({
    summary: {
      apiTotal: apiMatches.length,
      dbTotal: dbMatches?.length ?? 0,
      matched: matchedDbIds.size,
      onlyInApi: onlyInApi.length,
      onlyInDb: onlyInDb.length,
      withDifferences: differences.length,
    },
    onlyInApi,
    onlyInDb,
    differences,
  })
}
