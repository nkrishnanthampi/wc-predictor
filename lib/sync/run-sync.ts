import { createAdminClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/scoring/points'
import type { MatchStage } from '@/lib/supabase/types'

const FD_BASE = 'https://api.football-data.org/v4'

interface FdMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  homeTeam: { name: string | null }
  awayTeam: { name: string | null }
  score: { fullTime: { home: number | null; away: number | null } }
}

const KNOCKOUT_STAGE_MAP: Record<string, MatchStage> = {
  ROUND_OF_32:          'round_of_32',
  ROUND_OF_16:          'round_of_16',
  QUARTER_FINALS:       'quarter_final',
  SEMI_FINALS:          'semi_final',
  THIRD_PLACE_PLAY_OFF: 'third_place',
  FINAL:                'final',
}

const KNOCKOUT_MATCH_NUM_BASE: Record<string, number> = {
  ROUND_OF_32:          73,
  ROUND_OF_16:          89,
  QUARTER_FINALS:       97,
  SEMI_FINALS:          101,
  THIRD_PLACE_PLAY_OFF: 103,
  FINAL:                104,
}

function fdStatusToDb(status: string): 'scheduled' | 'live' | 'finished' | 'postponed' {
  switch (status) {
    case 'FINISHED':                                       return 'finished'
    case 'IN_PLAY': case 'PAUSED': case 'HALFTIME':       return 'live'
    case 'POSTPONED': case 'CANCELLED': case 'SUSPENDED': return 'postponed'
    default:                                               return 'scheduled'
  }
}

export interface SyncResult {
  fixturesInserted: number
  fixturesUpdated: number
  matchesUpdated: number
  predictionsScored: number
}

export async function runSync(): Promise<SyncResult> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not set')

  const res = await fetch(`${FD_BASE}/competitions/WC/matches?season=2026`, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`football-data.org: ${res.status} ${res.statusText}`)

  const { matches: allMatches }: { matches: FdMatch[] } = await res.json()
  const adminClient = await createAdminClient()

  // ── 1. Sync knockout fixtures ───────────────────────────────────────────────
  const knockoutMatches = allMatches.filter(f => KNOCKOUT_STAGE_MAP[f.stage])

  const { data: existingKnockout } = await adminClient
    .from('matches')
    .select('id, api_match_id, home_team, away_team, status')
    .is('generated_for_user_id', null)
    .in('stage', Object.values(KNOCKOUT_STAGE_MAP))

  const existingByApiId = new Map((existingKnockout ?? []).map(r => [r.api_match_id, r]))

  const byStage = new Map<string, FdMatch[]>()
  for (const f of knockoutMatches) {
    if (!byStage.has(f.stage)) byStage.set(f.stage, [])
    byStage.get(f.stage)!.push(f)
  }
  for (const arr of byStage.values()) {
    arr.sort((a, b) => a.utcDate < b.utcDate ? -1 : a.utcDate > b.utcDate ? 1 : a.id - b.id)
  }

  let fixturesInserted = 0
  let fixturesUpdated = 0

  for (const [fdStage, fixtures] of byStage) {
    const dbStage = KNOCKOUT_STAGE_MAP[fdStage]
    const matchNumBase = KNOCKOUT_MATCH_NUM_BASE[fdStage] ?? 200

    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i]
      const home = f.homeTeam.name ?? null
      const away = f.awayTeam.name ?? null
      const existing = existingByApiId.get(f.id)

      if (existing) {
        const needsTeamUpdate = (!existing.home_team && home) || (!existing.away_team && away)
        const nowFinished = fdStatusToDb(f.status) === 'finished' && existing.status !== 'finished'
        if (needsTeamUpdate || nowFinished) {
          await adminClient.from('matches').update({
            ...(needsTeamUpdate ? { home_team: home, away_team: away } : undefined),
            ...(nowFinished ? {
              status: 'finished' as const,
              home_score: f.score.fullTime.home,
              away_score: f.score.fullTime.away,
            } : undefined),
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
          fixturesUpdated++
        }
        continue
      }

      const { error } = await adminClient.from('matches').insert({
        stage: dbStage,
        home_team: home,
        away_team: away,
        kickoff_time: new Date(f.utcDate).toISOString(),
        status: fdStatusToDb(f.status),
        api_match_id: f.id,
        match_number: matchNumBase + i,
        home_score: f.score.fullTime.home,
        away_score: f.score.fullTime.away,
        updated_at: new Date().toISOString(),
      })
      if (!error) fixturesInserted++
    }
  }

  // ── 2. Score finished matches ───────────────────────────────────────────────
  const finished = allMatches.filter(
    f => f.status === 'FINISHED' &&
         f.score.fullTime.home !== null &&
         f.score.fullTime.away !== null
  )

  let matchesUpdated = 0
  let predictionsScored = 0

  for (const f of finished) {
    const { data: match } = await adminClient
      .from('matches')
      .update({
        home_score: f.score.fullTime.home,
        away_score: f.score.fullTime.away,
        status: 'finished',
        updated_at: new Date().toISOString(),
      })
      .eq('api_match_id', f.id)
      .eq('manual_override', false)
      .select('id, stage')
      .single()

    if (!match) continue
    matchesUpdated++

    const { data: predictions } = await adminClient
      .from('predictions')
      .select('id, predicted_home_score, predicted_away_score')
      .eq('match_id', match.id)
      .is('points_awarded', null)

    for (const pred of predictions ?? []) {
      const pts = calculatePoints(
        match.stage as MatchStage,
        f.score.fullTime.home!,
        f.score.fullTime.away!,
        pred.predicted_home_score,
        pred.predicted_away_score,
      )
      await adminClient.from('predictions').update({ points_awarded: pts }).eq('id', pred.id)
      predictionsScored++
    }
  }

  return { fixturesInserted, fixturesUpdated, matchesUpdated, predictionsScored }
}
