import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { JoinLeagueButton } from '@/components/leagues/JoinLeagueButton'
import { Card, CardBody } from '@/components/ui/Card'
import { Users } from 'lucide-react'

export default async function JoinLeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?redirectTo=/leagues/join/${code}`)
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', code)
    .single()

  if (!league) notFound()

  // Already a member?
  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect(`/leagues/${league.id}`)
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <Card>
        <CardBody className="text-center py-8">
          <Users className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re invited!</h1>
          <p className="text-gray-600 text-sm mb-6">
            Join <strong>{league.name}</strong> and start predicting match results.
          </p>
          <JoinLeagueButton leagueId={league.id} userId={user.id} />
        </CardBody>
      </Card>
    </div>
  )
}
