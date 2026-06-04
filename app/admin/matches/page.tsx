import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { ManualScoreForm } from '@/components/admin/ManualScoreForm'
import { formatKickoffShort, STAGE_LABELS } from '@/lib/utils'
import type { MatchStage } from '@/lib/supabase/types'

export default async function AdminMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) redirect('/dashboard')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff_time', { ascending: true })

  const withResults = matches?.filter(m => m.status === 'finished') ?? []
  const upcoming    = matches?.filter(m => m.status !== 'finished') ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Matches</h1>

      {/* Upcoming — no result stored yet */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Upcoming ({upcoming.length})
      </h2>
      <div className="space-y-2 mb-8">
        {upcoming.length === 0 && (
          <p className="text-sm text-gray-400">No upcoming matches.</p>
        )}
        {upcoming.map(match => (
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

      {/* Results — finished matches (manual or API) */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Results ({withResults.length})
      </h2>
      <div className="space-y-2">
        {withResults.length === 0 && (
          <p className="text-sm text-gray-400">No results recorded yet.</p>
        )}
        {withResults.map(match => (
          <Card key={match.id} className="bg-gray-50">
            <CardBody className="py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-700">
                      {match.home_team} vs {match.away_team}
                    </p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      match.manual_override
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {match.manual_override ? 'Manual' : 'API'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {STAGE_LABELS[match.stage as MatchStage]} · {formatKickoffShort(match.kickoff_time)}
                  </p>
                </div>
                <span className="text-lg font-bold text-gray-900 shrink-0">
                  {match.home_score} – {match.away_score}
                </span>
                <ManualScoreForm
                  matchId={match.id}
                  existing={{ home: match.home_score!, away: match.away_score! }}
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
