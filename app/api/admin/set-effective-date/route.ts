import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { error: null }
}

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const { date } = await req.json()
  if (!date || isNaN(new Date(date).getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { error: dbError } = await adminClient
    .from('app_config')
    .upsert({ key: 'effective_date', value: new Date(date).toISOString() }, { onConflict: 'key' })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const { error } = await requireAdmin()
  if (error) return error

  const adminClient = await createAdminClient()
  const { error: dbError } = await adminClient
    .from('app_config')
    .delete()
    .eq('key', 'effective_date')

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
