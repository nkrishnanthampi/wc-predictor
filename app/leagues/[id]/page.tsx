import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { TournamentPredictionForm } from '@/components/leagues/TournamentPredictionForm'
import { InviteCopyButton } from '@/components/leagues/InviteCopyButton'
import { Trophy, Medal } from 'lucide-react'
import clsx from 'clsx'

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (!league) notFound()

  // Check membership
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/leagues')

  // Leaderboard
  const { data: leaderboard } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('league_id', id)
    .order('total_points', { ascending: false })

  // My tournament prediction
  const { data: myTournamentPick } = await supabase
    .from('tournament_predictions')
    .select('*')
    .eq('user_id', user.id)
    .eq('league_id', id)
    .maybeSingle()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{league.name}</h1>
      <p className="text-sm text-gray-400 mb-6">Invite code: {league.invite_code}</p>

      {/* Leaderboard */}
      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h2 className="font-semibold text-gray-900">Leaderboard</h2>
        </CardHeader>
        <CardBody className="p-0">
          {leaderboard?.map((row, idx) => (
            <div
              key={row.user_id}
              className={clsx(
                'flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0',
                row.user_id === user.id && 'bg-green-50'
              )}
            >
              <span className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                idx === 0 && 'bg-yellow-100 text-yellow-700',
                idx === 1 && 'bg-gray-100 text-gray-600',
                idx === 2 && 'bg-orange-100 text-orange-700',
                idx > 2 && 'text-gray-400'
              )}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {row.display_name}
                  {row.user_id === user.id && (
                    <span className="ml-1 text-xs text-green-600">(you)</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {row.predictions_scored}/{row.total_predictions} scored
                </p>
              </div>
              <span className="text-lg font-bold text-gray-900 shrink-0">
                {row.total_points} pts
              </span>
            </div>
          ))}
          {!leaderboard?.length && (
            <p className="px-5 py-4 text-sm text-gray-500">
              No predictions scored yet. Check back after matches start!
            </p>
          )}
        </CardBody>
      </Card>

      {/* Tournament winner prediction */}
      <TournamentPredictionForm
        leagueId={id}
        userId={user.id}
        existing={myTournamentPick ?? undefined}
      />

      {/* Invite link */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Invite players</h2>
        </CardHeader>
        <CardBody>
          <InviteCopyButton url={`${appUrl}/leagues/join/${league.invite_code}`} />
        </CardBody>
      </Card>
    </div>
  )
}
