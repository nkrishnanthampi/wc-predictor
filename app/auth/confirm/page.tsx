import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; code?: string; next?: string }>
}) {
  const { token_hash, type, code, next = '/dashboard' } = await searchParams
  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })
    if (!error) redirect(next)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect(next)
  }

  redirect('/?message=auth-error')
}
