'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createLeague(name: string): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single()

  if (leagueErr || !league) {
    return { error: leagueErr?.message ?? 'Failed to create league' }
  }

  await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })

  redirect(`/leagues/${league.id}`)
}
