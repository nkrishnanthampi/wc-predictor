import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/scoring/points'
import { NextResponse } from 'next/server'
import type { MatchStage } from '@/lib/supabase/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { matchId, homeScore, awayScore } = await request.json()
  const adminClient = await createAdminClient()

  const { data: match } = await adminClient
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select('id, stage')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Score all predictions
  const { data: predictions } = await adminClient
    .from('predictions')
    .select('id, predicted_home_score, predicted_away_score')
    .eq('match_id', matchId)

  for (const pred of predictions ?? []) {
    const pts = calculatePoints(
      match.stage as MatchStage,
      homeScore,
      awayScore,
      pred.predicted_home_score,
      pred.predicted_away_score
    )
    await adminClient
      .from('predictions')
      .update({ points_awarded: pts })
      .eq('id', pred.id)
  }

  return NextResponse.json({ success: true, predictionsScored: predictions?.length ?? 0 })
}
