import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InviteCopyButton } from '@/components/leagues/InviteCopyButton'
import { Plus, Users } from 'lucide-react'
import type { League } from '@/lib/supabase/types'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: membershipsRaw } = await supabase
    .from('league_members')
    .select('*, leagues(*, league_members(count))')
    .eq('user_id', user.id)
  type LeagueWithCount = League & { league_members?: { count: number }[] }
  const memberships = membershipsRaw as unknown as Array<{ leagues: LeagueWithCount | null }> | null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Leagues</h1>
        <Link href="/leagues/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New league
          </Button>
        </Link>
      </div>

      {memberships?.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">You haven&apos;t joined any leagues yet.</p>
            <Link href="/leagues/new">
              <Button>Create your first league</Button>
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="space-y-4">
        {memberships?.map((m) => {
          const league = m.leagues
          return league && (
            <Card key={league.id}>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{league.name}</h2>
                <Link href={`/leagues/${league.id}`}>
                  <Button variant="secondary" size="sm">Leaderboard</Button>
                </Link>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {league.league_members?.[0]?.count ?? '?'} members
                  </span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                    Code: {league.invite_code}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Invite link</p>
                  <InviteCopyButton
                    url={`${appUrl}/leagues/join/${league.invite_code}`}
                  />
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
