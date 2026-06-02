import { createAdminClient } from '@/lib/supabase/server'
import { fetchFixtures, parseStatus } from '@/lib/football-api/client'
import { calculatePoints } from '@/lib/scoring/points'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MatchStage } from '@/lib/supabase/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const adminClient = await createAdminClient()

    // Fetch all finished fixtures from API
    const fixtures = await fetchFixtures()
    const finished = fixtures.filter(f => parseStatus(f.fixture.status.short) === 'finished')

    let matchesUpdated = 0
    let predictionsScored = 0

    for (const f of finished) {
      if (f.goals.home === null || f.goals.away === null) continue

      // Update match result in DB
      const { data: match } = await adminClient
        .from('matches')
        .update({
          home_score: f.goals.home,
          away_score: f.goals.away,
          status: 'finished',
          updated_at: new Date().toISOString(),
        })
        .eq('api_match_id', f.fixture.id)
        .select('id, stage')
        .single()

      if (!match) continue
      matchesUpdated++

      // Score all predictions for this match
      const { data: predictions } = await adminClient
        .from('predictions')
        .select('id, predicted_home_score, predicted_away_score')
        .eq('match_id', match.id)
        .is('points_awarded', null)

      for (const pred of predictions ?? []) {
        const pts = calculatePoints(
          match.stage as MatchStage,
          f.goals.home,
          f.goals.away,
          pred.predicted_home_score,
          pred.predicted_away_score
        )
        await adminClient
          .from('predictions')
          .update({ points_awarded: pts })
          .eq('id', pred.id)
        predictionsScored++
      }
    }

    return NextResponse.json({ success: true, matchesUpdated, predictionsScored })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
