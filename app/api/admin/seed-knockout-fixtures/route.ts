import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import {
  computeGroupStandings,
  buildR32Pairs,
  buildWinnerPairs,
  buildFinalPair,
  STAGE_KICKOFFS,
} from '@/lib/knockout/bracket'
import { NextResponse } from 'next/server'
import type { Match, MatchStage } from '@/lib/supabase/types'

// Match numbers matching what runSync assigns to real knockout fixtures
const MATCH_NUM_BASE: Partial<Record<MatchStage, number>> = {
  round_of_32:   73,
  round_of_16:   89,
  quarter_final: 97,
  semi_final:    101,
  final:         104,
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()

  const { data: rows } = await adminClient
    .from('matches')
    .select('*')
    .is('generated_for_user_id', null)
    .order('match_number', { ascending: true })

  const matches = (rows ?? []) as Match[]
  const emptyPredMap = new Map<string, { home: number; away: number }>()

  const real = (s: MatchStage) =>
    matches.filter(m => m.stage === s).sort((a, b) => (a.match_number ?? 9999) - (b.match_number ?? 9999))

  async function insert(pairs: Array<{ home: string; away: string }>, stage: MatchStage) {
    const kickoffs = STAGE_KICKOFFS[stage] ?? []
    const base = MATCH_NUM_BASE[stage] ?? 200
    let count = 0
    for (let i = 0; i < pairs.length; i++) {
      const { error } = await adminClient.from('matches').insert({
        stage,
        home_team: pairs[i].home,
        away_team: pairs[i].away,
        kickoff_time: kickoffs[i] ?? kickoffs[kickoffs.length - 1] ?? new Date().toISOString(),
        status: 'scheduled' as const,
        match_number: base + i,
        updated_at: new Date().toISOString(),
      })
      if (!error) count++
    }
    return count
  }

  const groupMatches = real('group')

  // R32 — seed from group standings once all group matches are finished
  if (real('round_of_32').length === 0) {
    if (groupMatches.length === 0) {
      return NextResponse.json({ error: 'No group matches found' }, { status: 400 })
    }
    if (!groupMatches.every(m => m.status === 'finished')) {
      return NextResponse.json({ error: 'Score all group matches before seeding R32' }, { status: 400 })
    }
    const standings = computeGroupStandings(groupMatches, emptyPredMap)
    const count = await insert(buildR32Pairs(standings), 'round_of_32')
    return NextResponse.json({ success: true, stage: 'round_of_32', inserted: count })
  }

  // R16 — seed from R32 winners once all R32 are finished
  const r32 = real('round_of_32')
  if (real('round_of_16').length === 0) {
    if (!r32.every(m => m.status === 'finished')) {
      return NextResponse.json({ error: 'Score all R32 matches before seeding R16' }, { status: 400 })
    }
    const count = await insert(buildWinnerPairs(r32, emptyPredMap), 'round_of_16')
    return NextResponse.json({ success: true, stage: 'round_of_16', inserted: count })
  }

  // QF — seed from R16 winners once all R16 are finished
  const r16 = real('round_of_16')
  if (real('quarter_final').length === 0) {
    if (!r16.every(m => m.status === 'finished')) {
      return NextResponse.json({ error: 'Score all R16 matches before seeding QFs' }, { status: 400 })
    }
    const count = await insert(buildWinnerPairs(r16, emptyPredMap), 'quarter_final')
    return NextResponse.json({ success: true, stage: 'quarter_final', inserted: count })
  }

  // SF — seed from QF winners once all QFs are finished
  const qf = real('quarter_final')
  if (real('semi_final').length === 0) {
    if (!qf.every(m => m.status === 'finished')) {
      return NextResponse.json({ error: 'Score all QF matches before seeding SFs' }, { status: 400 })
    }
    const count = await insert(buildWinnerPairs(qf, emptyPredMap), 'semi_final')
    return NextResponse.json({ success: true, stage: 'semi_final', inserted: count })
  }

  // Final — seed from SF winners once both SFs are finished
  const sf = real('semi_final')
  if (real('final').length === 0) {
    if (!sf.every(m => m.status === 'finished')) {
      return NextResponse.json({ error: 'Score both SF matches before seeding the Final' }, { status: 400 })
    }
    const pair = buildFinalPair(sf, emptyPredMap)
    if (!pair) return NextResponse.json({ error: 'Could not determine finalists' }, { status: 500 })
    const count = await insert([pair], 'final')
    return NextResponse.json({ success: true, stage: 'final', inserted: count })
  }

  return NextResponse.json({ success: true, stage: null, inserted: 0, message: 'All rounds already seeded' })
}
