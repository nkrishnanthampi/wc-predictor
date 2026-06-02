import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ManualScoreForm } from '@/components/admin/ManualScoreForm'
import { formatKickoffShort, STAGE_LABELS } from '@/lib/utils'
import type { MatchStage } from '@/lib/supabase/types'

export default async function AdminMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff_time', { ascending: true })

  const finished = matches?.filter(m => m.status === 'finished') ?? []
  const pending  = matches?.filter(m => m.status !== 'finished') ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Matches</h1>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Upcoming / Live
      </h2>
      <div className="space-y-2 mb-8">
        {pending.map(match => (
          <Card key={match.id}>
            <CardBody className="py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {match.home_team ?? 'TBD'} vs {match.away_team ?? 'TBD'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {STAGE_LABELS[match.stage as MatchStage]} · {formatKickoffShort(match.kickoff_time)}
                  </p>
                </div>
                <ManualScoreForm matchId={match.id} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Finished
      </h2>
      <div className="space-y-2">
        {finished.map(match => (
          <Card key={match.id} className="bg-gray-50">
            <CardBody className="py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    {match.home_team} vs {match.away_team}
                  </p>
                  <p className="text-xs text-gray-400">
                    {STAGE_LABELS[match.stage as MatchStage]} · {formatKickoffShort(match.kickoff_time)}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {match.home_score} – {match.away_score}
                </span>
                <ManualScoreForm matchId={match.id} existing={{ home: match.home_score!, away: match.away_score! }} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
