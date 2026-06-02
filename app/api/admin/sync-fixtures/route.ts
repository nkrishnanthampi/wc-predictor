import { createAdminClient } from '@/lib/supabase/server'
import { fetchFixtures, parseStage, parseStatus } from '@/lib/football-api/client'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  // Auth check — admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const fixtures = await fetchFixtures()
    const adminClient = await createAdminClient()
    let upserted = 0

    for (const f of fixtures) {
      const stage = parseStage(f.league.round)
      const status = parseStatus(f.fixture.status.short)

      // Extract group name from round string (e.g. "Group Stage - A")
      const groupMatch = f.league.round.match(/Group Stage - ([A-L])/i)
      const groupName = groupMatch ? groupMatch[1].toUpperCase() : null

      const { error } = await adminClient.from('matches').upsert({
        api_match_id: f.fixture.id,
        stage,
        group_name: groupName,
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        kickoff_time: f.fixture.date,
        home_score: f.goals.home,
        away_score: f.goals.away,
        status,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'api_match_id' })

      if (!error) upserted++
    }

    return NextResponse.json({ success: true, upserted, total: fixtures.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
