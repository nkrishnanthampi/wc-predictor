import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/scoring/points'
import {
  computeGroupStandings,
  buildR32Pairs,
  buildWinnerPairs,
  buildFinalPair,
  STAGE_KICKOFFS,
} from '@/lib/knockout/bracket'
import { NextResponse } from 'next/server'
import type { Match, MatchStage } from '@/lib/supabase/types'

const MATCH_NUM_BASE: Partial<Record<MatchStage, number>> = {
  round_of_32:   73,
  round_of_16:   89,
  quarter_final: 97,
  semi_final:    101,
  final:         104,
}

const rand = () => Math.floor(Math.random() * 4) // 0–3

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { stage } = await request.json() as { stage: MatchStage }
  const adminDb = createAdminClient()

  // Get test users
  const { data: testProfiles } = await adminDb
    .from('profiles')
    .select('id')
    .like('email', 'testuser_%')
  const testUserIds = (testProfiles ?? []).map(p => p.id)
  if (testUserIds.length === 0) {
    return NextResponse.json({ error: 'No test users found — run Reset first' }, { status: 400 })
  }

  // Get or seed fixtures for this stage
  const matches = stage === 'group'
    ? await getGroupMatches(adminDb)
    : await getOrSeedKnockoutMatches(adminDb, stage)

  if (matches.length === 0) {
    return NextResponse.json({
      error: `No ${stage} fixtures available — simulate and score the previous round first`,
    }, { status: 400 })
  }

  // Generate actual scores for all matches upfront
  const actuals = new Map(matches.map(m => [m.id, { home: rand(), away: rand() }]))

  // Build prediction rows with points calculated inline
  const predRows: {
    user_id: string
    match_id: string
    predicted_home_score: number
    predicted_away_score: number
    points_awarded: number
  }[] = []

  for (const userId of testUserIds) {
    for (const match of matches) {
      const predHome = rand()
      const predAway = rand()
      const actual = actuals.get(match.id)!
      predRows.push({
        user_id: userId,
        match_id: match.id,
        predicted_home_score: predHome,
        predicted_away_score: predAway,
        points_awarded: calculatePoints(stage, actual.home, actual.away, predHome, predAway),
      })
    }
  }

  // Upsert predictions in batches of 500
  const PRED_BATCH = 500
  for (let i = 0; i < predRows.length; i += PRED_BATCH) {
    await adminDb.from('predictions').upsert(predRows.slice(i, i + PRED_BATCH), {
      onConflict: 'user_id,match_id',
    })
  }

  // Update match scores in batches of 20
  const scoreEntries = [...actuals.entries()]
  const MATCH_BATCH = 20
  for (let i = 0; i < scoreEntries.length; i += MATCH_BATCH) {
    await Promise.all(
      scoreEntries.slice(i, i + MATCH_BATCH).map(([id, s]) =>
        adminDb.from('matches').update({
          home_score: s.home,
          away_score: s.away,
          status: 'finished',
          manual_override: true,
          updated_at: new Date().toISOString(),
        }).eq('id', id)
      )
    )
  }

  return NextResponse.json({
    success: true,
    stage,
    matchesSimulated: matches.length,
    predictionsCreated: predRows.length,
  })
}

async function getGroupMatches(adminDb: ReturnType<typeof createAdminClient>): Promise<Match[]> {
  const { data } = await adminDb
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('match_number', { ascending: true })
  return (data ?? []) as Match[]
}

async function getOrSeedKnockoutMatches(
  adminDb: ReturnType<typeof createAdminClient>,
  stage: MatchStage,
): Promise<Match[]> {
  // Return existing real fixtures if already seeded
  const { data: existing } = await adminDb
    .from('matches')
    .select('*')
    .eq('stage', stage)
    .is('generated_for_user_id', null)
    .order('match_number', { ascending: true })
  if (existing && existing.length > 0) return existing as Match[]

  // Seed fixtures from previous round
  const emptyPredMap = new Map<string, { home: number; away: number }>()
  const { data: allReal } = await adminDb
    .from('matches')
    .select('*')
    .is('generated_for_user_id', null)
    .order('match_number', { ascending: true })
  const real = (s: MatchStage) =>
    ((allReal ?? []) as Match[])
      .filter(m => m.stage === s)
      .sort((a, b) => (a.match_number ?? 9999) - (b.match_number ?? 9999))

  let pairs: Array<{ home: string; away: string }> = []
  switch (stage) {
    case 'round_of_32': {
      const group = real('group')
      if (!group.every(m => m.status === 'finished')) return []
      pairs = buildR32Pairs(computeGroupStandings(group, emptyPredMap))
      break
    }
    case 'round_of_16': {
      const r32 = real('round_of_32')
      if (r32.length === 0 || !r32.every(m => m.status === 'finished')) return []
      pairs = buildWinnerPairs(r32, emptyPredMap)
      break
    }
    case 'quarter_final': {
      const r16 = real('round_of_16')
      if (r16.length === 0 || !r16.every(m => m.status === 'finished')) return []
      pairs = buildWinnerPairs(r16, emptyPredMap)
      break
    }
    case 'semi_final': {
      const qf = real('quarter_final')
      if (qf.length === 0 || !qf.every(m => m.status === 'finished')) return []
      pairs = buildWinnerPairs(qf, emptyPredMap)
      break
    }
    case 'final': {
      const sf = real('semi_final')
      if (sf.length === 0 || !sf.every(m => m.status === 'finished')) return []
      const pair = buildFinalPair(sf, emptyPredMap)
      if (!pair) return []
      pairs = [pair]
      break
    }
    default:
      return []
  }

  const kickoffs = STAGE_KICKOFFS[stage] ?? []
  const base = MATCH_NUM_BASE[stage] ?? 200
  const { data: inserted } = await adminDb.from('matches').insert(
    pairs.map((p, i) => ({
      stage,
      home_team: p.home,
      away_team: p.away,
      kickoff_time: kickoffs[i] ?? kickoffs[kickoffs.length - 1] ?? new Date().toISOString(),
      status: 'scheduled' as const,
      match_number: base + i,
      updated_at: new Date().toISOString(),
    }))
  ).select()

  return (inserted ?? []) as Match[]
}
