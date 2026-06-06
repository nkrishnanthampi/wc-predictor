import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/scoring/points'
import { NextResponse } from 'next/server'
import type { MatchStage } from '@/lib/supabase/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = await createAdminClient()

  const { data: finishedMatches } = await adminClient
    .from('matches')
    .select('id, stage, home_score, away_score')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  let predictionsScored = 0

  for (const match of finishedMatches ?? []) {
    const { data: predictions } = await adminClient
      .from('predictions')
      .select('id, predicted_home_score, predicted_away_score')
      .eq('match_id', match.id)
      .is('points_awarded', null)

    for (const pred of predictions ?? []) {
      const pts = calculatePoints(
        match.stage as MatchStage,
        match.home_score!,
        match.away_score!,
        pred.predicted_home_score,
        pred.predicted_away_score,
      )
      await adminClient.from('predictions').update({ points_awarded: pts }).eq('id', pred.id)
      predictionsScored++
    }
  }

  return NextResponse.json({ success: true, predictionsScored })
}
