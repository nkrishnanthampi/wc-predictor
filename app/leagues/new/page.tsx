import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateLeagueForm } from '@/components/leagues/CreateLeagueForm'

export default async function NewLeaguePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a League</h1>
      <CreateLeagueForm userId={user.id} />
    </div>
  )
}
