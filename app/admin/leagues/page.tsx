import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { LeagueMembersManager } from '@/components/admin/LeagueMembersManager'
import { Users } from 'lucide-react'

export default async function AdminLeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) redirect('/dashboard')

  const admin = createAdminClient()

  const [{ data: leagues }, { data: members }, { data: profiles }] = await Promise.all([
    admin.from('leagues').select('id, name').order('created_at'),
    admin.from('league_members').select('league_id, user_id, joined_at'),
    admin.from('profiles').select('id, email, display_name').order('display_name'),
  ])

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const leaguesWithMembers = (leagues ?? []).map(league => ({
    id: league.id,
    name: league.name,
    members: (members ?? [])
      .filter(m => m.league_id === league.id)
      .map(m => ({
        ...profileMap.get(m.user_id)!,
        joined_at: m.joined_at,
      }))
      .filter(Boolean),
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <BackButton />
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Manage League Members</h1>
      </div>

      {leaguesWithMembers.length === 0 ? (
        <p className="text-gray-500 text-sm">No leagues exist yet.</p>
      ) : (
        <LeagueMembersManager
          leagues={leaguesWithMembers}
          allUsers={profiles ?? []}
        />
      )}
    </div>
  )
}
