import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return null
  return user
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { leagueId, userId } = await req.json()
  if (!leagueId || !userId) {
    return NextResponse.json({ error: 'leagueId and userId are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('league_members').insert({ league_id: leagueId, user_id: userId })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'User is already in this league' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { leagueId, userId } = await req.json()
  if (!leagueId || !userId) {
    return NextResponse.json({ error: 'leagueId and userId are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
