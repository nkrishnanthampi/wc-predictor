'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

export function CreateLeagueForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const supabase = createClient()

    // Create the league
    const { data: league, error: leagueErr } = await supabase
      .from('leagues')
      .insert({ name: name.trim(), created_by: userId })
      .select()
      .single()

    if (leagueErr || !league) {
      setError(leagueErr?.message ?? 'Failed to create league')
      setSaving(false)
      return
    }

    // Auto-join as creator
    await supabase.from('league_members').insert({ league_id: league.id, user_id: userId })

    router.push(`/leagues/${league.id}`)
    router.refresh()
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              League name
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office Sweepstake, Family Cup…"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Creating…' : 'Create league'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
