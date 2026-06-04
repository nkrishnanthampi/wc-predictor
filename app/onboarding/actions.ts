'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function setDisplayName(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Use admin client to upsert — handles both the case where the profile row
  // was not yet created by the trigger, and bypasses any RLS update restrictions.
  const admin = createAdminClient()
  await admin
    .from('profiles')
    .upsert({ id: user.id, email: user.email ?? '', display_name: name, is_admin: false })

  redirect('/dashboard')
}
