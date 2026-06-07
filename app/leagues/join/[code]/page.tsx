import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export default async function JoinLeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?redirectTo=/leagues/join/${code}`)
  }

  // Use admin client to bypass RLS — the invite code itself is the access token
  const adminSupabase = createAdminClient()
  const { data: league } = await adminSupabase
    .from('leagues')
    .select('*')
    .eq('invite_code', code)
    .single()

  if (!league) notFound()

  // Already a member — go straight to the league
  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
  }

  redirect('/dashboard')
}
