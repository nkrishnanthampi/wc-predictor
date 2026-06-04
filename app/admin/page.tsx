import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SyncFixturesButton } from '@/components/admin/SyncFixturesButton'
import { SyncResultsButton } from '@/components/admin/SyncResultsButton'
import { EffectiveDateForm } from '@/components/admin/EffectiveDateForm'
import { getRawEffectiveDate } from '@/lib/effective-date'
import { Shield, RefreshCw, CheckSquare, Clock, Users } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) redirect('/dashboard')

  const effectiveDateRaw = await getRawEffectiveDate()

  const { count: matchCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })

  const { count: finishedCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'finished')

  const { count: unscoredCount } = await supabase
    .from('predictions')
    .select('*', { count: 'exact', head: true })
    .is('points_awarded', null)

  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-green-700" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Matches', value: matchCount ?? 0 },
          { label: 'Finished', value: finishedCount ?? 0 },
          { label: 'Unscored predictions', value: unscoredCount ?? 0 },
          { label: 'Registered users', value: userCount ?? 0 },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardBody className="py-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {/* Sync fixtures */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Sync Fixtures</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 mb-4">
              Pull all 2026 World Cup fixtures from api-football.com. Safe to run multiple times —
              existing fixtures are upserted. Run this once before the tournament starts.
            </p>
            <SyncFixturesButton />
          </CardBody>
        </Card>

        {/* Sync results */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Sync Results & Score Predictions</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 mb-4">
              Fetch latest results for finished matches and award points to all predictions.
              Run this after each match day (or set up a cron job on Vercel).
            </p>
            <SyncResultsButton />
          </CardBody>
        </Card>

        {/* Effective date */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold text-gray-900">Simulate Effective Date</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 mb-4">
              Override the current date used across the app. Useful for testing how the dashboard
              and match pages look once the tournament is underway. Clear to return to real time.
            </p>
            <EffectiveDateForm currentValue={effectiveDateRaw} />
          </CardBody>
        </Card>

        {/* Matches link */}
        <Card>
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">View / edit matches</p>
              <p className="text-xs text-gray-500">Manually override scores if the API is wrong</p>
            </div>
            <Link href="/admin/matches">
              <Button variant="secondary" size="sm">Manage matches</Button>
            </Link>
          </CardBody>
        </Card>

        {/* Leagues link */}
        <Card>
          <CardBody className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Manage league members</p>
                <p className="text-xs text-gray-500">Add or remove users from any league</p>
              </div>
            </div>
            <Link href="/admin/leagues">
              <Button variant="secondary" size="sm">Manage leagues</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
